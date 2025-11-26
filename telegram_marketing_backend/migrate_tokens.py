import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_tokens():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS api_tokens (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    token VARCHAR NOT NULL UNIQUE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
                );
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_api_tokens_token ON api_tokens (token);"))
            print("Created api_tokens table.")
        except Exception as e:
            print(f"Error creating table: {e}")

if __name__ == "__main__":
    asyncio.run(migrate_tokens())
