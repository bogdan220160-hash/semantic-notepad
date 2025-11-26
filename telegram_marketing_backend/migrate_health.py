import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

# Use the same URL as the app
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://user:password@localhost/telegram_marketing")
engine = create_async_engine(DATABASE_URL, echo=True)

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN health_status VARCHAR DEFAULT 'unknown'"))
            print("Added health_status column")
        except Exception as e:
            print(f"health_status column might already exist: {e}")

        try:
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN last_health_check TIMESTAMP"))
            print("Added last_health_check column")
        except Exception as e:
            print(f"last_health_check column might already exist: {e}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
