from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import time
from ..database import get_db
from ..models import Account
from ..services.scraper import scrape_group_members
from telethon import TelegramClient
from telethon.sessions import StringSession
import logging

router = APIRouter(
    tags=["scraper"]
)

class ScrapeRequest(BaseModel):
    account_id: int
    group_link: str
    limit: int = 100
    only_usernames: bool = False
    active_only: bool = False

@router.post("/scrape")
async def scrape_group(request: ScrapeRequest, db: AsyncSession = Depends(get_db)):
    print(f"DEBUG: Received scrape request for account {request.account_id}, link {request.group_link}", flush=True)
    # Get account to use for scraping
    result = await db.execute(select(Account).where(Account.id == request.account_id))
    account = result.scalars().first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    if not account.session_string:
        raise HTTPException(status_code=400, detail="Account not logged in")
        
    try:
        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        
        if not await client.is_user_authorized():
            raise HTTPException(status_code=401, detail="Session expired")
            
        start_time = time.time()
        members = await scrape_group_members(client, request.group_link, request.limit, request.only_usernames, request.active_only)
        end_time = time.time()
        duration = end_time - start_time
        
        await client.disconnect()
        return {"count": len(members), "members": members, "duration": duration}
        
    except ValueError as e:
        logging.error(f"Scrape failed (Value Error): {e}")
        raise HTTPException(status_code=404, detail="Group not found. Please check the link and ensure it is public.")
    except Exception as e:
        logging.error(f"Scrape failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dialogs/{account_id}")
async def get_dialogs(account_id: int, db: AsyncSession = Depends(get_db)):
    """Get list of groups and channels for the account."""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    if not account.session_string:
        raise HTTPException(status_code=400, detail="Account not logged in")
        
    try:
        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        
        if not await client.is_user_authorized():
            await client.disconnect()
            raise HTTPException(status_code=401, detail="Session expired")
            
        dialogs = []
        async for dialog in client.iter_dialogs():
            if dialog.is_group or dialog.is_channel:
                dialogs.append({
                    "id": str(dialog.id), # Return as string to avoid JS precision issues
                    "title": dialog.title,
                    "type": "channel" if dialog.is_channel else "group"
                })
                
        await client.disconnect()
        return dialogs
        
    except Exception as e:
        logging.error(f"Failed to get dialogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
