from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from ..models import DripCampaign, DripStep, DripProgress, UserList, MessageTemplate
from ..database import get_db

router = APIRouter(
    prefix="/drip",
    tags=["Drip Campaigns"]
)

class DripStepCreate(BaseModel):
    template_id: int
    delay_minutes: int
    step_order: int

class DripCampaignCreate(BaseModel):
    name: str
    list_id: int
    account_id: int
    steps: List[DripStepCreate]

class DripCampaignResponse(BaseModel):
    id: int
    name: str
    list_id: int
    account_id: int
    status: str
    created_at: datetime
    steps: List[DripStepCreate]

    class Config:
        orm_mode = True

@router.post("/", response_model=DripCampaignResponse)
async def create_drip_campaign(campaign: DripCampaignCreate, db: AsyncSession = Depends(get_db)):
    # Verify list exists
    list_res = await db.execute(select(UserList).where(UserList.id == campaign.list_id))
    if not list_res.scalars().first():
        raise HTTPException(status_code=404, detail="User List not found")

    new_campaign = DripCampaign(
        name=campaign.name,
        list_id=campaign.list_id,
        account_id=campaign.account_id,
        status="draft"
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)

    for step in campaign.steps:
        new_step = DripStep(
            drip_campaign_id=new_campaign.id,
            template_id=step.template_id,
            delay_minutes=step.delay_minutes,
            step_order=step.step_order
        )
        db.add(new_step)
    
    await db.commit()
    
    # Reload with steps
    result = await db.execute(
        select(DripCampaign)
        .options(selectinload(DripCampaign.steps))
        .where(DripCampaign.id == new_campaign.id)
    )
    return result.scalars().first()

@router.get("/", response_model=List[DripCampaignResponse])
async def list_drip_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DripCampaign).options(selectinload(DripCampaign.steps))
    )
    return result.scalars().all()

@router.post("/{id}/start")
async def start_drip_campaign(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DripCampaign).where(DripCampaign.id == id)
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "active":
        return {"status": "already_active"}

    # Fetch users from list
    list_res = await db.execute(select(UserList).where(UserList.id == campaign.list_id))
    user_list = list_res.scalars().first()
    users = user_list.users if user_list else []
    
    if not isinstance(users, list):
        users = []

    # Enroll users
    count = 0
    for user in users:
        # Check if already enrolled
        # (Simplification: just add if not exists, or ignore duplicates)
        # For now, we just add. In prod, check for duplicates.
        
        # Calculate first execution time
        # If first step has delay 0, it runs now. If delay > 0, runs after delay.
        # But wait, step delay is usually "after previous step".
        # So for step 1, delay is "after enrollment".
        
        # We need to know the first step's delay to set next_execution_time?
        # Or we just set it to NOW, and let the processor handle the delay logic?
        # Let's set it to NOW. The processor will check the step delay.
        # Actually, if step 1 has delay 60 mins, we should schedule it for NOW + 60 mins.
        
        # Let's fetch steps to find the first one
        steps_res = await db.execute(select(DripStep).where(DripStep.drip_campaign_id == id).order_by(DripStep.step_order))
        steps = steps_res.scalars().all()
        
        if not steps:
            raise HTTPException(status_code=400, detail="No steps in campaign")
            
        first_step = steps[0]
        start_time = datetime.utcnow() + timedelta(minutes=first_step.delay_minutes)
        
        progress = DripProgress(
            drip_campaign_id=id,
            user_data=user,
            current_step_order=first_step.step_order,
            next_execution_time=start_time,
            status="pending"
        )
        db.add(progress)
        count += 1
    
    campaign.status = "active"
    await db.commit()
    
    return {"status": "started", "enrolled_users": count}

@router.post("/{id}/pause")
async def pause_drip_campaign(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DripCampaign).where(DripCampaign.id == id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "paused"
    await db.commit()
    return {"status": "paused"}

@router.get("/{id}/stats")
async def get_drip_stats(id: int, db: AsyncSession = Depends(get_db)):
    # Count pending, completed, failed
    # This requires grouping by status in DripProgress
    from sqlalchemy import func
    result = await db.execute(
        select(DripProgress.status, func.count(DripProgress.id))
        .where(DripProgress.drip_campaign_id == id)
        .group_by(DripProgress.status)
    )
    stats = {row[0]: row[1] for row in result.all()}
    return stats
