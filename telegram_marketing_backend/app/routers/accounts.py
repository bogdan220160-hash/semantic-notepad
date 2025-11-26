from fastapi import APIRouter, HTTPException, Depends
from telethon.errors import PhoneCodeInvalidError, PhoneCodeExpiredError, SessionPasswordNeededError
from pydantic import BaseModel
from telethon import TelegramClient
from telethon.sessions import StringSession
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import random
import string
from datetime import datetime

from ..models import Account, WarmupLog
from ..database import get_db

router = APIRouter()

# Temporary storage for auth states (phone_code_hash)
# In production, use Redis with TTL
auth_states = {}

class RequestCodeRequest(BaseModel):
    api_id: str
    api_hash: str
    phone: str

class SignInRequest(BaseModel):
    phone: str
    code: str
    phone_code_hash: str
    password: str = None
    api_id: str
    api_hash: str
    session_string: str = None
    proxy_url: str = None

class WarmupToggleRequest(BaseModel):
    enabled: bool

class AccountResponse(BaseModel):
    id: int
    phone_number: str
    api_id: str
    is_active: bool
    created_at: datetime
    session_string: Optional[str]
    proxy_url: Optional[str]
    warmup_enabled: bool = False
    warmup_last_run: Optional[datetime] = None
    health_status: str = "unknown"
    last_health_check: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# ... (existing code) ...

# Endpoint to request login code
@router.post("/request-code")
async def request_code(request: RequestCodeRequest, db: AsyncSession = Depends(get_db)):
    """Initiate Telegram login flow and send code to phone.
    Returns phone_code_hash and temporary session string for later sign-in.
    """
    # Create a temporary client with a new StringSession
    client = TelegramClient(StringSession(), int(request.api_id), request.api_hash)
    try:
        await client.connect()
        # Send code request
        result = await client.send_code_request(request.phone)
        # Store phone_code_hash in temporary storage
        auth_states[request.phone] = result.phone_code_hash
        # Save session string (empty at this point)
        session_str = client.session.save()
        return {"phone_code_hash": result.phone_code_hash, "session_string": session_str}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.disconnect()

# Endpoint to complete sign-in with code (and optional password)
@router.post("/sign-in")
async def sign_in(request: SignInRequest, db: AsyncSession = Depends(get_db)):
    """Complete Telegram sign-in using the code (and password if needed).
    Creates or updates an Account record in the database.
    """
    # Retrieve stored phone_code_hash if not provided explicitly
    phone_code_hash = request.phone_code_hash or auth_states.get(request.phone)
    if not phone_code_hash:
        raise HTTPException(status_code=400, detail="Missing phone_code_hash for sign-in")
    # Use existing session string if provided, else create new
    session = StringSession(request.session_string) if request.session_string else StringSession()
    client = TelegramClient(session, int(request.api_id), request.api_hash)
    try:
        await client.connect()
        # Attempt sign in
        try:
            await client.sign_in(phone=request.phone, code=request.code, password=request.password, phone_code_hash=phone_code_hash)
        except SessionPasswordNeededError:
            # Password required but not provided
            raise HTTPException(status_code=400, detail="Password required for this account")
        # Save session string after successful sign-in
        session_str = client.session.save()
        # Upsert account in DB
        result = await db.execute(select(Account).where(Account.phone_number == request.phone))
        account = result.scalars().first()
        if account:
            # Update existing account
            account.api_id = request.api_id
            account.api_hash = request.api_hash
            account.session_string = session_str
            account.proxy_url = request.proxy_url
        else:
            # Create new account
            new_account = Account(
                phone_number=request.phone,
                api_id=request.api_id,
                api_hash=request.api_hash,
                session_string=session_str,
                proxy_url=request.proxy_url,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(new_account)
        await db.commit()
        return {"detail": "Account signed in successfully", "session_string": session_str}
    except PhoneCodeInvalidError:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    except PhoneCodeExpiredError:
        raise HTTPException(status_code=400, detail="Verification code expired")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.disconnect()



@router.get("/", response_model=List[AccountResponse])
async def get_accounts(db: AsyncSession = Depends(get_db)):
    """List all accounts."""
    result = await db.execute(select(Account))
    accounts = result.scalars().all()
    return accounts

@router.delete("/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an account."""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
    return {"detail": "Account deleted"}

@router.post("/{account_id}/check-health")
async def check_health(account_id: int, db: AsyncSession = Depends(get_db)):
    """Check account health status (Spam Block, Flood Wait, Ban)."""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    from telethon.tl.functions.updates import GetStateRequest
    from telethon.errors import FloodWaitError, UserDeactivatedError, UserRestrictedError
    
    status = "unknown"
    try:
        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        
        if not await client.is_user_authorized():
            status = "banned" # Or unauthorized
        else:
            try:
                # GetStateRequest is a lightweight call to check if user is active
                await client(GetStateRequest())
                status = "alive"
                
                # Optional: Check for restrictions (Spam Block)
                # This is harder to check definitively without trying to send a message,
                # but we can check if the user is restricted.
                me = await client.get_me()
                if me.restricted:
                    status = "restricted"
                    
            except FloodWaitError:
                status = "flood_wait"
            except UserDeactivatedError:
                status = "banned"
            except UserRestrictedError:
                status = "restricted"
            except Exception as e:
                print(f"Health check error for {account.phone_number}: {e}")
                status = "error"
                
        await client.disconnect()
        
    except Exception as e:
        print(f"Connection error during health check: {e}")
        status = "connection_error"

    # Update DB
    account.health_status = status
    account.last_health_check = datetime.utcnow()
    await db.commit()
    
    return {"status": status, "last_check": account.last_health_check}

@router.post("/{account_id}/check-proxy")
async def check_proxy(account_id: int, db: AsyncSession = Depends(get_db)):
    """Check if the proxy for the account is working and measure latency."""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if not account.proxy_url:
        return {"status": "no_proxy", "latency_ms": 0}

    proxy = parse_proxy(account.proxy_url)
    if not proxy:
        return {"status": "invalid_proxy_format", "latency_ms": 0}

    import time
    start_time = time.time()
    
    try:
        # Use a temporary client to test connection
        # We don't strictly need the session string if we just want to test connection, 
        # but using it ensures we test the exact setup.
        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash, proxy=proxy)
        
        # Set a timeout for connection
        await client.connect()
        
        # If we reached here, connection via proxy was successful
        latency = (time.time() - start_time) * 1000
        await client.disconnect()
        
        return {"status": "success", "latency_ms": int(latency)}
    except Exception as e:
        return {"status": "error", "error": str(e), "latency_ms": 0}

@router.post("/{account_id}/warmup")
async def toggle_warmup(account_id: int, request: WarmupToggleRequest, db: AsyncSession = Depends(get_db)):
    """Toggle warm-up status for an account."""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.warmup_enabled = request.enabled
    if not request.enabled:
        account.warmup_last_run = None
    
    await db.commit()
    return {"detail": f"Warm-up {'enabled' if request.enabled else 'disabled'}", "warmup_enabled": account.warmup_enabled}

@router.get("/{account_id}/warmup-logs")
async def get_warmup_logs(account_id: int, db: AsyncSession = Depends(get_db)):
    """Get warmup logs for an account."""
    # Verify account exists
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get logs for this account, ordered by timestamp descending
    logs_result = await db.execute(
        select(WarmupLog)
        .where(WarmupLog.account_id == account_id)
        .order_by(WarmupLog.timestamp.desc())
        .limit(100)
    )
    logs = logs_result.scalars().all()
    
    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in logs
    ]
