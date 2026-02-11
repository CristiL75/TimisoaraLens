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
        
        # Bookings indexes
        await database.providers.create_index("user_id")
        await database.providers.create_index("status")
        await database.tables.create_index("provider_id")
        await database.services.create_index("provider_id")
        await database.employees.create_index("provider_id")
        await database.bookings.create_index("provider_id")
        await database.bookings.create_index([("provider_id", 1), ("booking_date", 1)])
        await database.bookings.create_index("status")
        
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

def get_providers_collection():
    """Get service providers collection"""
    return database.providers

def get_tables_collection():
    """Get tables collection"""
    return database.tables

def get_bookings_collection():
    """Get bookings collection"""
    return database.bookings

def get_services_collection():
    """Get services collection"""
    return database.services

def get_employees_collection():
    """Get employees collection"""
    return database.employees


# ============================================================
# BOOKING SYSTEM MODELS
# ============================================================

class WorkingHours(BaseModel):
    """Working hours for a specific day"""
    day: str  # "monday", "tuesday", etc.
    open_time: str  # "10:00"
    close_time: str  # "22:00"
    is_closed: bool = False
    break_start: Optional[str] = None  # "13:00"
    break_end: Optional[str] = None  # "14:00"


class BookingSettings(BaseModel):
    """Booking configuration for a provider"""
    type: str = "table_based"  # "table_based" or "appointment_based"
    default_duration_minutes: int = 90
    buffer_minutes: int = 15
    advance_booking_hours: int = 2  # Minimum hours before booking
    max_advance_days: int = 30  # Maximum days in advance


class Car(BaseModel):
    """Car entry for rent-a-car providers"""
    id: Optional[str] = None
    brand: str
    model: str
    images: list[str] = []
    delivery_radius_km: Optional[float] = None
    year: Optional[int] = None
    seats: int
    luggage: int
    transmission: str
    fuel: str
    consumption: Optional[float] = None
    price_per_day: float
    price_weekend: Optional[float] = None
    deposit: float
    included_km_per_day: Optional[int] = None


class Provider(BaseModel):
    """Service provider (restaurant, pub, etc.)"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str  # Link to user account
    listing_id: Optional[PyObjectId] = None  # Link to existing listing (optional)
    
    category: str = "food_drinks"  # ex: "food_drinks"
    name: str
    email: Optional[EmailStr] = None
    phone: str
    description: Optional[str] = None
    images: list[str] = []  # URLs to images
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    facilities: Optional[dict] = None  # Facilități pentru restaurante/pub
    cars: list[Car] = []

    booking_settings: BookingSettings
    working_hours: list[WorkingHours]

    status: str = "active"  # "active", "pending", "suspended"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Table(BaseModel):
    """Table resource for restaurant/pub"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    provider_id: PyObjectId
    
    name: str  # "Masa 1", "Table A", etc.
    seats: int  # Number of seats
    zone: Optional[str] = None  # "interior", "terasa", "bar"
    special_options: list[str] = []  # ex: ["nefumători", "lângă geam", "VIP"]
    location: Optional[str] = None  # compatibilitate veche
    
    status: str = "active"  # "active", "inactive"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Service(BaseModel):
    """Appointment-based service (haircut, massage, etc.)"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    provider_id: PyObjectId
    name: str
    duration_minutes: int
    price: float
    buffer_minutes: Optional[int] = None
    category: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Employee(BaseModel):
    """Employee for appointment-based services"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    provider_id: PyObjectId
    name: str
    role: Optional[str] = None
    service_ids: list[PyObjectId] = []
    working_hours: list[WorkingHours] = []
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Booking(BaseModel):
    """Customer booking/reservation"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    provider_id: PyObjectId
    table_id: Optional[PyObjectId] = None  # Can be null (auto-assign)
    service_id: Optional[PyObjectId] = None
    employee_id: Optional[PyObjectId] = None
    car_id: Optional[str] = None
    
    # Customer info
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    user_id: Optional[PyObjectId] = None  # If user is logged in
    
    # Booking details
    booking_date: str  # "2026-02-01"
    start_time: str  # "19:00"
    end_time: str  # "20:30"
    rental_end_date: Optional[str] = None
    rental_end_time: Optional[str] = None
    party_size: int  # Number of people
    party_adults: Optional[int] = 0  # Număr adulți
    party_children: Optional[int] = 0  # Număr copii
    
    # Detalii suplimentare
    table_preference: Optional[str] = "fara_preferinta"  # "interior", "terasa", "fara_preferinta"
    special_occasion: Optional[str] = "nicio_ocazie"  # "nicio_ocazie", "zi_de_nastere", "aniversare", "business"
    
    notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    
    status: str = "pending"  # "pending", "confirmed", "canceled", "completed"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    canceled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
