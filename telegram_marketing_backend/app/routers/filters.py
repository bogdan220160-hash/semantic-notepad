from fastapi import APIRouter, HTTPException
import redis.asyncio as redis
import json
import os
from pydantic import BaseModel

router = APIRouter(
    tags=["filters"]
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
FILTERS_KEY = "filter_settings"

class FilterSettings(BaseModel):
    skip_no_photo: bool = False
    skip_bots: bool = True

@router.get("/")
async def get_filters():
    """Return current filter configuration."""
    r = redis.from_url(REDIS_URL)
    data = await r.get(FILTERS_KEY)
    await r.close()
    
    if data:
        return json.loads(data)
    return FilterSettings().dict()

@router.post("/")
async def update_filters(settings: FilterSettings):
    """Update filter configuration."""
    r = redis.from_url(REDIS_URL)
    await r.set(FILTERS_KEY, json.dumps(settings.dict()))
    await r.close()
    return {"status": "updated", "filters": settings}
