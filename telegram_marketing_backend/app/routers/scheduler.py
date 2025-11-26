from fastapi import APIRouter, HTTPException

router = APIRouter()

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import Depends
from ..database import get_db
from ..models import Campaign

@router.get("/")
async def list_schedules(db: AsyncSession = Depends(get_db)):
    """Return a list of scheduled campaigns."""
    result = await db.execute(
        select(Campaign).where(Campaign.status == "scheduled").order_by(Campaign.scheduled_for)
    )
    return result.scalars().all()

@router.post("/")
async def create_schedule(schedule_data: dict):
    """Schedule a campaign.
    Expected keys: campaign_id, start_time, recurrence_rule (optional).
    """
    return {"status": "scheduled", "schedule": schedule_data}

@router.delete("/{campaign_id}")
async def delete_schedule(campaign_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel a scheduled campaign (set status to stopped)."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != "scheduled":
        raise HTTPException(status_code=400, detail="Campaign is not scheduled")

    campaign.status = "stopped"
    await db.commit()
    return {"status": "cancelled", "campaign_id": campaign_id}
