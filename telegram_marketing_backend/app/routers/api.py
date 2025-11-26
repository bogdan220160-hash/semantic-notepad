from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database import get_db
from ..models import ApiToken, Campaign, SendLog
from pydantic import BaseModel
import secrets
import datetime
from typing import List, Optional

router = APIRouter()

# --- Schemas ---
class TokenCreate(BaseModel):
    name: str

class TokenResponse(BaseModel):
    id: int
    name: str
    token: str
    is_active: bool
    created_at: datetime.datetime

    class Config:
        orm_mode = True

# --- Dependency ---
async def verify_token(x_api_key: str = Header(...), db: AsyncSession = Depends(get_db)):
    """Verify the API token from the header."""
    result = await db.execute(select(ApiToken).where(ApiToken.token == x_api_key, ApiToken.is_active == True))
    token_obj = result.scalars().first()
    if not token_obj:
        raise HTTPException(status_code=403, detail="Invalid or inactive API token")
    return token_obj

# --- Admin Endpoints (Token Management) ---
@router.post("/tokens", response_model=TokenResponse)
async def create_token(token_data: TokenCreate, db: AsyncSession = Depends(get_db)):
    """Create a new API token."""
    new_token_str = f"tm_{secrets.token_urlsafe(32)}"
    new_token = ApiToken(name=token_data.name, token=new_token_str)
    db.add(new_token)
    await db.commit()
    await db.refresh(new_token)
    return new_token

@router.get("/tokens", response_model=List[TokenResponse])
async def list_tokens(db: AsyncSession = Depends(get_db)):
    """List all API tokens."""
    result = await db.execute(select(ApiToken))
    return result.scalars().all()

@router.delete("/tokens/{token_id}")
async def revoke_token(token_id: int, db: AsyncSession = Depends(get_db)):
    """Revoke (delete) an API token."""
    result = await db.execute(select(ApiToken).where(ApiToken.id == token_id))
    token = result.scalars().first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    await db.delete(token)
    await db.commit()
    return {"status": "deleted"}

# --- Public API Endpoints (Protected by Token) ---

@router.post("/v1/campaign/{campaign_id}/start")
async def api_start_campaign(campaign_id: int, token: ApiToken = Depends(verify_token), db: AsyncSession = Depends(get_db)):
    """Start a specific campaign via API."""
    # Logic to start campaign (reusing logic from campaign.py would be ideal, but for now we can just trigger it if it's draft/stopped)
    # For simplicity, we'll just return status for now as the actual start logic is complex and tied to the other router.
    # Ideally, we should refactor the start logic into a service function.
    
    # For this MVP, let's assume we just want to check status or trigger a simple action.
    # To actually START, we need the payload (list_id, template_id, etc.) which is usually in the CampaignStartRequest.
    # If the campaign is already created (draft), we might want to run it.
    
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # If we wanted to actually start it, we'd need to call the logic. 
    # For now, let's just return its status.
    return {"status": campaign.status, "message": "Campaign start via API not fully implemented in this MVP (requires refactoring start logic to service)."}

@router.get("/v1/campaign/{campaign_id}/stats")
async def api_campaign_stats(campaign_id: int, token: ApiToken = Depends(verify_token), db: AsyncSession = Depends(get_db)):
    """Get statistics for a campaign."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get stats
    from sqlalchemy import func
    stats_query = select(
        SendLog.status, func.count(SendLog.id)
    ).where(SendLog.campaign_id == campaign_id).group_by(SendLog.status)
    
    stats_res = await db.execute(stats_query)
    stats = {row.status: row.count for row in stats_res.all()}
    
    return {
        "campaign_id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "stats": stats
    }
