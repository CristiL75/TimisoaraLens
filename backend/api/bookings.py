"""
Bookings API Router
Handles restaurant/pub table reservations
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId

from database_mongo import (
    get_providers_collection,
    get_tables_collection,
    get_bookings_collection,
    Provider,
    Table,
    Booking,
    BookingSettings,
    WorkingHours,
    PyObjectId
)
from auth_utils import get_current_user

router = APIRouter(tags=["Bookings"])


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class ProviderCreateRequest(BaseModel):
    """Request to create a new provider"""
    category: str = "food_drinks"
    reservation_type: str = "table_based"
    name: str
    email: EmailStr
    phone: str
    description: Optional[str] = None
    images: List[str] = []
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    listing_id: Optional[str] = None
    facilities: Optional[dict] = None
    booking_settings: BookingSettings
    working_hours: List[WorkingHours]


class ProviderResponse(BaseModel):
    """Provider response"""
    id: str
    category: str
    reservation_type: str
    name: str
    email: str
    phone: str
    description: Optional[str]
    images: List[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    facilities: Optional[dict]
    booking_settings: BookingSettings
    working_hours: List[WorkingHours]
    status: str


class TableCreateRequest(BaseModel):
    """Request to create a table"""
    provider_id: str
    name: str
    seats: int
    zone: Optional[str] = None
    special_options: List[str] = []
    location: Optional[str] = None


class TableResponse(BaseModel):
    """Table response"""
    id: str
    provider_id: str
    name: str
    seats: int
    zone: Optional[str]
    special_options: List[str]
    location: Optional[str]
    status: str


class BookingCreateRequest(BaseModel):
    """Request to create a booking"""
    provider_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    booking_date: str  # "2026-02-01"
    start_time: str  # "19:00"
    party_size: int
    notes: Optional[str] = None
    table_id: Optional[str] = None


class BookingResponse(BaseModel):
    """Booking response"""
    id: str
    provider_id: str
    table_id: Optional[str]
    customer_name: str
    customer_email: str
    customer_phone: str
    booking_date: str
    start_time: str
    end_time: str
    party_size: int
    notes: Optional[str]
    status: str
    created_at: str


class AvailabilitySlot(BaseModel):
    """Available time slot"""
    time: str  # "19:00"
    available: bool
    tables_available: int


class AvailabilityResponse(BaseModel):
    """Availability check response"""
    date: str
    slots: List[AvailabilitySlot]


# ============================================================
# PROVIDER ENDPOINTS
# ============================================================

@router.post("/providers", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(request: ProviderCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new service provider"""
    print("[DEBUG] create_provider CALLED!")
    try:
        print("[DEBUG] ProviderCreateRequest:", request)
    except Exception as e:
        print("[DEBUG] Exception printing request:", e)
    providers_col = get_providers_collection()
    try:
        provider = Provider(
            user_id=PyObjectId(current_user["id"]),
            listing_id=PyObjectId(request.listing_id) if request.listing_id else None,
            category=request.category,
            reservation_type=request.reservation_type,
            name=request.name,
            email=request.email,
            phone=request.phone,
            description=request.description,
            images=request.images,
            address=request.address,
            latitude=request.latitude,
            longitude=request.longitude,
            facilities=request.facilities,
            booking_settings=request.booking_settings,
            working_hours=request.working_hours,
            status="active"
        )
        result = await providers_col.insert_one(provider.model_dump(by_alias=True, exclude={"id"}))
        print("[DEBUG] Provider created with id:", str(result.inserted_id))
        return ProviderResponse(
            id=str(result.inserted_id),
            category=provider.category,
            reservation_type=provider.reservation_type,
            name=provider.name,
            email=provider.email,
            phone=provider.phone,
            description=provider.description,
            images=provider.images,
            address=provider.address,
            latitude=provider.latitude,
            longitude=provider.longitude,
            facilities=provider.facilities,
            booking_settings=provider.booking_settings,
            working_hours=provider.working_hours,
            status=provider.status
        )
    except Exception as e:
        print("[DEBUG] Exception in create_provider:", str(e))
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/providers", response_model=List[ProviderResponse])
async def list_providers():
    """List all active providers"""
    providers_col = get_providers_collection()
    
    providers = await providers_col.find({"status": "active"}).to_list(100)
    
    return [
        ProviderResponse(
            id=str(p["_id"]),
            category=p.get("category", "food_drinks"),
            reservation_type=p.get("reservation_type", "table_based"),
            name=p["name"],
            email=p["email"],
            phone=p["phone"],
            description=p.get("description"),
            images=p.get("images", []),
            address=p.get("address"),
            latitude=p.get("latitude"),
            longitude=p.get("longitude"),
            booking_settings=BookingSettings(**p["booking_settings"]),
            working_hours=[WorkingHours(**wh) for wh in p["working_hours"]],
            status=p["status"]
        )
        for p in providers
    ]


@router.get("/providers/{provider_id}", response_model=ProviderResponse)
async def get_provider(provider_id: str):
    """Get provider details"""
    providers_col = get_providers_collection()
    
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return ProviderResponse(
        id=str(provider["_id"]),
        category=provider.get("category", "food_drinks"),
        reservation_type=provider.get("reservation_type", "table_based"),
        name=provider["name"],
        email=provider["email"],
        phone=provider["phone"],
        description=provider.get("description"),
        images=provider.get("images", []),
        address=provider.get("address"),
        latitude=provider.get("latitude"),
        longitude=provider.get("longitude"),
        booking_settings=BookingSettings(**provider["booking_settings"]),
        working_hours=[WorkingHours(**wh) for wh in provider["working_hours"]],
        status=provider["status"]
    )


@router.put("/providers/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: str,
    request: ProviderCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update provider details"""
    providers_col = get_providers_collection()
    
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Check ownership
    if str(provider["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this provider")
    
    # Update provider
    update_data = {
        "category": request.category,
        "reservation_type": request.reservation_type,
        "name": request.name,
        "email": request.email,
        "phone": request.phone,
        "description": request.description,
        "images": request.images,
        "address": request.address,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "booking_settings": request.booking_settings.model_dump(),
        "working_hours": [wh.model_dump() for wh in request.working_hours],
        "updated_at": datetime.utcnow()
    }
    if request.listing_id:
        update_data["listing_id"] = ObjectId(request.listing_id)
    
    await providers_col.update_one(
        {"_id": ObjectId(provider_id)},
        {"$set": update_data}
    )
    
    # Return updated provider
    updated_provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    
    return ProviderResponse(
        id=str(updated_provider["_id"]),
        category=updated_provider.get("category", "food_drinks"),
        reservation_type=updated_provider.get("reservation_type", "table_based"),
        name=updated_provider["name"],
        email=updated_provider["email"],
        phone=updated_provider["phone"],
        description=updated_provider.get("description"),
        images=updated_provider.get("images", []),
        address=updated_provider.get("address"),
        latitude=updated_provider.get("latitude"),
        longitude=updated_provider.get("longitude"),
        booking_settings=BookingSettings(**updated_provider["booking_settings"]),
        working_hours=[WorkingHours(**wh) for wh in updated_provider["working_hours"]],
        status=updated_provider["status"]
    )


# ============================================================
# TABLE ENDPOINTS
# ============================================================

@router.post("/tables", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
async def create_table(request: TableCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new table for a provider"""
    providers_col = get_providers_collection()
    tables_col = get_tables_collection()
    
    # Verify provider exists and belongs to current user
    if not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if str(provider["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")
    
    table = Table(
        provider_id=PyObjectId(request.provider_id),
        name=request.name,
        seats=request.seats,
        zone=request.zone,
        special_options=request.special_options,
        location=request.location,
        status="active"
    )
    
    result = await tables_col.insert_one(table.model_dump(by_alias=True, exclude={"id"}))
    
    return TableResponse(
        id=str(result.inserted_id),
        provider_id=request.provider_id,
        name=table.name,
        seats=table.seats,
        zone=table.zone,
        special_options=table.special_options,
        location=table.location,
        status=table.status
    )


@router.get("/tables/{provider_id}", response_model=List[TableResponse])
async def list_tables(provider_id: str):
    """List all tables for a provider"""
    tables_col = get_tables_collection()
    
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    tables = await tables_col.find({"provider_id": ObjectId(provider_id), "status": "active"}).to_list(100)
    
    return [
        TableResponse(
            id=str(t["_id"]),
            provider_id=str(t["provider_id"]),
            name=t["name"],
            seats=t["seats"],
            location=t.get("location"),
            status=t["status"]
        )
        for t in tables
    ]


# ============================================================
# BOOKING ENDPOINTS
# ============================================================

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(request: BookingCreateRequest):
    """Create a new booking"""
    providers_col = get_providers_collection()
    bookings_col = get_bookings_collection()
    
    # Validate provider
    if not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Calculate end time based on provider settings
    duration = provider["booking_settings"]["default_duration_minutes"]
    start_dt = datetime.strptime(f"{request.booking_date} {request.start_time}", "%Y-%m-%d %H:%M")
    end_dt = start_dt + timedelta(minutes=duration)
    end_time = end_dt.strftime("%H:%M")
    
    # TODO: Check availability before confirming
    
    booking = Booking(
        provider_id=PyObjectId(request.provider_id),
        table_id=PyObjectId(request.table_id) if request.table_id else None,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        booking_date=request.booking_date,
        start_time=request.start_time,
        end_time=end_time,
        party_size=request.party_size,
        notes=request.notes,
        status="confirmed" if provider["booking_settings"]["auto_confirm"] else "pending"
    )
    
    result = await bookings_col.insert_one(booking.model_dump(by_alias=True, exclude={"id"}))
    
    # TODO: Send email notification
    
    return BookingResponse(
        id=str(result.inserted_id),
        provider_id=str(booking.provider_id),
        table_id=str(booking.table_id) if booking.table_id else None,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        party_size=booking.party_size,
        notes=booking.notes,
        status=booking.status,
        created_at=booking.created_at.isoformat()
    )


@router.get("/availability/{provider_id}")
async def check_availability(
    provider_id: str,
    date: str,
    party_size: int
):
    """Check availability for a specific date and party size"""
    providers_col = get_providers_collection()
    tables_col = get_tables_collection()
    bookings_col = get_bookings_collection()
    
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Get all tables that can accommodate party size
    tables = await tables_col.find({
        "provider_id": ObjectId(provider_id),
        "seats": {"$gte": party_size},
        "status": "active"
    }).to_list(100)
    
    if not tables:
        return AvailabilityResponse(date=date, slots=[])
    
    # Get existing bookings for that date
    existing_bookings = await bookings_col.find({
        "provider_id": ObjectId(provider_id),
        "booking_date": date,
        "status": {"$in": ["pending", "confirmed"]}
    }).to_list(1000)
    
    # Generate time slots (simplified - every 30 minutes)
    slots = []
    settings = provider["booking_settings"]
    
    # Get working hours for the day
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day_name = date_obj.strftime("%A").lower()
    
    working_day = next((wh for wh in provider["working_hours"] if wh["day"] == day_name), None)
    
    if not working_day or working_day.get("is_closed"):
        return AvailabilityResponse(date=date, slots=[])
    
    # Generate slots from open to close time
    open_time = datetime.strptime(working_day["open_time"], "%H:%M")
    close_time = datetime.strptime(working_day["close_time"], "%H:%M")
    
    current_time = open_time
    while current_time < close_time:
        time_str = current_time.strftime("%H:%M")
        
        # Check how many tables are available at this time
        available_count = 0
        for table in tables:
            # Check if table is free
            is_free = True
            for booking in existing_bookings:
                if booking.get("table_id") == table["_id"]:
                    # Check time overlap
                    booking_start = datetime.strptime(booking["start_time"], "%H:%M")
                    booking_end = datetime.strptime(booking["end_time"], "%H:%M")
                    slot_start = current_time
                    slot_end = current_time + timedelta(minutes=settings["default_duration_minutes"])
                    
                    # Overlap check: startA < endB and startB < endA
                    if booking_start < slot_end.time() and datetime.strptime(booking["start_time"], "%H:%M").time() < slot_end.time():
                        is_free = False
                        break
            
            if is_free:
                available_count += 1
        
        slots.append(AvailabilitySlot(
            time=time_str,
            available=available_count > 0,
            tables_available=available_count
        ))
        
        current_time += timedelta(minutes=30)
    
    return AvailabilityResponse(date=date, slots=slots)


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    """Get booking details"""
    bookings_col = get_bookings_collection()
    
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    booking = await bookings_col.find_one({"_id": ObjectId(booking_id)})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return BookingResponse(
        id=str(booking["_id"]),
        provider_id=str(booking["provider_id"]),
        table_id=str(booking["table_id"]) if booking.get("table_id") else None,
        customer_name=booking["customer_name"],
        customer_email=booking["customer_email"],
        customer_phone=booking["customer_phone"],
        booking_date=booking["booking_date"],
        start_time=booking["start_time"],
        end_time=booking["end_time"],
        party_size=booking["party_size"],
        notes=booking.get("notes"),
        status=booking["status"],
        created_at=booking["created_at"].isoformat()
    )


@router.delete("/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking"""
    bookings_col = get_bookings_collection()
    
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    result = await bookings_col.update_one(
        {"_id": ObjectId(booking_id)},
        {
            "$set": {
                "status": "canceled",
                "canceled_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # TODO: Send cancellation email
    
    return {"message": "Booking canceled successfully"}
