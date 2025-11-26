import asyncio
import random
import logging
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.messages import ReadHistoryRequest, SendReactionRequest
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.functions.account import UpdateStatusRequest
from telethon.tl.types import ReactionEmoji
from ..models import Account, WarmupLog
from ..database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# List of safe public channels to "warm up" with
SAFE_CHANNELS = [
    "telegram", "durov", "contest", "stickers", "designers", "telegramtips", "news",
    "bloomberg", "wsj", "nytimes", "techcrunch", "wired", "theverge", "nasa"
]

async def perform_warmup_action(account: Account):
    """
    Perform a random 'human-like' action:
    1. Read messages in a random dialog.
    2. Join a public channel (rarely).
    3. Scroll/Wait.
    """
    try:
        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        
        if not await client.is_user_authorized():
            logger.warning(f"Account {account.phone_number} session expired/invalid.")
            return

        action = random.choice(['read', 'read', 'react', 'react', 'online', 'join'])
        log_entry = None
        
        if action == 'read':
            # Get dialogs and pick one
            dialogs = await client.get_dialogs(limit=10)
            if dialogs:
                dialog = random.choice(dialogs)
                await client(ReadHistoryRequest(peer=dialog.entity, max_id=dialog.message.id))
                logger.info(f"Warmup: Account {account.phone_number} read history in {dialog.name}")
                
                log_entry = WarmupLog(
                    account_id=account.id,
                    action="read",
                    details=f"Read history in {dialog.name}"
                )
            else:
                # Fallback if no dialogs: Join a channel
                logger.info(f"Warmup: Account {account.phone_number} has no dialogs to read. Switching to 'join'.")
                action = 'join' # Proceed to join logic below (requires restructuring or recursive call, but simple fallback is better here)
                # Let's just do the join logic here to avoid complexity
                channel = random.choice(SAFE_CHANNELS)
                try:
                    await client(JoinChannelRequest(channel))
                    logger.info(f"Warmup (Fallback): Account {account.phone_number} joined {channel}")
                    log_entry = WarmupLog(
                        account_id=account.id,
                        action="join",
                        details=f"Joined {channel} (Fallback for read)"
                    )
                except Exception as e:
                    logger.warning(f"Warmup join fallback failed: {e}")
                    log_entry = WarmupLog(
                        account_id=account.id,
                        action="error",
                        details=f"Failed to join {channel} (Fallback): {str(e)}"
                    )
        
        elif action == 'join':
            # Join a random safe channel
            channel = random.choice(SAFE_CHANNELS)
            try:
                await client(JoinChannelRequest(channel))
                logger.info(f"Warmup: Account {account.phone_number} joined {channel}")
                
                log_entry = WarmupLog(
                    account_id=account.id,
                    action="join",
                    details=f"Joined {channel}"
                )
            except Exception as e:
                logger.warning(f"Warmup join failed: {e}")
                log_entry = WarmupLog(
                    account_id=account.id,
                    action="error",
                    details=f"Failed to join {channel}: {str(e)}"
                )

        elif action == 'react':
            # React to a random message in a random dialog
            dialogs = await client.get_dialogs(limit=10)
            if dialogs:
                dialog = random.choice(dialogs)
                # Get last few messages
                messages = await client.get_messages(dialog.entity, limit=5)
                if messages:
                    msg = random.choice(messages)
                    emoji = random.choice(['👍', '❤️', '🔥', '👏', '🎉'])
                    try:
                        await client(SendReactionRequest(
                            peer=dialog.entity,
                            msg_id=msg.id,
                            reaction=[ReactionEmoji(emoticon=emoji)]
                        ))
                        logger.info(f"Warmup: Account {account.phone_number} reacted {emoji} in {dialog.name}")
                        log_entry = WarmupLog(
                            account_id=account.id,
                            action="react",
                            details=f"Reacted {emoji} in {dialog.name}"
                        )
                    except Exception as e:
                        logger.warning(f"Warmup react failed: {e}")
                else:
                     logger.info(f"Warmup: No messages found in {dialog.name} to react.")
            else:
                # Fallback if no dialogs: Set online
                logger.info(f"Warmup: Account {account.phone_number} has no dialogs to react. Switching to 'online'.")
                try:
                    await client(UpdateStatusRequest(offline=False))
                    log_entry = WarmupLog(
                        account_id=account.id,
                        action="online",
                        details="Set status to online (Fallback for react)"
                    )
                except Exception as e:
                    logger.warning(f"Warmup online fallback failed: {e}")

        elif action == 'online':
            # Set status to online
            try:
                await client(UpdateStatusRequest(offline=False))
                logger.info(f"Warmup: Account {account.phone_number} set online status")
                log_entry = WarmupLog(
                    account_id=account.id,
                    action="online",
                    details="Set status to online"
                )
            except Exception as e:
                logger.warning(f"Warmup online failed: {e}")

        await client.disconnect()
        
        if log_entry:
            async with AsyncSessionLocal() as db:
                db.add(log_entry)
                await db.commit()
        
    except Exception as e:
        logger.error(f"Warmup error for {account.phone_number}: {e}")

async def run_warmup_cycle():
    """
    Check all accounts with warmup_enabled and run actions.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Account).where(Account.warmup_enabled == True))
        accounts = result.scalars().all()
        
        for account in accounts:
            # Random chance to skip this cycle (to look natural) - reduced to 10%
            if random.random() < 0.1:
                logger.info(f"Warmup: Skipping account {account.phone_number} this cycle (random skip)")
                continue
                
            await perform_warmup_action(account)
            
            # Update last run time
            account.warmup_last_run = datetime.utcnow()
            db.add(account)
            await db.commit()
            
            # Sleep between accounts to spread load
            await asyncio.sleep(random.randint(5, 15))
