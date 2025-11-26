import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_schema():
    async with engine.begin() as conn:
        try:
            # Check if 'variants' column exists in 'ab_tests'
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='ab_tests' AND column_name='variants';"
            ))
            if result.scalar():
                print("Column 'variants' found in 'ab_tests'. Dropping it...")
                await conn.execute(text("ALTER TABLE ab_tests DROP COLUMN variants;"))
                print("Column 'variants' dropped.")
            else:
                print("Column 'variants' not found in 'ab_tests'.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_schema())
