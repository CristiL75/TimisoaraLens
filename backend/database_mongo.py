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
        mongodb_client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
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
        await database.rooms.create_index("provider_id")
        await database.services.create_index("provider_id")
        await database.employees.create_index("provider_id")
        await database.bookings.create_index("provider_id")
        await database.bookings.create_index([("provider_id", 1), ("booking_date", 1)])
        await database.bookings.create_index("status")
        await database.service_offers.create_index("user_id")
        await database.service_offers.create_index("services")

        # Apartment booking requests indexes
        await database.apartment_booking_requests.create_index("listing_id")
        await database.apartment_booking_requests.create_index("guest_user_id")
        await database.apartment_booking_requests.create_index("owner_user_id")
        await database.apartment_booking_requests.create_index("status")
        await database.apartment_booking_requests.create_index(
            [("listing_id", 1), ("check_in", 1), ("check_out", 1)]
        )
        await database.apartment_booking_requests.create_index("stripe_payment_intent_id")

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

def get_rooms_collection():
    """Get rooms collection"""
    return database.rooms

def get_bookings_collection():
    """Get bookings collection"""
    return database.bookings

def get_services_collection():
    """Get services collection"""
    return database.services

def get_employees_collection():
    """Get employees collection"""
    return database.employees

def get_service_offers_collection():
    """Get service offers collection"""
    return database.service_offers

def get_apartment_booking_requests_collection():
    """Get apartment booking requests collection (Stripe-powered)"""
    return database.apartment_booking_requests

def get_experiences_collection():
    """Get experiences collection"""
    return database.experiences


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


class EventSettings(BaseModel):
    """Event configuration for club/nightlife providers"""
    max_capacity: Optional[int] = None
    rental_price_per_night: Optional[float] = None
    minimum_event_consumption: Optional[float] = None
    catering_available: bool = False
    dj_available: bool = False
    decor_available: bool = False
    event_types: list[str] = []  # "petrecere_privata", "aniversare", "team_building"


class ReservationType(BaseModel):
    """Reservation type for club/nightlife providers"""
    id: Optional[str] = None
    name: str  # "Masa standard", "Masa VIP", "Birthday package", "Bottle service"
    type_key: str  # "standard", "vip", "birthday", "bottle_service"
    price: Optional[float] = None
    minimum_consumption: Optional[float] = None
    benefits: list[str] = []  # ["Loc rezervat", "Welcome drink", etc.]


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
    event_settings: Optional[EventSettings] = None  # Setari evenimente pt cluburi
    reservation_types: list[ReservationType] = []  # Tipuri de rezervare pt cluburi

    booking_settings: BookingSettings
    working_hours: list[WorkingHours]

    status: str = "active"  # "active", "pending", "suspended"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Table(BaseModel):
    """Table resource for restaurant/pub/club"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    provider_id: PyObjectId
    
    name: str  # "Masa 1", "Table A", etc.
    seats: int  # Number of seats
    zone: Optional[str] = None  # "interior", "terasa", "bar", "dancefloor", "vip", "lounge"
    special_options: list[str] = []  # ex: ["nefumători", "lângă geam", "VIP"]
    location: Optional[str] = None  # compatibilitate veche
    minimum_consumption: Optional[float] = None  # Consumatie minima (lei) - pt cluburi
    reservation_fee: Optional[float] = None  # Taxa de rezervare (lei) - pt cluburi
    
    status: str = "active"  # "active", "inactive"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Room(BaseModel):
    """Room or hall resource for location/business providers"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    provider_id: PyObjectId

    name: str
    space_type: str
    capacity: int
    price_per_hour: Optional[float] = None
    price_half_day: Optional[float] = None
    price_full_day: Optional[float] = None
    amenities: list[str] = []
    layouts: list[str] = []
    images: list[str] = []

    status: str = "active"
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
    images: list[str] = []  # URLs to service images
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


class ServiceOfferAvailability(BaseModel):
    """Availability block for service offers"""
    days: list[str] = []
    start_time: str
    end_time: str


class ServiceOffer(BaseModel):
    """Standalone professional service offer"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    services: list[str] = []
    price_type: str
    price_value: float
    availability: ServiceOfferAvailability
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class RouteStop(BaseModel):
    """A stop/waypoint on an experience route"""
    name: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ExperienceDate(BaseModel):
    """A scheduled date + time for an experience"""
    date: str        # "2026-03-10"
    start_time: str  # "10:00"


class Experience(BaseModel):
    """Guided tour / workshop / indoor activity"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    name: str
    description: Optional[str] = None
    experience_type: str = "guided_tour"  # guided_tour, indoor_activity, workshop
    images: list[str] = []

    # Participants
    min_participants: int = 1
    max_participants: int = 15

    # Location / meeting point
    meeting_point: Optional[str] = None  # address / landmark name
    meeting_latitude: Optional[float] = None
    meeting_longitude: Optional[float] = None
    meeting_instructions: Optional[str] = None

    # Route (for guided tours)
    route_stops: list[RouteStop] = []

    # Duration & schedule
    duration_text: Optional[str] = None  # "2h", "4h", "full day"
    available_dates: list[ExperienceDate] = []

    # Price
    price_per_person: float = 0
    private_group_price: Optional[float] = None

    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ExperienceBooking(BaseModel):
    """Booking for an experience"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    experience_id: PyObjectId
    user_id: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    date: str       # selected date
    start_time: str # selected time
    party_size: int
    is_private_group: bool = False
    notes: Optional[str] = None
    total_price: float = 0
    status: str = "pending"  # pending, confirmed, rejected, canceled
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
    room_id: Optional[PyObjectId] = None
    room_layout: Optional[str] = None
    pricing_unit: Optional[str] = None
    reservation_type_id: Optional[str] = None  # For club reservation types
    booking_type: Optional[str] = "table"  # "table" or "event"
    event_type: Optional[str] = None  # petrecere_privata, aniversare, team_building, etc.
    estimated_budget: Optional[float] = None
    requirements: list[str] = []  # ["dj", "catering", "decor"]
    
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
