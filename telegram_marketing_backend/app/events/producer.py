import json
import redis.asyncio as redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STREAM_KEY = "telegram_events"

class EventProducer:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL)

    async def publish(self, event_type: str, data: dict):
        """Publish an event to the Redis stream."""
        event = {
            "type": event_type,
            "data": json.dumps(data)
        }
        await self.redis.xadd(STREAM_KEY, event)

producer = EventProducer()
