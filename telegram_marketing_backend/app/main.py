from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from .routers import accounts, lists, messages, campaigns, logs, analytics, ab_test, scheduler, api, scraper, inbox, drip, filters, delay
from .database import engine
from .models import Base
from .scheduler_service import scheduler_loop
import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start scheduler loop in background
    asyncio.create_task(scheduler_loop())

    # Start event consumer (worker) in background
    from .events.consumer import EventConsumer
    consumer = EventConsumer()
    asyncio.create_task(consumer.start())
    
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(title="Telegram Marketing Platform Backend", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Telegram Marketing Backend"}

# Include routers
app.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
app.include_router(lists.router, prefix="/lists", tags=["User Lists"])
app.include_router(messages.router, prefix="/messages", tags=["Messages"])
app.include_router(campaigns.router, prefix="/campaigns", tags=["Campaign"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(ab_test.router, prefix="/ab_test", tags=["AB Test"])
app.include_router(scheduler.router, prefix="/scheduler", tags=["Scheduler"])
app.include_router(api.router, prefix="/api", tags=["API"])
app.include_router(scraper.router, prefix="/scraper", tags=["Scraper"])
app.include_router(inbox.router)
app.include_router(drip.router)
app.include_router(filters.router, prefix="/filters", tags=["Filters"])
app.include_router(delay.router, prefix="/delay", tags=["Delay"])
