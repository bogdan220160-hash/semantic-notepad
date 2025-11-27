import asyncio
import json
import redis.asyncio as redis
import os
from telethon import TelegramClient, errors
from telethon.sessions import StringSession
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from ..models import Account, MessageTemplate, SendLog, Campaign
from ..database import DATABASE_URL

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STREAM_KEY = "telegram_events"
GROUP_NAME = "campaign_workers"
CONSUMER_NAME = "worker_1"

# Database setup for worker
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class EventConsumer:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL)
        self.clients = {} # Cache for TelegramClients: {account_id: client}

    async def get_client(self, account_id: int, db: AsyncSession):
        if account_id in self.clients:
            client = self.clients[account_id]
            if client.is_connected():
                return client
        
        # Load account from DB
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account or not account.session_string:
            return None
        
        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        self.clients[account_id] = client
        return client

    async def process_message(self, data: dict):
        async with AsyncSessionLocal() as db:
            campaign_id = data.get("campaign_id")
            recipient = data.get("recipient")
            template_id = data.get("template_id")
            account_ids = data.get("account_ids")
            delay = data.get("delay", 1.0)
            variables = data.get("variables", {})
            
            status = "failed"
            error_message = "Unknown error"
            account_id = None

            try:
                # 1. Select an account
                if not account_ids:
                    raise ValueError("No account_ids provided in task")
                
                import random
                account_id = random.choice(account_ids)
                
                # 2. Get Template
                result = await db.execute(select(MessageTemplate).where(MessageTemplate.id == template_id))
                template = result.scalars().first()
                if not template:
                    raise ValueError(f"Template {template_id} not found")

                # 3. Prepare content
                content = template.content
                for key, value in variables.items():
                    if isinstance(value, str):
                        content = content.replace(f"{{{key}}}", value)
                
                # 4. Send Message
                client = await self.get_client(account_id, db)
                if client:
                    # Resolve entity first
                    entity = recipient
                    if not recipient.startswith('+') and not recipient.isdigit():
                        try:
                            entity = await client.get_entity(recipient)
                        except Exception:
                            pass
                    
                    # --- FILTERS CHECK ---
                    try:
                        filter_settings_json = await self.redis.get("filter_settings")
                        if filter_settings_json:
                            filters = json.loads(filter_settings_json)
                            
                            if isinstance(entity, str): 
                                try:
                                    entity_obj = await client.get_entity(entity)
                                except:
                                    entity_obj = None
                            else:
                                entity_obj = entity

                            if entity_obj:
                                # 1. Skip Bots
                                if filters.get("skip_bots", True):
                                    if hasattr(entity_obj, 'bot') and entity_obj.bot:
                                        status = "skipped"
                                        error_message = "Filter: User is a bot"
                                        raise ValueError("Filter: User is a bot")

                                # 2. Skip No Photo
                                if filters.get("skip_no_photo", False):
                                    if hasattr(entity_obj, 'photo') and not entity_obj.photo:
                                        status = "skipped"
                                        error_message = "Filter: User has no photo"
                                        raise ValueError("Filter: User has no photo")
                    except ValueError as ve:
                        # Re-raise to be caught by outer try/except
                        raise ve
                    except Exception as e:
                        print(f"Error checking filters: {e}")
                    
                    # --- END FILTERS ---

                    # Send
                    await client.send_message(entity, content)
                    status = "sent"
                    error_message = None
                    print(f"Sent to {recipient} via account {account_id}")
                else:
                    error_message = f"Could not initialize client for account {account_id}"
                    raise ValueError(error_message)
            
            except errors.FloodWaitError as e:
                wait_time = e.seconds
                error_message = f"FloodWait: Need to wait {wait_time}s"
                print(f"Rate limit hit. Waiting {wait_time}s...")
                await asyncio.sleep(wait_time)
                status = "skipped" 

            except errors.RPCError as e:
                error_message = f"RPCError {e.code}: {e.message}"
                print(f"Telegram Error: {error_message}")

            except ValueError as ve:
                # Handled errors (filters, missing data)
                error_message = str(ve)
                if status == "failed": # If not already set to skipped
                     pass # keep failed
            
            except Exception as e:
                error_message = str(e)
                print(f"Failed to send to {recipient}: {e}")
                
            # 5. Log result
            try:
                log = SendLog(
                    campaign_id=campaign_id,
                    account_id=account_id,
                    recipient=recipient,
                    status=status,
                    error_message=error_message
                )
                db.add(log)
                await db.commit()
            except Exception as log_error:
                print(f"Failed to save log: {log_error}")
            
            # 6. Delay
            # Fetch global delay settings from Redis
            try:
                delay_settings_json = await self.redis.get("delay_settings")
                if delay_settings_json:
                    delay_settings = json.loads(delay_settings_json)
                    if delay_settings.get("type") == "random":
                        import random
                        min_d = float(delay_settings.get("min_delay", 1.0))
                        max_d = float(delay_settings.get("max_delay", 5.0))
                        actual_delay = random.uniform(min_d, max_d)
                        print(f"Sleeping for random delay: {actual_delay:.2f}s")
                        await asyncio.sleep(actual_delay)
                    else:
                        # Fixed delay from settings or campaign override? 
                        # Let's prefer global fixed setting if set, otherwise campaign delay
                        # Actually, usually campaign delay is the specific one. 
                        # But if "Fixed" is set in global Delay module, maybe we should enforce it?
                        # For now, let's say if Global is "Fixed", we use the Campaign's delay (which is passed as `delay`).
                        # If Global is "Random", we override with random.
                        await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(delay)
            except Exception as e:
                print(f"Error applying delay: {e}")
                await asyncio.sleep(delay)

    async def start(self):
        # Create consumer group if not exists
        try:
            await self.redis.xgroup_create(STREAM_KEY, GROUP_NAME, id="0", mkstream=True)
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

        print(f"Worker started, listening to {STREAM_KEY}...")
        
        while True:
            try:
                # Read new messages
                streams = await self.redis.xreadgroup(GROUP_NAME, CONSUMER_NAME, {STREAM_KEY: ">"}, count=1, block=5000)
                
                if not streams:
                    continue
                
                for stream, messages in streams:
                    for message_id, message_data in messages:
                        event_type = message_data.get(b"type", b"").decode("utf-8")
                        data_json = message_data.get(b"data", b"{}").decode("utf-8")
                        data = json.loads(data_json)
                        
                        if event_type == "send_message":
                            await self.process_message(data)
                        
                        # Acknowledge
                        await self.redis.xack(STREAM_KEY, GROUP_NAME, message_id)
                        
            except Exception as e:
                print(f"Error in worker loop: {e}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    consumer = EventConsumer()
    asyncio.run(consumer.start())
