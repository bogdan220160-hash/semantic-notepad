import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN proxy_url VARCHAR;"))
            print("Added proxy_url column.")
        except Exception as e:
            print(f"Column might already exist or other error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
