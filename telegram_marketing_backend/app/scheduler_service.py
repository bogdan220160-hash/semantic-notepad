import asyncio
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from .models import Campaign, UserList, MessageTemplate, ABTest, Account
from .database import AsyncSessionLocal
from .events.producer import producer
import json
import logging
from .tasks.campaign_runner import run_pending_campaigns
from .tasks.warmup import run_warmup_cycle
from .tasks.drip_processor import process_drip_campaigns

logger = logging.getLogger(__name__)

async def check_scheduled_campaigns():
    """Check for scheduled campaigns that need to be started."""
    logger.info("Checking for scheduled campaigns...")
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        # Find campaigns that are 'scheduled' and scheduled_for <= now
        result = await db.execute(
            select(Campaign).where(
                Campaign.status == "scheduled",
                Campaign.scheduled_for <= now
            )
        )
        campaigns = result.scalars().all()
        
        for campaign in campaigns:
            logger.info(f"Starting scheduled campaign: {campaign.name} (ID: {campaign.id})")
            await start_scheduled_campaign(campaign, db)

async def start_scheduled_campaign(campaign: Campaign, db: AsyncSession):
    """Start a campaign that was previously scheduled."""
    try:
        # Update status to running
        campaign.status = "running"
        await db.commit()
        
        # Load config
        config = campaign.config
        list_id = config.get("list_id")
        template_id = config.get("template_id")
        ab_test_id = config.get("ab_test_id")
        account_ids = config.get("account_ids", [])
        delay = config.get("delay", 1.0)
        
        # Fetch list
        list_res = await db.execute(select(UserList).where(UserList.id == list_id))
        user_list = list_res.scalars().first()
        if not user_list:
            logger.error(f"User list {list_id} not found for campaign {campaign.id}")
            campaign.status = "failed" # Or stopped
            await db.commit()
            return

        # Fetch AB Test variants if applicable
        ab_test_variants = []
        if ab_test_id:
            ab_test_res = await db.execute(select(ABTest).where(ABTest.id == ab_test_id))
            ab_test = ab_test_res.scalars().first()
            if ab_test:
                ab_test_variants = ab_test.variants

        # Publish tasks
        users = user_list.users
        if not isinstance(users, list):
            users = []

        import random
        
        for user in users:
            selected_template_id = template_id
            
            if ab_test_id and ab_test_variants:
                total_weight = sum(v.get("weight", 0) for v in ab_test_variants)
                r = random.uniform(0, total_weight)
                upto = 0
                for v in ab_test_variants:
                    if upto + v.get("weight", 0) >= r:
                        selected_template_id = v.get("template_id")
                        break
                    upto += v.get("weight", 0)
            
            task_data = {
                "campaign_id": campaign.id,
                "recipient": user.get("phone") or user.get("username"),
                "template_id": selected_template_id,
                "account_ids": account_ids,
                "delay": delay,
                "variables": user,
                "ab_test_id": ab_test_id
            }
            
            if task_data["recipient"]:
                 await producer.publish("send_message", task_data)
                 
        logger.info(f"Campaign {campaign.id} started successfully with {len(users)} tasks.")
        
    except Exception as e:
        logger.error(f"Failed to start scheduled campaign {campaign.id}: {e}")
        campaign.status = "failed"
        await db.commit()

async def scheduler_loop():
    logger.info("Scheduler started")
    while True:
        try:
            await run_pending_campaigns()
            await check_scheduled_campaigns()
            await process_drip_campaigns()
            # Run warmup cycle (it handles its own checks and sleeps)
            await run_warmup_cycle()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        
        await asyncio.sleep(60)  # Check every minute
