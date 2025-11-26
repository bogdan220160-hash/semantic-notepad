from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from datetime import datetime, timedelta
from ..models import SendLog
from ..database import get_db

router = APIRouter(
    tags=["analytics"]
)

@router.get("/daily")
async def daily_stats(days: int = 7, db: AsyncSession = Depends(get_db)):
    """Return aggregated daily statistics for the last `days` days."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Determine truncation interval
    trunc_interval = 'hour' if days == 1 else 'day'
    
    # Truncate timestamp
    date_trunc = func.date_trunc(trunc_interval, SendLog.timestamp)
    
    query = (
        select(
            date_trunc.label("date"),
            func.count().label("total"),
            func.sum(case((SendLog.status == 'sent', 1), else_=0)).label("sent"),
            func.sum(case((SendLog.status == 'failed', 1), else_=0)).label("failed"),
            func.sum(case((SendLog.status == 'skipped', 1), else_=0)).label("skipped"),
        )
        .where(SendLog.timestamp >= start_date)
        .group_by(date_trunc)
        .order_by(date_trunc)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    data = []
    for row in rows:
        # Format based on interval
        date_fmt = "%Y-%m-%d %H:00" if days == 1 else "%Y-%m-%d"
        data.append({
            "date": row.date.strftime(date_fmt),
            "total": row.total,
            "sent": row.sent or 0,
            "failed": row.failed or 0,
            "skipped": row.skipped or 0
        })
        
    return {"days": days, "data": data}

@router.get("/status-distribution")
async def get_status_distribution(db: AsyncSession = Depends(get_db)):
    """Get distribution of message statuses (sent, failed, skipped)."""
    result = await db.execute(
        select(SendLog.status, func.count(SendLog.id))
        .group_by(SendLog.status)
    )
    stats = result.all()
    return {status: count for status, count in stats}

@router.get("/hourly-activity")
async def get_hourly_activity(db: AsyncSession = Depends(get_db)):
    """Get message activity grouped by hour for the last 24 hours."""
    since = datetime.utcnow() - timedelta(hours=24)
    result = await db.execute(
        select(SendLog.timestamp)
        .where(SendLog.timestamp >= since)
    )
    timestamps = result.scalars().all()
    
    # Process in Python
    hourly_counts = {}
    for ts in timestamps:
        hour_key = ts.strftime("%H:00")
        hourly_counts[hour_key] = hourly_counts.get(hour_key, 0) + 1
        
    # Ensure all hours are represented
    final_data = []
    for i in range(24):
        hour = (datetime.utcnow() - timedelta(hours=i)).strftime("%H:00")
        final_data.append({"hour": hour, "count": hourly_counts.get(hour, 0)})
        
    final_data.reverse() # Chronological order
    return final_data

@router.get("/ab_test")
async def ab_test_results():
    """Return results of A/B tests (conversion rates, clicks, etc.)."""
    # Placeholder for A/B test logic
    return {"tests": []}
