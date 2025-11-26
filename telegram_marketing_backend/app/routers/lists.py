from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models import UserList
from ..database import get_db
from pydantic import BaseModel
import csv
import csv
import json
import io

router = APIRouter(
    tags=["lists"]
)

class CreateListRequest(BaseModel):
    name: str
    users: list

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_list(request: CreateListRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user list from JSON payload."""
    # Normalize users list to match expected format (list of dicts)
    # The frontend sends a list of strings (usernames/IDs)
    formatted_users = []
    for u in request.users:
        if isinstance(u, str):
            formatted_users.append({"username": u} if u.startswith("@") else {"id": u})
        elif isinstance(u, dict):
            formatted_users.append(u)
        else:
            formatted_users.append({"id": str(u)})

    new_list = UserList(
        name=request.name,
        users=formatted_users
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    
    return {"status": "success", "list_id": new_list.id, "count": len(formatted_users)}

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_list(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload a user list (CSV, JSON, or TXT)."""
    contents = await file.read()
    filename = file.filename
    users = []

    try:
        if filename.endswith('.csv'):
            # Parse CSV
            decoded = contents.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded))
            for row in csv_reader:
                # Normalize keys to lowercase
                normalized_row = {k.lower(): v for k, v in row.items()}
                users.append(normalized_row)
        elif filename.endswith('.json'):
            # Parse JSON
            users = json.loads(contents)
            if not isinstance(users, list):
                raise HTTPException(status_code=400, detail="JSON must be a list of users")
        elif filename.endswith('.txt'):
            # Parse TXT (one phone per line)
            decoded = contents.decode('utf-8')
            lines = decoded.splitlines()
            for line in lines:
                line = line.strip()
                if line:
                    users.append({"phone": line})
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV, JSON, or TXT.")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Create UserList entry
    new_list = UserList(
        name=filename,
        users=users
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    
    return {"status": "success", "list_id": new_list.id, "count": len(users)}

@router.get("/")
async def get_lists(db: AsyncSession = Depends(get_db)):
    """Get all user lists."""
    result = await db.execute(select(UserList))
    lists = result.scalars().all()
    return [{"id": l.id, "name": l.name, "count": len(l.users), "created_at": l.created_at} for l in lists]

@router.get("/{list_id}")
async def get_list(list_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific user list."""
    result = await db.execute(select(UserList).where(UserList.id == list_id))
    user_list = result.scalars().first()
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")
    return user_list

@router.delete("/{list_id}")
async def delete_list(list_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a user list."""
    result = await db.execute(select(UserList).where(UserList.id == list_id))
    user_list = result.scalars().first()
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    await db.delete(user_list)
    await db.commit()
    return {"status": "deleted", "list_id": list_id}

class SplitListRequest(BaseModel):
    chunk_size: int

@router.post("/{list_id}/split")
async def split_list(list_id: int, request: SplitListRequest, db: AsyncSession = Depends(get_db)):
    """Split a user list into smaller chunks."""
    if request.chunk_size <= 0:
        raise HTTPException(status_code=400, detail="Chunk size must be greater than 0")

    # Fetch original list
    result = await db.execute(select(UserList).where(UserList.id == list_id))
    original_list = result.scalars().first()
    if not original_list:
        raise HTTPException(status_code=404, detail="List not found")

    users = original_list.users
    total_users = len(users)
    chunk_size = request.chunk_size
    
    if total_users == 0:
        raise HTTPException(status_code=400, detail="Cannot split an empty list")

    created_lists = []
    
    # Split logic
    for i in range(0, total_users, chunk_size):
        chunk = users[i:i + chunk_size]
        part_num = (i // chunk_size) + 1
        new_list_name = f"{original_list.name} - Part {part_num}"
        
        new_list = UserList(
            name=new_list_name,
            users=chunk
        )
        db.add(new_list)
        created_lists.append(new_list)

    await db.commit()
    
    return {
        "status": "success", 
        "original_list_id": list_id, 
        "new_lists_count": len(created_lists),
        "message": f"Split into {len(created_lists)} lists"
    }
