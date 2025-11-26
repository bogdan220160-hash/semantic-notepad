from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.future import select
import sys
import os
import pytest
import pytest_asyncio

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import get_db
from app.models import Account, Base

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    class_=AsyncSession, autocommit=False, autoflush=False, bind=engine
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_toggle_warmup(client, init_db):
    # Create account
    account_id = None
    async with TestingSessionLocal() as db:
        account = Account(
            phone_number="+1234567890",
            api_id="123",
            api_hash="abc",
            session_string="session",
            warmup_enabled=False
        )
        db.add(account)
        await db.commit()
        # Get ID before closing session
        result = await db.execute(select(Account).where(Account.phone_number == "+1234567890"))
        acc = result.scalars().first()
        account_id = acc.id

    # Test enabling warmup
    response = await client.post(f"/accounts/{account_id}/warmup", json={"enabled": True})
    assert response.status_code == 200
    data = response.json()
    assert data["warmup_enabled"] == True

    # Verify in DB
    async with TestingSessionLocal() as db:
        result = await db.execute(select(Account).where(Account.id == account_id))
        acc = result.scalars().first()
        assert acc.warmup_enabled == True

    # Test disabling warmup
    response = await client.post(f"/accounts/{account_id}/warmup", json={"enabled": False})
    assert response.status_code == 200
    data = response.json()
    assert data["warmup_enabled"] == False

    # Verify in DB
    async with TestingSessionLocal() as db:
        result = await db.execute(select(Account).where(Account.id == account_id))
        acc = result.scalars().first()
        assert acc.warmup_enabled == False
        assert acc.warmup_last_run is None
