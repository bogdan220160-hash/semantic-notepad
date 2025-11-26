from fastapi import APIRouter, HTTPException
import redis.asyncio as redis
import json
import os
from pydantic import BaseModel

router = APIRouter(
    tags=["delay"]
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DELAY_SETTINGS_KEY = "delay_settings"

class DelaySettings(BaseModel):
    type: str = "fixed"  # "fixed" or "random"
    value: float = 1.0   # Used for fixed
    min_delay: float = 1.0 # Used for random
    max_delay: float = 5.0 # Used for random

@router.get("/")
async def get_delay_settings():
    """Return current delay configuration."""
    r = redis.from_url(REDIS_URL)
    data = await r.get(DELAY_SETTINGS_KEY)
    await r.close()
    
    if data:
        return json.loads(data)
    return DelaySettings().dict()

@router.post("/")
async def set_delay_settings(settings: DelaySettings):
    """Update delay configuration."""
    r = redis.from_url(REDIS_URL)
    await r.set(DELAY_SETTINGS_KEY, json.dumps(settings.dict()))
    await r.close()
    return {"status": "updated", "settings": settings}
