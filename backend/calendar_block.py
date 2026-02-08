from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

class CalendarBlock(BaseModel):
    provider_id: str
    date: str  # YYYY-MM-DD
    reason: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {ObjectId: str}

# Mongo collection access
from database_mongo import get_database

def get_calendar_blocks_collection():
    return get_database().calendar_blocks
