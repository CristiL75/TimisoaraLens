from calendar_block import get_calendar_blocks_collection, CalendarBlock
"""
Bookings API Router
Handles restaurant/pub table reservations
"""
from fastapi import APIRouter, HTTPException, Depends, status, Response, Body, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import uuid4
import math
import re
from bson import ObjectId
from jose import JWTError, jwt

from database_mongo import (
    get_providers_collection,
    get_tables_collection,
    get_bookings_collection,
    get_services_collection,
    get_employees_collection,
    get_users_collection,
    Provider,
    Table,
    Booking,
    Service,
    Employee,
    BookingSettings,
    WorkingHours,
    Car,
    PyObjectId,
)
from auth_utils import get_current_user, SECRET_KEY, ALGORITHM

# Router trebuie definit imediat după importuri
router = APIRouter(tags=["Bookings"])


async def purge_expired_bookings(bookings_col) -> None:
    """Delete bookings that expired one day after booking_date."""
    try:
        today_str = datetime.utcnow().date().isoformat()
        await bookings_col.delete_many({"booking_date": {"$lt": today_str}})
    except Exception as exc:
        print(f"[ERROR] Failed to purge expired bookings: {exc}")


async def get_optional_user_from_request(request: Request) -> Optional[dict]:
    """Return user info if Authorization header is present and valid."""
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    email = payload.get("email")
    if not email:
        return None
    users_col = get_users_collection()
    user_doc = await users_col.find_one({"email": email})
    user_id = str(user_doc["_id"]) if user_doc and "_id" in user_doc else None
    return {"email": email, "id": user_id, "username": payload.get("username")}

# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class ProviderCreateRequest(BaseModel):
    """Request to create/update a provider"""
    category: str = "food_drinks"
    name: str
    email: Optional[EmailStr] = None
    phone: str
    description: Optional[str] = None
    images: List[str] = []
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    listing_id: Optional[str] = None
    facilities: Optional[dict] = None
    cars: List[Car] = []
    booking_settings: BookingSettings
    working_hours: List[WorkingHours]


class ProviderResponse(BaseModel):
    """Provider response"""
    id: str
    user_id: Optional[str] = None
    category: str
    name: str
    email: Optional[str] = None
    phone: str
    description: Optional[str]
    images: List[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    facilities: Optional[dict] = None
    cars: List[Car] = []
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
    zone: Optional[str] = None
    special_options: List[str] = []
    location: Optional[str] = None
    status: str


class ServiceCreateRequest(BaseModel):
    """Request to create a service"""
    provider_id: str
    name: str
    duration_minutes: int
    price: float
    buffer_minutes: Optional[int] = None
    category: Optional[str] = None


class ServiceResponse(BaseModel):
    """Service response"""
    id: str
    provider_id: str
    name: str
    duration_minutes: int
    price: float
    buffer_minutes: Optional[int] = None
    category: Optional[str] = None
    status: str


class EmployeeCreateRequest(BaseModel):
    """Request to create an employee"""
    provider_id: str
    name: str
    role: Optional[str] = None
    service_ids: List[str] = []
    working_hours: List[WorkingHours] = []


class EmployeeResponse(BaseModel):
    """Employee response"""
    id: str
    provider_id: str
    name: str
    role: Optional[str] = None
    service_ids: List[str] = []
    working_hours: List[WorkingHours] = []
    status: str


class BookingCreateRequest(BaseModel):
    """Request to create a booking"""
    provider_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    booking_date: str  # "2026-02-01"
    start_time: str  # "19:00"
    duration_minutes: Optional[int] = None
    party_size: int
    party_adults: Optional[int] = 0
    party_children: Optional[int] = 0
    table_preference: Optional[str] = "fara_preferinta"  # "interior", "terasa", "fara_preferinta"
    special_occasion: Optional[str] = "nicio_ocazie"  # "nicio_ocazie", "zi_de_nastere", "aniversare", "business"
    notes: Optional[str] = None
    table_id: Optional[str] = None
    service_id: Optional[str] = None
    employee_id: Optional[str] = None
    car_id: Optional[str] = None
    rental_end_date: Optional[str] = None
    rental_end_time: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None


class BookingResponse(BaseModel):
    """Booking response"""
    id: str
    provider_id: str
    table_id: Optional[str]
    service_id: Optional[str]
    employee_id: Optional[str]
    car_id: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    booking_date: str
    start_time: str
    end_time: str
    party_size: int
    party_adults: Optional[int] = 0
    party_children: Optional[int] = 0
    table_preference: Optional[str] = "fara_preferinta"
    special_occasion: Optional[str] = "nicio_ocazie"
    notes: Optional[str]
    status: str
    created_at: str
    rental_end_date: Optional[str] = None
    rental_end_time: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None


# Confirm/Reject booking endpoint
@router.patch("/{booking_id}/status")
async def update_booking_status(booking_id: str, payload: dict = Body(...), current_user=Depends(get_current_user)):
    """Confirm or reject a booking (owner only)"""
    bookings_col = get_bookings_collection()
    providers_col = get_providers_collection()
    tables_col = get_tables_collection()
    booking = await bookings_col.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    provider = await providers_col.find_one({"_id": ObjectId(booking["provider_id"])})
    if not provider or provider.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    status = payload.get("status")
    if status not in ["confirmed", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    if status == "confirmed":
        if provider.get("booking_settings", {}).get("type") == "fleet_based" and booking.get("car_id"):
            if not booking.get("rental_end_date") or not booking.get("rental_end_time"):
                raise HTTPException(status_code=400, detail="Missing rental end date/time")

            start_dt = datetime.strptime(
                f"{booking['booking_date']} {booking['start_time']}", "%Y-%m-%d %H:%M"
            )
            end_dt = datetime.strptime(
                f"{booking['rental_end_date']} {booking['rental_end_time']}", "%Y-%m-%d %H:%M"
            )

            existing_car_bookings = await bookings_col.find({
                "_id": {"$ne": ObjectId(booking_id)},
                "provider_id": {"$in": [ObjectId(str(booking["provider_id"])), str(booking["provider_id"])]},
                "car_id": str(booking.get("car_id")),
                "status": "confirmed"
            }).to_list(1000)

            for existing in existing_car_bookings:
                if not existing.get("rental_end_date") or not existing.get("rental_end_time"):
                    continue
                existing_start = datetime.strptime(
                    f"{existing['booking_date']} {existing['start_time']}", "%Y-%m-%d %H:%M"
                )
                existing_end = datetime.strptime(
                    f"{existing['rental_end_date']} {existing['rental_end_time']}", "%Y-%m-%d %H:%M"
                )
                if existing_start < end_dt and start_dt < existing_end:
                    raise HTTPException(status_code=409, detail="Car already booked for this period")

        if provider.get("booking_settings", {}).get("type") == "table_based" and not booking.get("table_id"):
            raise HTTPException(status_code=400, detail="Table selection required")

        if booking.get("table_id"):
            table_id = str(booking.get("table_id"))
            if not ObjectId.is_valid(table_id):
                raise HTTPException(status_code=400, detail="Invalid table ID")

            table = await tables_col.find_one({
                "_id": ObjectId(table_id),
                "provider_id": {"$in": [ObjectId(str(booking["provider_id"])), str(booking["provider_id"])]},
                "status": "active"
            })
            if not table:
                raise HTTPException(status_code=404, detail="Table not found")

            # Ensure no overlapping confirmed booking exists for the same table
            existing_table_bookings = await bookings_col.find({
                "_id": {"$ne": ObjectId(booking_id)},
                "provider_id": {"$in": [ObjectId(str(booking["provider_id"])), str(booking["provider_id"])]},
                "table_id": {"$in": [ObjectId(table_id), table_id]},
                "booking_date": booking["booking_date"],
                "status": "confirmed"
            }).to_list(1000)

            start_dt = datetime.strptime(f"{booking['booking_date']} {booking['start_time']}", "%Y-%m-%d %H:%M")
            end_dt = datetime.strptime(f"{booking['booking_date']} {booking['end_time']}", "%Y-%m-%d %H:%M")

            for existing in existing_table_bookings:
                existing_start = datetime.strptime(
                    f"{existing['booking_date']} {existing['start_time']}",
                    "%Y-%m-%d %H:%M"
                )
                existing_end = datetime.strptime(
                    f"{existing['booking_date']} {existing['end_time']}",
                    "%Y-%m-%d %H:%M"
                )
                if existing_start < end_dt and start_dt < existing_end:
                    raise HTTPException(status_code=409, detail="Table already booked for this time")
    await bookings_col.update_one({"_id": ObjectId(booking_id)}, {"$set": {"status": status}})
    return {"success": True, "status": status}


@router.get("/provider-bookings", response_model=List[BookingResponse])
async def get_provider_bookings(current_user=Depends(get_current_user)):
    """Return all bookings for services owned by current user"""
    providers_col = get_providers_collection()
    bookings_col = get_bookings_collection()
    await purge_expired_bookings(bookings_col)
    # Găsește toate serviciile deținute de user
    providers = await providers_col.find({"user_id": current_user["id"]}).to_list(100)
    provider_ids = [str(p["_id"]) for p in providers]
    # Găsește rezervările pentru aceste servicii
    bookings = await bookings_col.find({"provider_id": {"$in": provider_ids}}).to_list(200)
    result = []
    for b in bookings:
        try:
            booking = BookingResponse(
                id=str(b["_id"]),
                provider_id=str(b["provider_id"]),
                table_id=str(b["table_id"]) if b.get("table_id") else None,
                service_id=str(b.get("service_id")) if b.get("service_id") else None,
                employee_id=str(b.get("employee_id")) if b.get("employee_id") else None,
                car_id=b.get("car_id"),
                customer_name=b["customer_name"],
                customer_email=b["customer_email"],
                customer_phone=b["customer_phone"],
                booking_date=b["booking_date"],
                start_time=b["start_time"],
                end_time=b["end_time"],
                rental_end_date=b.get("rental_end_date"),
                rental_end_time=b.get("rental_end_time"),
                party_size=b["party_size"],
                party_adults=b.get("party_adults", 0),
                party_children=b.get("party_children", 0),
                table_preference=b.get("table_preference", "fara_preferinta"),
                special_occasion=b.get("special_occasion", "nicio_ocazie"),
                notes=b.get("notes"),
                delivery_address=b.get("delivery_address"),
                delivery_latitude=b.get("delivery_latitude"),
                delivery_longitude=b.get("delivery_longitude"),
                status=b["status"],
                created_at=b["created_at"].isoformat() if hasattr(b["created_at"], 'isoformat') else str(b["created_at"])
            )
            result.append(booking)
        except Exception as e:
            print(f"[ERROR] Skipping booking with _id={b.get('_id')} due to error: {e}")
    return result

class AvailabilitySlot(BaseModel):
    """Available time slot"""
    time: str  # "19:00"
    available: bool
    tables_available: int


class TableAvailability(BaseModel):
    """Per-table availability with time slots"""
    id: str
    name: str
    seats: int
    zone: Optional[str] = None
    special_options: List[str] = []
    location: Optional[str] = None
    available_slots: List[str]


class AvailabilityResponse(BaseModel):
    """Availability check response"""
    date: str
    slots: List[AvailabilitySlot]
    tables: List[TableAvailability] = []


# =========================
# USER PROFILE ENDPOINTS
# =========================

@router.get("/my-providers", response_model=List[ProviderResponse])
async def get_my_providers(current_user=Depends(get_current_user)):
    """Return all providers created by current user"""
    providers_col = get_providers_collection()
    providers = await providers_col.find({"user_id": current_user["id"]}).to_list(100)
    result = []
    for p in providers:
        try:
            cars = await ensure_car_ids(p, providers_col)
            provider = ProviderResponse(
                id=str(p["_id"]),
                user_id=p.get("user_id", None),
                category=p.get("category", "food_drinks"),
                reservation_type=p.get("reservation_type", "table_based"),
                name=p["name"],
                email=p.get("email"),
                phone=p["phone"],
                description=p.get("description"),
                images=p.get("images", []),
                address=p.get("address"),
                latitude=p.get("latitude"),
                longitude=p.get("longitude"),
                facilities=p.get("facilities"),
                cars=cars,
                booking_settings=BookingSettings(**p["booking_settings"]),
                working_hours=[WorkingHours(**wh) for wh in p["working_hours"]],
                status=p["status"]
            )
            result.append(provider)
        except Exception as e:
            print(f"[ERROR] Skipping provider with _id={p.get('_id')} due to error: {e}")
    return result


@router.get("/my-bookings", response_model=List[BookingResponse])
async def get_my_bookings(current_user=Depends(get_current_user)):
    """Return all bookings made by current user"""
    bookings_col = get_bookings_collection()
    await purge_expired_bookings(bookings_col)
    email = current_user.get("email")
    email_query = {"customer_email": email}
    case_insensitive_query = {
        "customer_email": {
            "$regex": f"^{re.escape(email)}$",
            "$options": "i",
        }
    }
    user_id = current_user.get("id")
    user_id_query = None
    if user_id and ObjectId.is_valid(user_id):
        user_id_query = {"user_id": {"$in": [ObjectId(user_id), user_id]}}
    query = {"$or": [email_query, case_insensitive_query]}
    if user_id_query:
        query["$or"].append(user_id_query)
    bookings = await bookings_col.find(query).to_list(100)
    result = []
    for b in bookings:
        try:
            booking = BookingResponse(
                id=str(b["_id"]),
                provider_id=str(b["provider_id"]),
                table_id=str(b["table_id"]) if b.get("table_id") else None,
                service_id=str(b.get("service_id")) if b.get("service_id") else None,
                employee_id=str(b.get("employee_id")) if b.get("employee_id") else None,
                car_id=b.get("car_id"),
                customer_name=b["customer_name"],
                customer_email=b["customer_email"],
                customer_phone=b["customer_phone"],
                booking_date=b["booking_date"],
                start_time=b["start_time"],
                end_time=b["end_time"],
                rental_end_date=b.get("rental_end_date"),
                rental_end_time=b.get("rental_end_time"),
                party_size=b["party_size"],
                party_adults=b.get("party_adults", 0),
                party_children=b.get("party_children", 0),
                table_preference=b.get("table_preference", "fara_preferinta"),
                special_occasion=b.get("special_occasion", "nicio_ocazie"),
                notes=b.get("notes"),
                delivery_address=b.get("delivery_address"),
                delivery_latitude=b.get("delivery_latitude"),
                delivery_longitude=b.get("delivery_longitude"),
                status=b["status"],
                created_at=b["created_at"].isoformat() if hasattr(b["created_at"], "isoformat") else str(b["created_at"])
            )
            result.append(booking)
        except Exception as e:
            print(f"[ERROR] Skipping booking with _id={b.get('_id')} due to error: {e}")
    return result


# ============================================================
# PROVIDER ENDPOINTS
# ============================================================

def normalize_cars(cars: Optional[List[Car]]) -> List[dict]:
    normalized = []
    for car in cars or []:
        car_data = car.model_dump() if hasattr(car, "model_dump") else dict(car)
        if not car_data.get("id"):
            car_data["id"] = str(uuid4())
        normalized.append(car_data)
    return normalized

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))

async def ensure_car_ids(provider_doc: dict, providers_col) -> List[dict]:
    cars = provider_doc.get("cars", [])
    normalized = []
    changed = False
    for car in cars:
        car_data = dict(car)
        if not car_data.get("id"):
            car_data["id"] = str(uuid4())
            changed = True
        normalized.append(car_data)
    if changed:
        await providers_col.update_one({"_id": provider_doc["_id"]}, {"$set": {"cars": normalized}})
    return normalized

@router.post("/providers", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(request: ProviderCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new service provider"""
    print("[DEBUG] === create_provider CALLED ===")
    try:
        print("[DEBUG] ProviderCreateRequest:", request)
        print("[DEBUG] current_user:", current_user)
    except Exception as e:
        print("[DEBUG] Exception printing request or user:", e)
    providers_col = get_providers_collection()
    try:
        # Acceptă atât 'id' cât și 'sub' ca identificator user
        user_id_val = current_user.get("id") or current_user.get("sub")
        cars_data = normalize_cars(request.cars)
        provider = Provider(
                user_id=str(user_id_val) if user_id_val else "",
            listing_id=PyObjectId(request.listing_id) if request.listing_id else None,
            category=request.category,
            name=request.name,
            email=request.email,
            phone=request.phone,
            description=request.description,
            images=request.images,
            address=request.address,
            latitude=request.latitude,
            longitude=request.longitude,
            facilities=request.facilities,
            cars=cars_data,
            booking_settings=request.booking_settings,
            working_hours=request.working_hours,
            status="active"
        )
        result = await providers_col.insert_one(provider.model_dump(by_alias=True, exclude={"id"}))
        print("[DEBUG] Provider created with id:", str(result.inserted_id))
        return ProviderResponse(
            id=str(result.inserted_id),
            user_id=str(user_id_val) if user_id_val else None,
            category=provider.category,
            name=provider.name,
            email=provider.email,
            phone=provider.phone,
            description=provider.description,
            images=provider.images,
            address=provider.address,
            latitude=provider.latitude,
            longitude=provider.longitude,
            facilities=provider.facilities,
            cars=provider.cars,
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

    result = []
    for p in providers:
        try:
            cars = await ensure_car_ids(p, providers_col)
            provider = ProviderResponse(
                id=str(p["_id"]),
                user_id=p.get("user_id", None),
                category=p.get("category", "food_drinks"),
                reservation_type=p.get("reservation_type", "table_based"),
                name=p["name"],
                email=p.get("email"),
                phone=p["phone"],
                description=p.get("description"),
                images=p.get("images", []),
                address=p.get("address"),
                latitude=p.get("latitude"),
                longitude=p.get("longitude"),
                facilities=p.get("facilities"),
                cars=cars,
                booking_settings=BookingSettings(**p["booking_settings"]),
                working_hours=[WorkingHours(**wh) for wh in p["working_hours"]],
                status=p["status"]
            )
            result.append(provider)
        except Exception as e:
            print(f"[ERROR] Skipping provider with _id={p.get('_id')} due to error: {e}")
    return result


@router.get("/providers/{provider_id}", response_model=ProviderResponse)
async def get_provider(provider_id: str):
    """Get provider details"""
    providers_col = get_providers_collection()
    
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    cars = await ensure_car_ids(provider, providers_col)
    return ProviderResponse(
        id=str(provider["_id"]),
        user_id=provider.get("user_id", None),
        category=provider.get("category", "food_drinks"),
        name=provider["name"],
        email=provider.get("email"),
        phone=provider["phone"],
        description=provider.get("description"),
        images=provider.get("images", []),
        address=provider.get("address"),
        latitude=provider.get("latitude"),
        longitude=provider.get("longitude"),
        cars=cars,
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
    
    # Log incoming request data for debugging
    print("[DEBUG] Incoming update request:", request.dict())
    
    # Update provider
    update_data = {
        "category": request.category,
        "name": request.name,
        "email": request.email,
        "phone": request.phone,
        "description": request.description,
        "images": request.images,
        "address": request.address,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "facilities": request.facilities or {},  # Default to empty dict if missing
        "cars": normalize_cars(request.cars),
        "booking_settings": request.booking_settings.model_dump(),
        "working_hours": [wh.model_dump() for wh in request.working_hours],
        "updated_at": datetime.utcnow()
    }
    if request.listing_id:
        update_data["listing_id"] = ObjectId(request.listing_id)
    
    # Log update data for debugging
    print("[DEBUG] Update data:", update_data)
    
    await providers_col.update_one(
        {"_id": ObjectId(provider_id)},
        {"$set": update_data}
    )
    
    # Return updated provider
    updated_provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    
    # Log updated provider for debugging
    print("[DEBUG] Updated provider:", updated_provider)
    
    return ProviderResponse(
        id=str(updated_provider["_id"]),
        category=updated_provider.get("category", "food_drinks"),
        name=updated_provider["name"],
        email=updated_provider.get("email"),
        phone=updated_provider["phone"],
        description=updated_provider.get("description"),
        images=updated_provider.get("images", []),
        address=updated_provider.get("address"),
        latitude=updated_provider.get("latitude"),
        longitude=updated_provider.get("longitude"),
        facilities=updated_provider.get("facilities"),
        cars=updated_provider.get("cars", []),
        booking_settings=BookingSettings(**updated_provider["booking_settings"]),
        working_hours=[WorkingHours(**wh) for wh in updated_provider["working_hours"]],
        status=updated_provider["status"]
    )

# =========================
# DELETE PROVIDER ENDPOINT
# =========================
@router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: str, user=Depends(get_current_user)):
    """Delete a provider (only owner can delete)"""
    providers_col = get_providers_collection()
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    # Verifică dacă user-ul curent este owner
    if str(provider.get("user_id")) != str(user["id"]):
        raise HTTPException(status_code=403, detail="Nu ai dreptul să ștergi acest serviciu")
    result = await providers_col.delete_one({"_id": ObjectId(provider_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    return Response(status_code=204)


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
    
    provider_oid = ObjectId(provider_id)
    tables = await tables_col.find(
        {"provider_id": {"$in": [provider_oid, provider_id]}, "status": "active"}
    ).to_list(100)
    
    return [
        TableResponse(
            id=str(t["_id"]),
            provider_id=str(t["provider_id"]),
            name=t["name"],
            seats=t["seats"],
            zone=t.get("zone"),
            special_options=t.get("special_options", []),
            location=t.get("location"),
            status=t["status"]
        )
        for t in tables
    ]


@router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) a table for a provider"""
    providers_col = get_providers_collection()
    tables_col = get_tables_collection()

    if not ObjectId.is_valid(table_id):
        raise HTTPException(status_code=400, detail="Invalid table ID")

    table = await tables_col.find_one({"_id": ObjectId(table_id)})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    provider_id = table.get("provider_id")
    provider_oid = None
    if isinstance(provider_id, ObjectId):
        provider_oid = provider_id
    elif isinstance(provider_id, str) and ObjectId.is_valid(provider_id):
        provider_oid = ObjectId(provider_id)

    provider = await providers_col.find_one({"_id": provider_oid}) if provider_oid else None
    if not provider or str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    await tables_col.update_one(
        {"_id": ObjectId(table_id)},
        {"$set": {"status": "inactive"}}
    )

    return Response(status_code=204)


# ============================================================
# SERVICES & EMPLOYEES ENDPOINTS (appointment-based)

@router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(request: ServiceCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new service for a provider"""
    providers_col = get_providers_collection()
    services_col = get_services_collection()

    if not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")

    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    if request.duration_minutes <= 0 or request.duration_minutes > 240:
        raise HTTPException(status_code=400, detail="Invalid duration")

    service = Service(
        provider_id=PyObjectId(request.provider_id),
        name=request.name,
        duration_minutes=request.duration_minutes,
        price=request.price,
        buffer_minutes=request.buffer_minutes,
        category=request.category,
        status="active"
    )

    result = await services_col.insert_one(service.model_dump(by_alias=True, exclude={"id"}))

    return ServiceResponse(
        id=str(result.inserted_id),
        provider_id=request.provider_id,
        name=service.name,
        duration_minutes=service.duration_minutes,
        price=service.price,
        buffer_minutes=service.buffer_minutes,
        category=service.category,
        status=service.status
    )


@router.get("/services/{provider_id}", response_model=List[ServiceResponse])
async def list_services(provider_id: str):
    """List all services for a provider"""
    services_col = get_services_collection()

    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")

    provider_oid = ObjectId(provider_id)
    services = await services_col.find(
        {"provider_id": {"$in": [provider_oid, provider_id]}, "status": "active"}
    ).to_list(200)

    return [
        ServiceResponse(
            id=str(s["_id"]),
            provider_id=str(s["provider_id"]),
            name=s["name"],
            duration_minutes=s["duration_minutes"],
            price=s["price"],
            buffer_minutes=s.get("buffer_minutes"),
            category=s.get("category"),
            status=s.get("status", "active")
        )
        for s in services
    ]


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, request: ServiceCreateRequest, current_user: dict = Depends(get_current_user)):
    """Update a service"""
    providers_col = get_providers_collection()
    services_col = get_services_collection()

    if not ObjectId.is_valid(service_id) or not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    await services_col.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": {
            "name": request.name,
            "duration_minutes": request.duration_minutes,
            "price": request.price,
            "buffer_minutes": request.buffer_minutes,
            "category": request.category,
            "updated_at": datetime.utcnow()
        }}
    )

    updated = await services_col.find_one({"_id": ObjectId(service_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Service not found")

    return ServiceResponse(
        id=str(updated["_id"]),
        provider_id=str(updated["provider_id"]),
        name=updated["name"],
        duration_minutes=updated["duration_minutes"],
        price=updated["price"],
        buffer_minutes=updated.get("buffer_minutes"),
        category=updated.get("category"),
        status=updated.get("status", "active")
    )


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a service"""
    providers_col = get_providers_collection()
    services_col = get_services_collection()

    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=400, detail="Invalid service ID")

    service = await services_col.find_one({"_id": ObjectId(service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    provider_id = service.get("provider_id")
    provider_oid = provider_id if isinstance(provider_id, ObjectId) else ObjectId(str(provider_id))
    provider = await providers_col.find_one({"_id": provider_oid})
    if not provider or str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    await services_col.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": {"status": "inactive"}}
    )

    return Response(status_code=204)


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(request: EmployeeCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new employee for a provider"""
    providers_col = get_providers_collection()
    services_col = get_services_collection()
    employees_col = get_employees_collection()

    if not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")

    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    valid_service_ids = []
    for service_id in request.service_ids:
        if ObjectId.is_valid(service_id):
            service = await services_col.find_one({
                "_id": ObjectId(service_id),
                "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
                "status": "active"
            })
            if service:
                valid_service_ids.append(PyObjectId(service_id))

    working_hours = request.working_hours or provider.get("working_hours", [])

    employee = Employee(
        provider_id=PyObjectId(request.provider_id),
        name=request.name,
        role=request.role,
        service_ids=valid_service_ids,
        working_hours=working_hours,
        status="active"
    )

    result = await employees_col.insert_one(employee.model_dump(by_alias=True, exclude={"id"}))

    return EmployeeResponse(
        id=str(result.inserted_id),
        provider_id=request.provider_id,
        name=employee.name,
        role=employee.role,
        service_ids=[str(sid) for sid in employee.service_ids],
        working_hours=employee.working_hours,
        status=employee.status
    )


@router.get("/employees/{provider_id}", response_model=List[EmployeeResponse])
async def list_employees(provider_id: str):
    """List all employees for a provider"""
    employees_col = get_employees_collection()

    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")

    provider_oid = ObjectId(provider_id)
    employees = await employees_col.find(
        {"provider_id": {"$in": [provider_oid, provider_id]}, "status": "active"}
    ).to_list(200)

    return [
        EmployeeResponse(
            id=str(e["_id"]),
            provider_id=str(e["provider_id"]),
            name=e["name"],
            role=e.get("role"),
            service_ids=[str(sid) for sid in e.get("service_ids", [])],
            working_hours=[WorkingHours(**wh) if isinstance(wh, dict) else wh for wh in e.get("working_hours", [])],
            status=e.get("status", "active")
        )
        for e in employees
    ]


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, request: EmployeeCreateRequest, current_user: dict = Depends(get_current_user)):
    """Update an employee"""
    providers_col = get_providers_collection()
    services_col = get_services_collection()
    employees_col = get_employees_collection()

    if not ObjectId.is_valid(employee_id) or not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    valid_service_ids = []
    for service_id in request.service_ids:
        if ObjectId.is_valid(service_id):
            service = await services_col.find_one({
                "_id": ObjectId(service_id),
                "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
                "status": "active"
            })
            if service:
                valid_service_ids.append(PyObjectId(service_id))

    await employees_col.update_one(
        {"_id": ObjectId(employee_id)},
        {"$set": {
            "name": request.name,
            "role": request.role,
            "service_ids": valid_service_ids,
            "working_hours": [wh.model_dump() if hasattr(wh, "model_dump") else wh for wh in request.working_hours],
            "updated_at": datetime.utcnow()
        }}
    )

    updated = await employees_col.find_one({"_id": ObjectId(employee_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")

    return EmployeeResponse(
        id=str(updated["_id"]),
        provider_id=str(updated["provider_id"]),
        name=updated["name"],
        role=updated.get("role"),
        service_ids=[str(sid) for sid in updated.get("service_ids", [])],
        working_hours=[WorkingHours(**wh) if isinstance(wh, dict) else wh for wh in updated.get("working_hours", [])],
        status=updated.get("status", "active")
    )


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate an employee"""
    providers_col = get_providers_collection()
    employees_col = get_employees_collection()

    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    employee = await employees_col.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    provider_id = employee.get("provider_id")
    provider_oid = provider_id if isinstance(provider_id, ObjectId) else ObjectId(str(provider_id))
    provider = await providers_col.find_one({"_id": provider_oid})
    if not provider or str(provider.get("user_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this provider")

    await employees_col.update_one(
        {"_id": ObjectId(employee_id)},
        {"$set": {"status": "inactive"}}
    )

    return Response(status_code=204)


# ============================================================
# BOOKING ENDPOINTS
@router.post("/calendar/block", status_code=201)
async def block_provider_day(provider_id: str, date: str, reason: Optional[str] = None, current_user=Depends(get_current_user)):
    """Block a day for a provider (fully booked/closed)"""
    providers_col = get_providers_collection()
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    # Only owner can block
    if provider.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    calendar_blocks_col = get_calendar_blocks_collection()
    block = CalendarBlock(provider_id=provider_id, date=date, reason=reason)
    await calendar_blocks_col.insert_one(block.dict())
    return {"success": True, "blocked": date}
@router.get("/calendar/{provider_id}")
async def get_provider_calendar(provider_id: str):
    """Get blocked/full days for provider calendar"""
    calendar_blocks_col = get_calendar_blocks_collection()
    bookings_col = get_bookings_collection()
    blocks = await calendar_blocks_col.find({"provider_id": provider_id}).to_list(100)
    # Zile blocate explicit
    result = {block["date"]: {"blocked": True, "reason": block.get("reason") or ""} for block in blocks}

    # Zile complet ocupate (full)
    # Pentru simplitate: dacă numărul de rezervări >= numărul de mese, ziua e full
    # (poate fi ajustat pentru sloturi)
    # Obține toate rezervările pentru provider
    bookings = await bookings_col.find({"provider_id": provider_id}).to_list(1000)
    # Grupare pe date
    from collections import Counter
    date_counts = Counter([b["booking_date"] for b in bookings])
    # Obține numărul de mese
    tables_col = get_tables_collection()
    tables = await tables_col.find({"provider_id": ObjectId(provider_id), "status": "active"}).to_list(100)
    num_tables = len(tables)
    for date, count in date_counts.items():
        if count >= num_tables and date not in result:
            result[date] = {"full": True}
    return result
# ============================================================

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(request: BookingCreateRequest, http_request: Request):
    """Create a new booking"""
    providers_col = get_providers_collection()
    tables_col = get_tables_collection()
    bookings_col = get_bookings_collection()

    current_user = await get_optional_user_from_request(http_request)
    
    # Validate provider
    if not ObjectId.is_valid(request.provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(request.provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    booking_type = provider.get("booking_settings", {}).get("type", "table_based")

    if booking_type == "fleet_based":
        if not request.car_id:
            raise HTTPException(status_code=400, detail="Car selection is required")
        if not request.rental_end_date or not request.rental_end_time:
            raise HTTPException(status_code=400, detail="Rental end date/time is required")

        try:
            start_dt = datetime.strptime(f"{request.booking_date} {request.start_time}", "%Y-%m-%d %H:%M")
            end_dt = datetime.strptime(f"{request.rental_end_date} {request.rental_end_time}", "%Y-%m-%d %H:%M")
            start_date = datetime.strptime(request.booking_date, "%Y-%m-%d").date()
            end_date = datetime.strptime(request.rental_end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date/time format")

        if end_dt <= start_dt or end_date < start_date:
            raise HTTPException(status_code=400, detail="Rental end must be after start")

        provider_cars = provider.get("cars", [])
        selected_car = next((car for car in provider_cars if str(car.get("id")) == str(request.car_id)), None)
        if not selected_car:
            raise HTTPException(status_code=404, detail="Car not found")

        if request.delivery_latitude is not None and request.delivery_longitude is not None:
            provider_lat = provider.get("latitude")
            provider_lng = provider.get("longitude")
            if provider_lat is None or provider_lng is None:
                raise HTTPException(status_code=400, detail="Provider location not set for delivery validation")
            radius_km = selected_car.get("delivery_radius_km") or 10.0
            distance_km = haversine_km(
                float(provider_lat),
                float(provider_lng),
                float(request.delivery_latitude),
                float(request.delivery_longitude)
            )
            if distance_km > float(radius_km):
                raise HTTPException(status_code=400, detail="Delivery address outside allowed radius")

        existing_car_bookings = await bookings_col.find({
            "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
            "car_id": str(request.car_id),
            "status": "confirmed"
        }).to_list(1000)

        for booking in existing_car_bookings:
            if not booking.get("rental_end_date"):
                continue
            try:
                existing_start_date = datetime.strptime(booking["booking_date"], "%Y-%m-%d").date()
                existing_end_date = datetime.strptime(booking["rental_end_date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            if existing_start_date <= end_date and start_date <= existing_end_date:
                raise HTTPException(status_code=409, detail="Car already booked for this period")

        end_time = request.rental_end_time
        party_size_value = request.party_size or 1

    elif booking_type == "appointment_based":
        services_col = get_services_collection()
        employees_col = get_employees_collection()

        if not request.service_id or not request.employee_id:
            raise HTTPException(status_code=400, detail="Service and employee are required")

        if not ObjectId.is_valid(request.service_id) or not ObjectId.is_valid(request.employee_id):
            raise HTTPException(status_code=400, detail="Invalid service or employee ID")

        service = await services_col.find_one({
            "_id": ObjectId(request.service_id),
            "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
            "status": "active"
        })
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        employee = await employees_col.find_one({
            "_id": ObjectId(request.employee_id),
            "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
            "status": "active"
        })
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        service_id_str = str(service["_id"])
        employee_services = [str(sid) for sid in employee.get("service_ids", [])]
        if service_id_str not in employee_services:
            raise HTTPException(status_code=400, detail="Employee does not offer this service")

        duration = int(service.get("duration_minutes", 0))
        buffer_minutes = service.get("buffer_minutes")
        if buffer_minutes is None:
            buffer_minutes = provider.get("booking_settings", {}).get("buffer_minutes", 0)

        if duration <= 0 or duration > 240:
            raise HTTPException(status_code=400, detail="Invalid service duration")

        start_dt = datetime.strptime(f"{request.booking_date} {request.start_time}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(minutes=duration)
        end_with_buffer = end_dt + timedelta(minutes=int(buffer_minutes or 0))
        end_time = end_dt.strftime("%H:%M")
        party_size_value = request.party_size or 1

        day_name = start_dt.strftime("%A").lower()
        working_day = next((wh for wh in employee.get("working_hours", []) if wh.get("day") == day_name), None)
        if not working_day or working_day.get("is_closed"):
            raise HTTPException(status_code=400, detail="Employee is not available on this day")

        open_time = datetime.strptime(working_day["open_time"], "%H:%M").time()
        close_time = datetime.strptime(working_day["close_time"], "%H:%M").time()
        if not (open_time <= start_dt.time() and end_dt.time() <= close_time):
            raise HTTPException(status_code=400, detail="Time is outside working hours")

        break_start = working_day.get("break_start")
        break_end = working_day.get("break_end")
        if break_start and break_end:
            break_start_dt = datetime.combine(start_dt.date(), datetime.strptime(break_start, "%H:%M").time())
            break_end_dt = datetime.combine(start_dt.date(), datetime.strptime(break_end, "%H:%M").time())
            if break_start_dt < end_dt and start_dt < break_end_dt:
                raise HTTPException(status_code=400, detail="Time overlaps employee break")

        existing_employee_bookings = await bookings_col.find({
            "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
            "employee_id": {"$in": [ObjectId(request.employee_id), request.employee_id]},
            "booking_date": request.booking_date,
            "status": "confirmed"
        }).to_list(1000)

        for booking in existing_employee_bookings:
            existing_start = datetime.strptime(
                f"{booking['booking_date']} {booking['start_time']}",
                "%Y-%m-%d %H:%M"
            )
            existing_end = datetime.strptime(
                f"{booking['booking_date']} {booking['end_time']}",
                "%Y-%m-%d %H:%M"
            )
            existing_end_with_buffer = existing_end + timedelta(minutes=int(buffer_minutes or 0))
            if existing_start < end_with_buffer and start_dt < existing_end_with_buffer:
                raise HTTPException(status_code=409, detail="Employee already booked for this time")
    else:
        # Calculate end time based on selected duration or provider settings
        duration = request.duration_minutes or provider["booking_settings"]["default_duration_minutes"]
        if duration <= 0 or duration > 180:
            raise HTTPException(status_code=400, detail="Invalid duration")
        start_dt = datetime.strptime(f"{request.booking_date} {request.start_time}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(minutes=duration)
        end_time = end_dt.strftime("%H:%M")
        party_size_value = request.party_size

        # Validate selected table if provided
        if request.table_id:
            if not ObjectId.is_valid(request.table_id):
                raise HTTPException(status_code=400, detail="Invalid table ID")

            table = await tables_col.find_one({
                "_id": ObjectId(request.table_id),
                "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
                "status": "active"
            })
            if not table:
                raise HTTPException(status_code=404, detail="Table not found")

            if table.get("seats", 0) < request.party_size:
                raise HTTPException(status_code=400, detail="Table does not fit party size")

            # Check table availability for the selected time
            existing_table_bookings = await bookings_col.find({
                "provider_id": {"$in": [ObjectId(request.provider_id), request.provider_id]},
                "table_id": {"$in": [ObjectId(request.table_id), request.table_id]},
                "booking_date": request.booking_date,
                "status": "confirmed"
            }).to_list(1000)

            for booking in existing_table_bookings:
                existing_start = datetime.strptime(
                    f"{booking['booking_date']} {booking['start_time']}",
                    "%Y-%m-%d %H:%M"
                )
                existing_end = datetime.strptime(
                    f"{booking['booking_date']} {booking['end_time']}",
                    "%Y-%m-%d %H:%M"
                )
                if start_dt < existing_end and end_dt > existing_start:
                    raise HTTPException(status_code=409, detail="Table already booked for this time")
    
    # TODO: Check availability before confirming
    
    booking = Booking(
        provider_id=PyObjectId(request.provider_id),
        table_id=PyObjectId(request.table_id) if request.table_id else None,
        service_id=PyObjectId(request.service_id) if request.service_id else None,
        employee_id=PyObjectId(request.employee_id) if request.employee_id else None,
        car_id=request.car_id,
        customer_name=request.customer_name,
        customer_email=current_user["email"] if current_user else request.customer_email,
        customer_phone=request.customer_phone,
        user_id=PyObjectId(current_user["id"]) if current_user and current_user.get("id") and ObjectId.is_valid(current_user["id"]) else None,
        booking_date=request.booking_date,
        start_time=request.start_time,
        end_time=end_time,
        rental_end_date=request.rental_end_date,
        rental_end_time=request.rental_end_time,
        party_size=party_size_value,
        party_adults=request.party_adults or 0,
        party_children=request.party_children or 0,
        table_preference=request.table_preference or "fara_preferinta",
        special_occasion=request.special_occasion or "nicio_ocazie",
        notes=request.notes,
        delivery_address=request.delivery_address,
        delivery_latitude=request.delivery_latitude,
        delivery_longitude=request.delivery_longitude,
        status="pending"
    )
    
    result = await bookings_col.insert_one(booking.model_dump(by_alias=True, exclude={"id"}))
    
    # TODO: Send email notification
    
    return BookingResponse(
        id=str(result.inserted_id),
        provider_id=str(booking.provider_id),
        table_id=str(booking.table_id) if booking.table_id else None,
        service_id=str(booking.service_id) if booking.service_id else None,
        employee_id=str(booking.employee_id) if booking.employee_id else None,
        car_id=booking.car_id,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        rental_end_date=booking.rental_end_date,
        rental_end_time=booking.rental_end_time,
        party_size=booking.party_size,
        party_adults=booking.party_adults,
        party_children=booking.party_children,
        table_preference=booking.table_preference,
        special_occasion=booking.special_occasion,
        notes=booking.notes,
        delivery_address=booking.delivery_address,
        delivery_latitude=booking.delivery_latitude,
        delivery_longitude=booking.delivery_longitude,
        status=booking.status,
        created_at=booking.created_at.isoformat()
    )


@router.get("/availability/{provider_id}")
async def check_availability(
    provider_id: str,
    date: str,
    party_size: int,
    start_time: Optional[str] = None,
    duration_minutes: Optional[int] = None,
    service_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    car_id: Optional[str] = None,
    end_date: Optional[str] = None,
    end_time: Optional[str] = None
):
    """Check availability for a specific date and party size"""
    providers_col = get_providers_collection()
    tables_col = get_tables_collection()
    bookings_col = get_bookings_collection()
    services_col = get_services_collection()
    employees_col = get_employees_collection()
    
    if not ObjectId.is_valid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    provider = await providers_col.find_one({"_id": ObjectId(provider_id)})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    booking_type = provider.get("booking_settings", {}).get("type", "table_based")

    if booking_type == "fleet_based":
        if not car_id or not end_date:
            raise HTTPException(status_code=400, detail="Car and end date are required")

        try:
            start_date = datetime.strptime(date, "%Y-%m-%d").date()
            end_date_value = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

        if end_date_value < start_date:
            raise HTTPException(status_code=400, detail="Rental end must be after start")

        existing_car_bookings = await bookings_col.find({
            "provider_id": {"$in": [ObjectId(provider_id), provider_id]},
            "car_id": str(car_id),
            "status": "confirmed"
        }).to_list(1000)

        available = True
        for booking in existing_car_bookings:
            if not booking.get("rental_end_date"):
                continue
            try:
                existing_start = datetime.strptime(booking["booking_date"], "%Y-%m-%d").date()
                existing_end = datetime.strptime(booking["rental_end_date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            if existing_start <= end_date_value and start_date <= existing_end:
                available = False
                break

        return AvailabilityResponse(
            date=date,
            slots=[AvailabilitySlot(time=start_time or "00:00", available=available, tables_available=1 if available else 0)],
            tables=[]
        )

    if booking_type == "appointment_based":
        if not service_id or not employee_id:
            raise HTTPException(status_code=400, detail="Service and employee are required")

        if not ObjectId.is_valid(service_id) or not ObjectId.is_valid(employee_id):
            raise HTTPException(status_code=400, detail="Invalid service or employee ID")

        service = await services_col.find_one({
            "_id": ObjectId(service_id),
            "provider_id": {"$in": [ObjectId(provider_id), provider_id]},
            "status": "active"
        })
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        employee = await employees_col.find_one({
            "_id": ObjectId(employee_id),
            "provider_id": {"$in": [ObjectId(provider_id), provider_id]},
            "status": "active"
        })
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_services = [str(sid) for sid in employee.get("service_ids", [])]
        if str(service["_id"]) not in employee_services:
            raise HTTPException(status_code=400, detail="Employee does not offer this service")

        duration = int(service.get("duration_minutes", 0))
        buffer_minutes = service.get("buffer_minutes")
        if buffer_minutes is None:
            buffer_minutes = provider.get("booking_settings", {}).get("buffer_minutes", 0)

        if duration <= 0 or duration > 240:
            raise HTTPException(status_code=400, detail="Invalid duration")

        date_obj = datetime.strptime(date, "%Y-%m-%d")
        day_name = date_obj.strftime("%A").lower()
        working_day = next((wh for wh in employee.get("working_hours", []) if wh.get("day") == day_name), None)
        if not working_day or working_day.get("is_closed"):
            return AvailabilityResponse(date=date, slots=[], tables=[])

        open_time = datetime.strptime(working_day["open_time"], "%H:%M")
        close_time = datetime.strptime(working_day["close_time"], "%H:%M")

        break_start = working_day.get("break_start")
        break_end = working_day.get("break_end")
        break_start_dt = None
        break_end_dt = None
        if break_start and break_end:
            break_start_dt = datetime.combine(date_obj.date(), datetime.strptime(break_start, "%H:%M").time())
            break_end_dt = datetime.combine(date_obj.date(), datetime.strptime(break_end, "%H:%M").time())

        existing_bookings = await bookings_col.find({
            "provider_id": {"$in": [ObjectId(provider_id), provider_id]},
            "employee_id": {"$in": [ObjectId(employee_id), employee_id]},
            "booking_date": date,
            "status": "confirmed"
        }).to_list(1000)

        def is_employee_free(slot_start_dt: datetime, slot_end_dt: datetime) -> bool:
            slot_end_with_buffer = slot_end_dt + timedelta(minutes=int(buffer_minutes or 0))
            if break_start_dt and break_end_dt:
                if break_start_dt < slot_end_dt and slot_start_dt < break_end_dt:
                    return False
            for booking in existing_bookings:
                existing_start = datetime.strptime(
                    f"{booking['booking_date']} {booking['start_time']}",
                    "%Y-%m-%d %H:%M"
                )
                existing_end = datetime.strptime(
                    f"{booking['booking_date']} {booking['end_time']}",
                    "%Y-%m-%d %H:%M"
                )
                existing_end_with_buffer = existing_end + timedelta(minutes=int(buffer_minutes or 0))
                if existing_start < slot_end_with_buffer and slot_start_dt < existing_end_with_buffer:
                    return False
            return True

        slots = []
        step_minutes = duration
        current_time = open_time
        while current_time + timedelta(minutes=duration) <= close_time:
            slot_start_dt = datetime.combine(date_obj.date(), current_time.time())
            slot_end_dt = slot_start_dt + timedelta(minutes=duration)
            available = is_employee_free(slot_start_dt, slot_end_dt)
            slot_label = current_time.strftime("%H:%M")
            if start_time and slot_label != start_time:
                current_time += timedelta(minutes=step_minutes)
                continue
            slots.append(AvailabilitySlot(
                time=slot_label,
                available=available,
                tables_available=1 if available else 0
            ))
            current_time += timedelta(minutes=step_minutes)

        return AvailabilityResponse(date=date, slots=slots, tables=[])
    
    # Get all tables that can accommodate party size
    # Accept both ObjectId and string-stored provider_id values to be robust
    tables = await tables_col.find({
        "provider_id": {"$in": [ObjectId(provider_id), provider_id]},
        "seats": {"$gte": party_size},
        "status": "active"
    }).to_list(100)
    
    if not tables:
        return AvailabilityResponse(date=date, slots=[])
    
    # Get existing bookings for that date
    # Fetch bookings for that provider/date (support both ObjectId and string ids)
    existing_bookings = await bookings_col.find({
        "provider_id": {"$in": [ObjectId(provider_id), provider_id]},
        "booking_date": date,
        "status": "confirmed"
    }).to_list(1000)
    
    # Generate time slots (simplified - every 30 minutes)
    slots = []
    table_availability = []
    settings = provider["booking_settings"]
    slot_duration = duration_minutes or settings["default_duration_minutes"]
    if slot_duration <= 0 or slot_duration > 180:
        raise HTTPException(status_code=400, detail="Invalid duration")
    
    # Get working hours for the day
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day_name = date_obj.strftime("%A").lower()
    
    working_day = next((wh for wh in provider["working_hours"] if wh["day"] == day_name), None)
    
    if not working_day or working_day.get("is_closed"):
        return AvailabilityResponse(date=date, slots=[])
    
    # Generate slots from open to close time
    open_time = datetime.strptime(working_day["open_time"], "%H:%M")
    close_time = datetime.strptime(working_day["close_time"], "%H:%M")
    
    def is_table_free(table_id: str, slot_start_dt: datetime, slot_end_dt: datetime) -> bool:
        for booking in existing_bookings:
            if str(booking.get("table_id")) != str(table_id):
                continue
            booking_start = datetime.strptime(booking["start_time"], "%H:%M")
            booking_end = datetime.strptime(booking["end_time"], "%H:%M")
            booking_date_obj = datetime.strptime(booking["booking_date"], "%Y-%m-%d")
            booking_start_dt = datetime.combine(booking_date_obj.date(), booking_start.time())
            booking_end_dt = datetime.combine(booking_date_obj.date(), booking_end.time())
            if booking_start_dt < slot_end_dt and slot_start_dt < booking_end_dt:
                return False
        return True

    if start_time:
        try:
            start_time_dt = datetime.strptime(start_time, "%H:%M")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format")

        slot_start_dt = datetime.combine(date_obj.date(), start_time_dt.time())
        slot_end_dt = slot_start_dt + timedelta(minutes=slot_duration)
        if slot_start_dt < datetime.combine(date_obj.date(), open_time.time()) or slot_end_dt > datetime.combine(date_obj.date(), close_time.time()):
            return AvailabilityResponse(date=date, slots=[], tables=[])

        available_count = 0
        for table in tables:
            if is_table_free(str(table["_id"]), slot_start_dt, slot_end_dt):
                available_count += 1

        slots.append(AvailabilitySlot(
            time=start_time,
            available=available_count > 0,
            tables_available=available_count
        ))

        for table in tables:
            available_slots = []
            if is_table_free(str(table["_id"]), slot_start_dt, slot_end_dt):
                available_slots.append(start_time)

            table_availability.append(TableAvailability(
                id=str(table["_id"]),
                name=table["name"],
                seats=table["seats"],
                zone=table.get("zone"),
                special_options=table.get("special_options", []),
                location=table.get("location"),
                available_slots=available_slots
            ))

        return AvailabilityResponse(date=date, slots=slots, tables=table_availability)

    current_time = open_time
    while current_time < close_time:
        time_str = current_time.strftime("%H:%M")
        slot_start = current_time
        slot_end = current_time + timedelta(minutes=slot_duration)

        # Check how many tables are available at this time
        available_count = 0
        for table in tables:
            slot_start_dt = datetime.combine(date_obj.date(), slot_start.time())
            slot_end_dt = datetime.combine(date_obj.date(), slot_end.time())
            if is_table_free(str(table["_id"]), slot_start_dt, slot_end_dt):
                available_count += 1

        slots.append(AvailabilitySlot(
            time=time_str,
            available=available_count > 0,
            tables_available=available_count
        ))

        current_time += timedelta(minutes=30)

    # Build per-table availability
    for table in tables:
        available_slots = []
        current_time = open_time
        while current_time < close_time:
            slot_start = current_time
            slot_end = current_time + timedelta(minutes=slot_duration)
            slot_start_dt = datetime.combine(date_obj.date(), slot_start.time())
            slot_end_dt = datetime.combine(date_obj.date(), slot_end.time())
            if is_table_free(str(table["_id"]), slot_start_dt, slot_end_dt):
                available_slots.append(current_time.strftime("%H:%M"))
            current_time += timedelta(minutes=30)

        table_availability.append(TableAvailability(
            id=str(table["_id"]),
            name=table["name"],
            seats=table["seats"],
            zone=table.get("zone"),
            special_options=table.get("special_options", []),
            location=table.get("location"),
            available_slots=available_slots
        ))

    return AvailabilityResponse(date=date, slots=slots, tables=table_availability)


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
        service_id=str(booking.get("service_id")) if booking.get("service_id") else None,
        employee_id=str(booking.get("employee_id")) if booking.get("employee_id") else None,
        car_id=booking.get("car_id"),
        customer_name=booking["customer_name"],
        customer_email=booking["customer_email"],
        customer_phone=booking["customer_phone"],
        booking_date=booking["booking_date"],
        start_time=booking["start_time"],
        end_time=booking["end_time"],
        rental_end_date=booking.get("rental_end_date"),
        rental_end_time=booking.get("rental_end_time"),
        party_size=booking["party_size"],
        notes=booking.get("notes"),
        delivery_address=booking.get("delivery_address"),
        delivery_latitude=booking.get("delivery_latitude"),
        delivery_longitude=booking.get("delivery_longitude"),
        status=booking["status"],
        created_at=booking["created_at"].isoformat()
    )


@router.delete("/{booking_id}")
async def cancel_booking(booking_id: str, current_user=Depends(get_current_user)):
    """Cancel a booking (customer only, not on the same day)"""
    bookings_col = get_bookings_collection()

    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking ID")

    booking = await bookings_col.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("customer_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    try:
        booking_date = datetime.strptime(booking["booking_date"], "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid booking date")

    if booking_date == datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="Cannot cancel booking on the same day")

    if booking.get("status") == "canceled":
        return {"message": "Booking already canceled"}

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
