from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List
from ..models import ABTest, ABTestVariant, MessageTemplate
from ..database import get_db

router = APIRouter(
    tags=["ab_test"]
)

class VariantCreate(BaseModel):
    template_id: int
    weight: int

class ABTestCreate(BaseModel):
    name: str
    variants: List[VariantCreate]

@router.post("/create")
async def create_test(test: ABTestCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_test = ABTest(name=test.name, status="running")
        db.add(new_test)
        await db.flush()
        
        for v in test.variants:
            variant = ABTestVariant(
                test_id=new_test.id,
                template_id=v.template_id,
                weight=v.weight
            )
            db.add(variant)
            
        await db.commit()
        return {"status": "created", "id": new_test.id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create A/B test: {str(e)}")


@router.get("/list")
async def list_tests(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ABTest).options(selectinload(ABTest.variants))
    )
    tests = result.scalars().all()
    return tests

@router.get("/results/{test_id}")
async def get_results(test_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ABTest)
        .where(ABTest.id == test_id)
        .options(selectinload(ABTest.variants))
    )
    test = result.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    return test

@router.delete("/{test_id}")
async def delete_test(test_id: int, db: AsyncSession = Depends(get_db)):
    try:
        # Delete associated variants first
        await db.execute(
            delete(ABTestVariant).where(ABTestVariant.test_id == test_id)
        )
        # Delete the AB test itself
        result = await db.execute(select(ABTest).where(ABTest.id == test_id))
        ab_test = result.scalars().first()
        if not ab_test:
            raise HTTPException(status_code=404, detail="AB test not found")
        await db.delete(ab_test)
        await db.commit()
        return {"status": "deleted", "id": test_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete A/B test: {str(e)}")
