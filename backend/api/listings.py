"""
Listings Module - Hotel/Apartment Listings Management
Allows users to create, update, and manage property listings
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from database_mongo import get_database
from api.auth import get_current_user
import json
import os
import math
import httpx
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

RAG_BASE_URL = os.getenv("RAG_BASE_URL", "").strip()
if not RAG_BASE_URL:
    RAG_BASE_URL = os.getenv("HF_RAG_SPACE_URL", "").strip()


async def _notify_rag_upsert(listing: dict) -> None:
    if not RAG_BASE_URL:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{RAG_BASE_URL}/rag/apartments/upsert", json={"listing": listing})
    except Exception as e:
        logger.warning("[LISTINGS] RAG upsert failed: %s", e)


async def _notify_rag_delete(listing_id: str) -> None:
    if not RAG_BASE_URL:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{RAG_BASE_URL}/rag/apartments/delete", json={"listing_id": listing_id})
    except Exception as e:
        logger.warning("[LISTINGS] RAG delete failed: %s", e)


async def _backfill_listings(db, status: Optional[str] = "active", limit: Optional[int] = None) -> int:
    if not RAG_BASE_URL:
        return 0
    query = {}
    if status:
        query["status"] = status
    cursor = db.listings.find(query)
    if limit:
        cursor = cursor.limit(limit)
    count = 0
    async for listing in cursor:
        listing_payload = serialize_listing(listing)
        await _notify_rag_upsert(listing_payload)
        count += 1
    return count

class Location(BaseModel):
    """Location model for listing"""
    latitude: float
    longitude: float
    address: str
    city: str = "Timișoara"
    country: str = "Romania"

class POI(BaseModel):
    """Point of Interest model"""
    name: str
    category: str = "restaurant"  # cafe, restaurant, bar, museum, etc.
    latitude: float
    longitude: float
    address: Optional[str] = None
    description: Optional[str] = None  # Short description about the place
    distance_km: Optional[float] = None

class SuggestedRoute(BaseModel):
    """Suggested tourist route for listing"""
    title: str = "Traseu Turistic"
    description: Optional[str] = None
    poi_ids: List[str] = []  # List of POI names/IDs
    pois: List[POI] = []  # Actual POI objects
    total_distance_km: Optional[float] = None
    estimated_time_hours: Optional[float] = None
    places: Optional[List[dict]] = None  # Places from frontend (name, latitude, longitude)

class Listing(BaseModel):
    """Property listing model"""
    id: Optional[str] = None
    user_id: str
    title: str
    description: str
    property_type: str  # apartment, house, studio, etc.
    location: Location
    images: List[str] = []  # URLs to images
    price_per_night: float
    max_guests: int
    bedrooms: int
    bathrooms: int
    amenities: List[str] = []  # wifi, parking, kitchen, etc.
    suggested_route: Optional[SuggestedRoute] = None  # Tourist route suggestion
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    status: str = "active"  # active, inactive, pending

class ListingCreate(BaseModel):
    """Model for creating a listing"""
    title: str
    description: str
    property_type: str
    latitude: float
    longitude: float
    address: str
    price_per_night: float
    max_guests: int
    bedrooms: int
    bathrooms: int
    amenities: List[str] = []
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    suggested_route: Optional[SuggestedRoute] = None

class ImageUrls(BaseModel):
    """Model for adding images"""
    image_urls: List[str]

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None


def _serialize_review(r):
    if not r:
        return r
    out = r.copy()
    if out.get('_id'):
        try:
            out['id'] = str(out['_id'])
            del out['_id']
        except Exception:
            pass
    return out

def serialize_listing(listing):
    """Convert MongoDB document to JSON-serializable dict"""
    if listing:
        listing['id'] = str(listing['_id'])
        del listing['_id']
        # serialize reviews ids if present
        if listing.get('reviews') and isinstance(listing.get('reviews'), list):
            for r in listing['reviews']:
                if r and isinstance(r, dict) and r.get('_id'):
                    try:
                        r['id'] = str(r['_id'])
                        del r['_id']
                    except Exception:
                        pass
    return listing

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km using Haversine formula"""
    R = 6371  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def _load_poi_data(category: str) -> List[dict]:
    """Load POI data from JSON files"""
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    # Map category to file name
    category_map = {
        'cafe': 'osm_cafes.json',
        'restaurant': 'osm_bars_pubs.json',  # Using bars/pubs as restaurants for now
        'entertainment': 'osm_entertainment.json',
        'shop': 'osm_shops.json',
        'religious': 'osm_religious.json'
    }
    
    filename = category_map.get(category, f'osm_{category}.json')
    filepath = os.path.join(data_dir, filename)
    
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {str(e)}")
    
    return []

def serialize_listings(listings):
    """Convert list of MongoDB documents to JSON-serializable list"""
    return [serialize_listing(listing) for listing in listings]

@router.post("/create")
async def create_listing(
    listing_data: ListingCreate, 
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
    db = Depends(get_database)
):
    """
    Create a new property listing in MongoDB
    """
    try:
        # Get user_id from authenticated user
        user_id = current_user.get("user_id") or current_user.get("id")
        username = current_user.get("username") or current_user.get("email", "Unknown")
        
        # Create listing document
        new_listing = {
            "user_id": user_id,
            "owner": {
                "user_id": user_id,
                "username": username,
                "contact_name": listing_data.contact_name,
                "contact_phone": listing_data.contact_phone,
                "contact_email": listing_data.contact_email
            },
            "title": listing_data.title,
            "description": listing_data.description,
            "property_type": listing_data.property_type,
            "location": {
                "latitude": listing_data.latitude,
                "longitude": listing_data.longitude,
                "address": listing_data.address,
                "city": "Timișoara",
                "country": "Romania"
            },
            # GeoJSON point for geospatial queries
            "location_geo": {
                "type": "Point",
                "coordinates": [listing_data.longitude, listing_data.latitude]
            },
            "images": [],
            "price_per_night": listing_data.price_per_night,
            "max_guests": listing_data.max_guests,
            "bedrooms": listing_data.bedrooms,
            "bathrooms": listing_data.bathrooms,
            "amenities": listing_data.amenities,
            "suggested_route": listing_data.suggested_route.dict() if listing_data.suggested_route else None,
            "reviews": [],
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "status": "active"
        }
        
        # Insert into MongoDB
        result = await db.listings.insert_one(new_listing)
        new_listing['_id'] = result.inserted_id
        
        listing_payload = serialize_listing(new_listing)
        if background_tasks:
            background_tasks.add_task(_notify_rag_upsert, listing_payload)

        return {
            "success": True,
            "listing": listing_payload,
            "message": "Listing created successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create listing: {str(e)}")

@router.post("/rag/backfill")
async def backfill_listings_to_rag(
    status: Optional[str] = "active",
    limit: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
    db = Depends(get_database)
):
    """
    Backfill existing listings into RAG (HF Space -> Qdrant).
    """
    if not RAG_BASE_URL:
        raise HTTPException(status_code=400, detail="RAG_BASE_URL/HF_RAG_SPACE_URL not configured")
    if not background_tasks:
        # Fallback to sync if background task manager is not available
        count = await _backfill_listings(db, status=status, limit=limit)
        return {"success": True, "count": count}

    background_tasks.add_task(_backfill_listings, db, status, limit)
    return {"success": True, "message": "Backfill started"}


@router.get("/all")
async def get_all_listings(
    status: Optional[str] = "active",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_bedrooms: Optional[int] = None,
    min_guests: Optional[int] = None,
    property_type: Optional[str] = None,
    amenities: Optional[List[str]] = Query(None),
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    db = Depends(get_database)
):
    """
    Get all listings from MongoDB with optional filters
    
    Filters:
    - status: active, inactive, pending
    - min_price: minimum price per night
    - max_price: maximum price per night
    - min_bedrooms: minimum number of bedrooms
    - min_guests: minimum capacity (max_guests)
    - property_type: apartment, house, studio, villa, room
    - amenities: list of required amenities (e.g., WiFi, AC, Parking)
    - latitude, longitude, radius_km: proximity search (all 3 required)
    """
    try:
        # Log incoming parameters for debugging
        print(f"[LISTINGS] Filtering with ALL params:")
        print(f"  - status={status}")
        print(f"  - price: {min_price} to {max_price}")
        print(f"  - bedrooms: min={min_bedrooms}")
        print(f"  - guests: min={min_guests}")
        print(f"  - property_type={property_type}")
        print(f"  - amenities={amenities}")
        print(f"  - proximity: lat={latitude}, lng={longitude}, radius={radius_km}")
        
        # Build filter query
        filter_query = {}
        
        if status:
            filter_query['status'] = status
        
        if min_price is not None:
            filter_query['price_per_night'] = filter_query.get('price_per_night', {})
            filter_query['price_per_night']['$gte'] = min_price
        
        if max_price is not None:
            filter_query['price_per_night'] = filter_query.get('price_per_night', {})
            filter_query['price_per_night']['$lte'] = max_price
        
        if min_bedrooms is not None:
            filter_query['bedrooms'] = {'$gte': min_bedrooms}
        
        if min_guests is not None:
            filter_query['max_guests'] = {'$gte': min_guests}
        
        if property_type:
            filter_query['property_type'] = property_type
        
        if amenities and len(amenities) > 0:
            # Filter listings that have ALL specified amenities
            filter_query['amenities'] = {'$all': amenities}
        
        # Proximity search using MongoDB geospatial query
        if latitude is not None and longitude is not None and radius_km is not None:
            # Convert km to meters (MongoDB uses meters)
            radius_meters = radius_km * 1000
            print(f"[LISTINGS] Applying proximity filter: center=({latitude}, {longitude}), radius={radius_km}km ({radius_meters}m)")
            
            # GeoJSON Point for the search center
            filter_query['location_geo'] = {
                '$near': {
                    '$geometry': {
                        'type': 'Point',
                        'coordinates': [longitude, latitude]  # [lng, lat] order for GeoJSON
                    },
                    '$maxDistance': radius_meters
                }
            }
        
        # Query MongoDB
        print(f"[LISTINGS] Executing query with filter: {filter_query}")
        cursor = db.listings.find(filter_query)
        listings = await cursor.to_list(length=None)
        print(f"[LISTINGS] Found {len(listings)} listings (pre-fallback)")

        # In-memory fallback filtering to enforce correctness even if DB query misses constraints
        # (e.g., due to older deployments or inconsistent field types). This keeps behavior robust.
        initial_count = len(listings)
        if any([
            min_price is not None,
            max_price is not None,
            min_bedrooms is not None,
            min_guests is not None,
            property_type is not None,
            amenities is not None and len(amenities) > 0,
        ]):
            def has_all_amenities(item_amenities, required):
                try:
                    if not required:
                        return True
                    item_set = set([str(a).lower() for a in (item_amenities or [])])
                    req_set = set([str(a).lower() for a in required])
                    return req_set.issubset(item_set)
                except Exception:
                    return False

            filtered = []
            for it in listings:
                try:
                    price = it.get('price_per_night')
                    beds = it.get('bedrooms')
                    guests = it.get('max_guests')
                    ptype = it.get('property_type')
                    ams = it.get('amenities')

                    if min_price is not None:
                        try:
                            if float(price) < float(min_price):
                                continue
                        except Exception:
                            continue
                    if max_price is not None:
                        try:
                            if float(price) > float(max_price):
                                continue
                        except Exception:
                            continue
                    if min_bedrooms is not None:
                        try:
                            if int(beds) < int(min_bedrooms):
                                continue
                        except Exception:
                            continue
                    if min_guests is not None:
                        try:
                            if int(guests) < int(min_guests):
                                continue
                        except Exception:
                            continue
                    if property_type is not None and property_type != '':
                        if str(ptype).lower() != str(property_type).lower():
                            continue
                    if amenities and len(amenities) > 0:
                        if not has_all_amenities(ams, amenities):
                            continue
                    filtered.append(it)
                except Exception:
                    # skip malformed items
                    continue

            listings = filtered
            print(f"[LISTINGS] Applied in-memory fallback filters: {initial_count} -> {len(listings)}")
        
        # Calculate distance for each listing if proximity search is used
        if latitude is not None and longitude is not None:
            for listing in listings:
                if listing.get('location'):
                    listing_lat = listing['location'].get('latitude')
                    listing_lng = listing['location'].get('longitude')
                    if listing_lat and listing_lng:
                        distance = _haversine_distance(latitude, longitude, listing_lat, listing_lng)
                        listing['distance_km'] = round(distance, 2)
        
        return {
            "total": len(listings),
            "listings": serialize_listings(listings),
            "filters_applied": {
                "status": status,
                "min_price": min_price,
                "max_price": max_price,
                "min_bedrooms": min_bedrooms,
                "min_guests": min_guests,
                "property_type": property_type,
                "amenities": amenities,
                "proximity": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius_km": radius_km
                } if latitude and longitude and radius_km else None
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load listings: {str(e)}")

@router.get("/{listing_id}")
async def get_listing(
    listing_id: str, 
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get a specific listing by ID from MongoDB
    """
    try:
        # Get user_id from authenticated user
        user_id = current_user.get("user_id") or current_user.get("id")
        
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")
        
        # Query MongoDB
        listing = await db.listings.find_one({"_id": obj_id})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Add is_owner flag and compute average rating
        serialized_listing = serialize_listing(listing)
        serialized_listing['is_owner'] = (listing.get('user_id') == user_id)
        # Compute average rating if reviews exist
        reviews = listing.get('reviews', []) or []
        if reviews:
            try:
                avg = sum([r.get('rating', 0) for r in reviews]) / len(reviews)
                serialized_listing['average_rating'] = round(avg, 2)
                serialized_listing['reviews_count'] = len(reviews)
            except Exception:
                serialized_listing['average_rating'] = None
                serialized_listing['reviews_count'] = 0
        else:
            serialized_listing['average_rating'] = None
            serialized_listing['reviews_count'] = 0

        return serialized_listing
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load listing: {str(e)}")

@router.get("/user/{user_id}")
async def get_user_listings(user_id: str, db = Depends(get_database)):
    """
    Get all listings for a specific user from MongoDB
    """
    try:
        # Query MongoDB for user's listings
        cursor = db.listings.find({"user_id": user_id})
        user_listings = await cursor.to_list(length=None)
        
        return {
            "total": len(user_listings),
            "listings": serialize_listings(user_listings)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load user listings: {str(e)}")

@router.put("/{listing_id}")
async def update_listing(
    listing_id: str, 
    listing_data: ListingCreate, 
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
    db = Depends(get_database)
):
    """
    Update an existing listing in MongoDB
    """
    try:
        # Get user_id from authenticated user
        user_id = current_user.get("user_id") or current_user.get("id")
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")
        
        # Find listing
        listing = await db.listings.find_one({"_id": obj_id})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Verify ownership
        if listing['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this listing")
        
        # Update document
        update_data = {
            "title": listing_data.title,
            "description": listing_data.description,
            "property_type": listing_data.property_type,
            "location": {
                "latitude": listing_data.latitude,
                "longitude": listing_data.longitude,
                "address": listing_data.address,
                "city": "Timișoara",
                "country": "Romania"
            },
            "location_geo": {
                "type": "Point",
                "coordinates": [listing_data.longitude, listing_data.latitude]
            },
            "price_per_night": listing_data.price_per_night,
            "max_guests": listing_data.max_guests,
            "bedrooms": listing_data.bedrooms,
            "bathrooms": listing_data.bathrooms,
            "amenities": listing_data.amenities,
            "updated_at": datetime.now()
        }
        
        # Update in MongoDB
        await db.listings.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        
        # Fetch updated listing
        updated_listing = await db.listings.find_one({"_id": obj_id})
        
        listing_payload = serialize_listing(updated_listing)
        if background_tasks:
            background_tasks.add_task(_notify_rag_upsert, listing_payload)

        return {
            "success": True,
            "listing": listing_payload,
            "message": "Listing updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update listing: {str(e)}")

@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: str, 
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
    db = Depends(get_database)
):
    """
    Delete a listing (soft delete by changing status to inactive) in MongoDB
    """
    try:
        # Get user_id from authenticated user
        user_id = current_user.get("user_id") or current_user.get("id")
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")
        
        # Find listing
        listing = await db.listings.find_one({"_id": obj_id})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Verify ownership
        if listing['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
        
        # Hard delete - remove from database completely
        result = await db.listings.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete listing")

        if background_tasks:
            background_tasks.add_task(_notify_rag_delete, listing_id)
        
        return {
            "success": True,
            "message": "Listing deleted permanently"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete listing: {str(e)}")

@router.post("/{listing_id}/images")
async def add_listing_images(
    listing_id: str, 
    images: ImageUrls,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Add images to a listing in MongoDB (appends to existing)
    """
    try:
        # Get user_id from authenticated user
        user_id = current_user.get("user_id") or current_user.get("id")
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")
        
        # Find listing
        listing = await db.listings.find_one({"_id": obj_id})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Verify ownership
        if listing['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this listing")
        
        # Add images to existing array
        await db.listings.update_one(
            {"_id": obj_id},
            {
                "$push": {"images": {"$each": images.image_urls}},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        # Fetch updated listing
        updated_listing = await db.listings.find_one({"_id": obj_id})
        
        return {
            "success": True,
            "images": updated_listing.get('images', []),
            "message": "Images added successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add images: {str(e)}")

@router.put("/{listing_id}/images")
async def update_listing_images(
    listing_id: str, 
    images: ImageUrls,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Replace all images for a listing in MongoDB
    """
    try:
        # Get user_id from authenticated user
        user_id = current_user.get("user_id") or current_user.get("id")
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")
        
        # Find listing
        listing = await db.listings.find_one({"_id": obj_id})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Verify ownership
        if listing['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this listing")
        
        # Replace images array completely
        await db.listings.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "images": images.image_urls,
                    "updated_at": datetime.now()
                }
            }
        )
        
        # Fetch updated listing
        updated_listing = await db.listings.find_one({"_id": obj_id})
        
        return {
            "success": True,
            "images": updated_listing.get('images', []),
            "message": "Images updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update images: {str(e)}")


@router.post("/{listing_id}/reviews")
async def add_review(
    listing_id: str,
    review: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Add a review to a listing"""
    try:
        user_id = current_user.get('user_id') or current_user.get('id')
        username = current_user.get('username') or current_user.get('email', 'Unknown')

        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = await db.listings.find_one({'_id': obj_id})
        if not listing:
            raise HTTPException(status_code=404, detail='Listing not found')

        # Validate rating
        if not isinstance(review.rating, int) or review.rating < 1 or review.rating > 5:
            raise HTTPException(status_code=400, detail='Rating must be an integer between 1 and 5')

        review_doc = {
            '_id': ObjectId(),
            'user_id': user_id,
            'username': username,
            'rating': int(review.rating),
            'comment': review.comment,
            'created_at': datetime.now()
        }

        await db.listings.update_one({'_id': obj_id}, {'$push': {'reviews': review_doc}, '$set': {'updated_at': datetime.now()}})

        updated = await db.listings.find_one({'_id': obj_id})
        return {
            'success': True,
            'review': _serialize_review(review_doc),
            'reviews_count': len(updated.get('reviews', []))
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to add review: {str(e)}')


@router.get("/{listing_id}/reviews")
async def get_reviews(listing_id: str, db = Depends(get_database)):
    """Return reviews for a listing with average rating"""
    try:
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = await db.listings.find_one({'_id': obj_id})
        if not listing:
            raise HTTPException(status_code=404, detail='Listing not found')

        reviews = listing.get('reviews', []) or []
        serialized = [_serialize_review(r) for r in reviews]
        avg = None
        if reviews:
            try:
                avg = round(sum([r.get('rating', 0) for r in reviews]) / len(reviews), 2)
            except Exception:
                avg = None

        return {
            'total': len(serialized),
            'average_rating': avg,
            'reviews': serialized
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to load reviews: {str(e)}')


@router.delete("/{listing_id}/reviews/{review_id}")
async def delete_review(listing_id: str, review_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    """Delete a review if the user is the review author or the listing owner"""
    try:
        user_id = current_user.get('user_id') or current_user.get('id')
        try:
            obj_id = ObjectId(listing_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = await db.listings.find_one({'_id': obj_id})
        if not listing:
            raise HTTPException(status_code=404, detail='Listing not found')

        reviews = listing.get('reviews', []) or []
        # find review
        target = None
        for r in reviews:
            rid = str(r.get('_id')) if r.get('_id') else r.get('id')
            if rid == review_id:
                target = r
                break

        if not target:
            raise HTTPException(status_code=404, detail='Review not found')

        # allow deletion if review author or listing owner
        if target.get('user_id') != user_id and listing.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail='Not authorized to delete this review')

        # remove review by matching _id
        await db.listings.update_one({'_id': obj_id}, {'$pull': {'reviews': {'_id': ObjectId(target.get('_id'))}}, '$set': {'updated_at': datetime.now()}})

        return {'success': True, 'message': 'Review deleted'}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to delete review: {str(e)}')
