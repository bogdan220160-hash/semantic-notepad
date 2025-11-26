from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..models import Campaign, UserList, MessageTemplate, Account, ABTest
from ..database import get_db
from ..events.producer import producer
import json

router = APIRouter(
    tags=["campaign"]
)

class RotationStep(BaseModel):
    template_id: int
    count: int

class CampaignStartRequest(BaseModel):
    name: str
    list_id: int
    template_id: Optional[int] = None
    ab_test_id: Optional[int] = None
    rotation_steps: Optional[List[RotationStep]] = None
    account_ids: List[int]
    delay: float = 1.0
    scheduled_for: Optional[datetime] = None

@router.post("/start")
async def start_campaign(request: CampaignStartRequest, db: AsyncSession = Depends(get_db)):
    """Start a new campaign."""
    # 1. Verify resources exist
    list_res = await db.execute(select(UserList).where(UserList.id == request.list_id))
    user_list = list_res.scalars().first()
    if not user_list:
        raise HTTPException(status_code=404, detail="User list not found")

    # Verify Template OR A/B Test OR Rotation
    ab_test_variants = []
    rotation_sequence = [] # List of template_ids expanded by count
    
    if request.rotation_steps:
        # Verify all templates in rotation exist
        template_ids = [step.template_id for step in request.rotation_steps]
        templates_res = await db.execute(select(MessageTemplate).where(MessageTemplate.id.in_(template_ids)))
        found_templates = templates_res.scalars().all()
        if len(found_templates) != len(set(template_ids)):
             raise HTTPException(status_code=404, detail="One or more templates in rotation not found")
        
        # Build rotation sequence for easy iteration
        # e.g. A(2), B(1) -> [A, A, B]
        for step in request.rotation_steps:
            rotation_sequence.extend([step.template_id] * step.count)
            
        if not rotation_sequence:
             raise HTTPException(status_code=400, detail="Rotation steps cannot be empty")

    elif request.ab_test_id:
        ab_test_res = await db.execute(select(ABTest).where(ABTest.id == request.ab_test_id))
        ab_test = ab_test_res.scalars().first()
        if not ab_test:
            raise HTTPException(status_code=404, detail="A/B Test not found")
        ab_test_variants = ab_test.variants # List of {"template_id": X, "weight": Y}
    elif request.template_id:
        template_res = await db.execute(select(MessageTemplate).where(MessageTemplate.id == request.template_id))
        template = template_res.scalars().first()
        if not template:
            raise HTTPException(status_code=404, detail="Message template not found")
    else:
        raise HTTPException(status_code=400, detail="Must provide template_id, ab_test_id, or rotation_steps")

    # Verify accounts
    accounts_res = await db.execute(select(Account).where(Account.id.in_(request.account_ids)))
    accounts = accounts_res.scalars().all()
    if len(accounts) != len(request.account_ids):
        raise HTTPException(status_code=404, detail="One or more accounts not found")

    # 2. Create Campaign record
    status = "running"
    if request.scheduled_for:
        status = "scheduled"

    config = {
        "list_id": request.list_id,
        "template_id": request.template_id,
        "ab_test_id": request.ab_test_id,
        "rotation_steps": [step.dict() for step in request.rotation_steps] if request.rotation_steps else None,
        "account_ids": request.account_ids,
        "delay": request.delay
    }
    
    new_campaign = Campaign(
        name=request.name,
        status=status,
        config=config,
        scheduled_for=request.scheduled_for.replace(tzinfo=None) if request.scheduled_for else None
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)

    # 3. Publish tasks to Redis (ONLY IF NOT SCHEDULED)
    if status == "running":
        users = user_list.users
        if not isinstance(users, list):
            users = []

        import random
        
        rotation_index = 0
        
        for i, user in enumerate(users):
            # Determine template for this user
            selected_template_id = None
            
            if request.rotation_steps:
                # Rotation logic
                selected_template_id = rotation_sequence[rotation_index % len(rotation_sequence)]
                rotation_index += 1
            elif request.ab_test_id and ab_test_variants:
                # Simple weighted random selection
                # variants: [{"template_id": 1, "weight": 50}, ...]
                total_weight = sum(v.get("weight", 0) for v in ab_test_variants)
                r = random.uniform(0, total_weight)
                upto = 0
                for v in ab_test_variants:
                    if upto + v.get("weight", 0) >= r:
                        selected_template_id = v.get("template_id")
                        break
                    upto += v.get("weight", 0)
            else:
                selected_template_id = request.template_id
            
            task_data = {
                "campaign_id": new_campaign.id,
                "recipient": user.get("phone") or user.get("username"),
                "template_id": selected_template_id,
                "account_ids": request.account_ids,
                "delay": request.delay,
                "variables": user,
                "ab_test_id": request.ab_test_id # Pass this to track results later
            }
            
            if task_data["recipient"]:
                 await producer.publish("send_message", task_data)

    return {"status": status, "campaign_id": new_campaign.id}

@router.post("/stop/{campaign_id}")
async def stop_campaign(campaign_id: int, db: AsyncSession = Depends(get_db)):
    """Stop a campaign."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "stopped"
    await db.commit()
    return {"status": "stopped", "campaign_id": campaign_id}

@router.get("/status/{campaign_id}")
async def campaign_status(campaign_id: int, db: AsyncSession = Depends(get_db)):
    """Get current status of a campaign."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"campaign_id": campaign.id, "status": campaign.status, "name": campaign.name}

@router.get("/")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """List all campaigns."""
    result = await db.execute(select(Campaign))
    campaigns = result.scalars().all()
    return campaigns

@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a campaign."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Delete associated logs first
    from sqlalchemy import delete
    from ..models import SendLog
    await db.execute(delete(SendLog).where(SendLog.campaign_id == campaign_id))
    
    await db.delete(campaign)
    await db.commit()
    return {"status": "deleted", "campaign_id": campaign_id}
