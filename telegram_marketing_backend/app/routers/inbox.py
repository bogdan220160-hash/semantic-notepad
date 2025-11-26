from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.custom import Dialog
from ..models import Account
from ..database import get_db
import logging

router = APIRouter(
    prefix="/inbox",
    tags=["Inbox"]
)

logger = logging.getLogger(__name__)

class InboxMessage(BaseModel):
    id: int
    sender_id: int
    text: str
    date: str
    is_outgoing: bool

class InboxDialog(BaseModel):
    id: int
    name: str
    unread_count: int
    last_message: Optional[str]

class ReplyRequest(BaseModel):
    account_id: int
    peer_id: int
    message: str

async def get_client(account_id: int, db: AsyncSession):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account or not account.session_string:
        raise HTTPException(status_code=404, detail="Account not found or not logged in")
    
    client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        await client.disconnect()
        raise HTTPException(status_code=401, detail="Session expired")
    
    return client

@router.get("/{account_id}/dialogs", response_model=List[InboxDialog])
async def get_dialogs(account_id: int, limit: int = 20, db: AsyncSession = Depends(get_db)):
    client = await get_client(account_id, db)
    try:
        dialogs = await client.get_dialogs(limit=limit)
        result = []
        for d in dialogs:
            result.append({
                "id": d.id,
                "name": d.name,
                "unread_count": d.unread_count,
                "last_message": d.message.message if d.message else ""
            })
        return result
    finally:
        await client.disconnect()

@router.get("/{account_id}/messages/{peer_id}", response_model=List[InboxMessage])
async def get_messages(account_id: int, peer_id: int, limit: int = 50, db: AsyncSession = Depends(get_db)):
    client = await get_client(account_id, db)
    try:
        entity = await client.get_entity(peer_id)
        messages = await client.get_messages(entity, limit=limit)
        result = []
        for m in messages:
            if m.message: # Only text messages for now
                result.append({
                    "id": m.id,
                    "sender_id": m.sender_id,
                    "text": m.message,
                    "date": m.date.isoformat(),
                    "is_outgoing": m.out
                })
        return result
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.disconnect()

@router.post("/reply")
async def send_reply(request: ReplyRequest, db: AsyncSession = Depends(get_db)):
    client = await get_client(request.account_id, db)
    try:
        entity = await client.get_entity(request.peer_id)
        await client.send_message(entity, request.message)
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"Error sending reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.disconnect()
