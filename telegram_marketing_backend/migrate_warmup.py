import asyncio
import sys
from sqlalchemy import text
from app.database import engine, Base

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN warmup_enabled BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN warmup_last_run TIMESTAMP WITHOUT TIME ZONE;"))
            print("Added warmup columns.")
        except Exception as e:
            print(f"Columns might already exist or other error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
