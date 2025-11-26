import asyncio
from datetime import datetime, timedelta
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import DripCampaign, DripStep, DripProgress
from ..database import AsyncSessionLocal
from ..events.producer import producer
import logging

logger = logging.getLogger(__name__)

async def process_drip_campaigns():
    """Check for pending drip steps and execute them."""
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        
        # Find pending progress items that are due
        # We join with DripCampaign to ensure campaign is still active
        result = await db.execute(
            select(DripProgress, DripCampaign)
            .join(DripCampaign, DripProgress.drip_campaign_id == DripCampaign.id)
            .where(
                DripProgress.status == "pending",
                DripProgress.next_execution_time <= now,
                DripCampaign.status == "active"
            )
            .limit(100) # Process in batches
        )
        items = result.all()
        
        if not items:
            return

        logger.info(f"Processing {len(items)} drip items...")
        
        # Group items by account_id to reuse client
        items_by_account = {}
        for progress, campaign in items:
            if campaign.account_id not in items_by_account:
                items_by_account[campaign.account_id] = []
            items_by_account[campaign.account_id].append((progress, campaign))

        from telethon import TelegramClient
        from telethon.sessions import StringSession
        from ..models import Account

        for account_id, account_items in items_by_account.items():
            # Get account credentials
            acc_res = await db.execute(select(Account).where(Account.id == account_id))
            account = acc_res.scalars().first()
            
            if not account or not account.session_string:
                logger.error(f"Account {account_id} not found or invalid for drip processing")
                continue

            client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
            try:
                await client.connect()
                if not await client.is_user_authorized():
                    logger.error(f"Account {account_id} session expired")
                    continue

                for progress, campaign in account_items:
                    try:
                        user_data = progress.user_data
                        recipient = user_data.get("username") or user_data.get("phone")
                        
                        if not recipient:
                            progress.status = "failed"
                            continue

                        # Check for reply (Stop on Reply)
                        # We assume we want to stop if the LAST message is from the user
                        try:
                            entity = await client.get_entity(recipient)
                            messages = await client.get_messages(entity, limit=1)
                            
                            if messages:
                                last_msg = messages[0]
                                if not last_msg.out: # Incoming message = Reply
                                    logger.info(f"User {recipient} replied. Stopping drip.")
                                    progress.status = "replied"
                                    continue
                        except Exception as e:
                            logger.warning(f"Could not check reply for {recipient}: {e}")
                            # Proceed anyway? Or fail? Let's proceed to send.

                        # Find current step
                        step_res = await db.execute(
                            select(DripStep)
                            .where(
                                DripStep.drip_campaign_id == campaign.id,
                                DripStep.step_order == progress.current_step_order
                            )
                        )
                        current_step = step_res.scalars().first()
                        
                        if not current_step:
                            progress.status = "failed"
                            continue

                        # Send message
                        task_data = {
                            "campaign_id": f"drip_{campaign.id}_{progress.id}",
                            "recipient": recipient,
                            "template_id": current_step.template_id,
                            "account_ids": [campaign.account_id],
                            "delay": 0,
                            "variables": user_data
                        }
                        
                        await producer.publish("send_message", task_data)
                        
                        # Move to next step
                        next_step_res = await db.execute(
                            select(DripStep)
                            .where(
                                DripStep.drip_campaign_id == campaign.id,
                                DripStep.step_order > progress.current_step_order
                            )
                            .order_by(DripStep.step_order)
                            .limit(1)
                        )
                        next_step = next_step_res.scalars().first()
                        
                        if next_step:
                            progress.current_step_order = next_step.step_order
                            progress.next_execution_time = now + timedelta(minutes=next_step.delay_minutes)
                        else:
                            progress.status = "completed"
                            progress.next_execution_time = None
                        
                    except Exception as e:
                        logger.error(f"Error processing drip item {progress.id}: {e}")
                        progress.status = "failed"

            except Exception as e:
                logger.error(f"Error with account {account_id} client: {e}")
            finally:
                await client.disconnect()
        
        await db.commit()
