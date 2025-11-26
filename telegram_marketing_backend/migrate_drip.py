import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base
from app.database import DATABASE_URL
import sys

# Fix for Windows Event Loop
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def migrate():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
