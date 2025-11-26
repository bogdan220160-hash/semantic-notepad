import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Use environment variable or fallback to localhost
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/telegram_marketing")

async def migrate():
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    # Add proxy_url
    try:
        async with engine.begin() as conn:
            print("Checking proxy_url...")
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN proxy_url VARCHAR"))
            print("Added proxy_url column.")
    except Exception as e:
        print(f"Result for proxy_url: {e}")

    # Add warmup_enabled
    try:
        async with engine.begin() as conn:
            print("Checking warmup_enabled...")
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN warmup_enabled BOOLEAN DEFAULT FALSE"))
            print("Added warmup_enabled column.")
    except Exception as e:
        print(f"Result for warmup_enabled: {e}")

    # Add warmup_last_run
    try:
        async with engine.begin() as conn:
            print("Checking warmup_last_run...")
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN warmup_last_run TIMESTAMP"))
            print("Added warmup_last_run column.")
    except Exception as e:
        print(f"Result for warmup_last_run: {e}")

    await engine.dispose()
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
