from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
from ..models import MessageTemplate
from ..database import get_db

router = APIRouter(
    tags=["messages"]
)

class MessageTemplateCreate(BaseModel):
    name: str
    content: str
    media_url: Optional[str] = None

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    media_url: Optional[str] = None

@router.post("/", status_code=201)
async def create_template(template: MessageTemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new message template."""
    print(f"Creating template: {template}")
    new_template = MessageTemplate(
        name=template.name,
        content=template.content,
        media_url=template.media_url
    )
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return new_template

@router.get("/")
async def get_templates(db: AsyncSession = Depends(get_db)):
    """Get all message templates."""
    result = await db.execute(select(MessageTemplate))
    templates = result.scalars().all()
    return templates

@router.get("/{template_id}")
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific message template."""
    result = await db.execute(select(MessageTemplate).where(MessageTemplate.id == template_id))
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/{template_id}")
async def update_template(template_id: int, update_data: MessageTemplateUpdate, db: AsyncSession = Depends(get_db)):
    """Update a message template."""
    result = await db.execute(select(MessageTemplate).where(MessageTemplate.id == template_id))
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if update_data.name is not None:
        template.name = update_data.name
    if update_data.content is not None:
        template.content = update_data.content
    if update_data.media_url is not None:
        template.media_url = update_data.media_url
        
    await db.commit()
    await db.refresh(template)
    return template

@router.delete("/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a message template."""
    result = await db.execute(select(MessageTemplate).where(MessageTemplate.id == template_id))
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.delete(template)
    await db.commit()
    return {"status": "deleted", "template_id": template_id}
