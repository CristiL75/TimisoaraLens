"""
MongoDB Database Configuration
Uses Motor (async MongoDB driver)
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from bson import ObjectId
import os

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/TimisoaraLens")
DATABASE_NAME = os.getenv("DATABASE_NAME", "TimisoaraLens")

# Global MongoDB client
mongodb_client: Optional[AsyncIOMotorClient] = None
database = None

# Custom ObjectId type for Pydantic v2
class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ],
        serialization=core_schema.plain_serializer_function_ser_schema(
            lambda x: str(x)
        ))

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

# User Model (simplified for MongoDB)
class UserModel(BaseModel):
    """User database model"""
    email: EmailStr
    username: str
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
            }
        }

# Quiz History Model
class QuizHistoryModel(BaseModel):
    """Quiz history model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    landmark_id: int
    quiz_id: str
    score: int
    total_questions: int
    completed_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Landmark Visit Model
class LandmarkVisitModel(BaseModel):
    """Landmark visit tracking model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    landmark_id: int
    visited_at: datetime = Field(default_factory=datetime.utcnow)
    method: str  # "gps" or "vision"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

async def connect_to_mongo():
    """Connect to MongoDB"""
    global mongodb_client, database
    try:
        mongodb_client = AsyncIOMotorClient(MONGODB_URL)
        database = mongodb_client[DATABASE_NAME]
        
        # Test connection
        await mongodb_client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        
        # Create indexes for better performance
        await database.users.create_index("email", unique=True)
        await database.users.create_index("username", unique=True)
        await database.quiz_history.create_index("user_id")
        await database.landmark_visits.create_index("user_id")
        
        # Listings indexes
        await database.listings.create_index("user_id")
        await database.listings.create_index("status")
        # Create geospatial index for location (GeoJSON Point)
        # If documents contain `location_geo: { type: 'Point', coordinates: [lng, lat] }` this index will be used
        try:
            await database.listings.create_index([("location_geo", "2dsphere")])
        except Exception:
            # Fallback: also create simple compound index on lat/lon
            await database.listings.create_index([("location.latitude", 1), ("location.longitude", 1)])
        await database.listings.create_index("created_at")
        
        print("✅ MongoDB indexes created")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        print("💡 Make sure MongoDB is running on localhost:27017")
        print("💡 Or update MONGODB_URL in .env file")

async def close_mongo_connection():
    """Close MongoDB connection"""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        print("👋 Closed MongoDB connection")

def get_database():
    """Get database instance"""
    return database

# Collection getters
def get_users_collection():
    """Get users collection"""
    return database.users

def get_quiz_history_collection():
    """Get quiz history collection"""
    return database.quiz_history

def get_landmark_visits_collection():
    """Get landmark visits collection"""
    return database.landmark_visits
