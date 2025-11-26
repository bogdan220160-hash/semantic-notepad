import asyncio
from sqlalchemy import text
from app.database import engine, Base

async def migrate():
    async with engine.begin() as conn:
        try:
            # Create tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
            print("Tables created/updated.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
