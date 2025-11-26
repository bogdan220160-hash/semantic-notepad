from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from ..models import SendLog
from ..database import get_db
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(
    tags=["logs"]
)

@router.get("/")
async def get_logs(
    skip: int = 0, 
    limit: int = 50, 
    status: str = None,
    search: str = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(SendLog).order_by(SendLog.timestamp.desc())
    
    if status:
        query = query.where(SendLog.status == status)
        
    if search:
        # Simple search on recipient or error message
        query = query.where(
            (SendLog.recipient.ilike(f"%{search}%")) | 
            (SendLog.error_message.ilike(f"%{search}%"))
        )
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return logs

@router.get("/export")
async def export_logs(
    status: str = None,
    search: str = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(SendLog).order_by(SendLog.timestamp.desc())
    
    if status:
        query = query.where(SendLog.status == status)
        
    if search:
        query = query.where(
            (SendLog.recipient.ilike(f"%{search}%")) | 
            (SendLog.error_message.ilike(f"%{search}%"))
        )
        
    result = await db.execute(query)
    logs = result.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Campaign ID', 'Account ID', 'Recipient', 'Status', 'Error', 'Timestamp'])
    
    for log in logs:
        writer.writerow([
            log.id, 
            log.campaign_id, 
            log.account_id, 
            log.recipient, 
            log.status, 
            log.error_message, 
            log.timestamp
        ])
        
    output.seek(0)
    
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=logs_export.csv"
    return response
