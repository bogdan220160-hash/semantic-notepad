import asyncio
from app.database import AsyncSessionLocal
from app.models import UserList, Account, MessageTemplate
from sqlalchemy.future import select

async def check_data():
    async with AsyncSessionLocal() as db:
        lists = await db.execute(select(UserList))
        accounts = await db.execute(select(Account))
        templates = await db.execute(select(MessageTemplate))
        
        print(f"Lists: {len(lists.scalars().all())}")
        print(f"Accounts: {len(accounts.scalars().all())}")
        print(f"Templates: {len(templates.scalars().all())}")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_data())
