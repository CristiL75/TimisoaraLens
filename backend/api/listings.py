"""
Listings Module - Hotel/Apartment Listings Management
Allows users to create, update, and manage property listings
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from database_mongo import get_database
from api.auth import get_current_user

router = APIRouter()

class Location(BaseModel):
    """Location model for listing"""
    latitude: float
    longitude: float
    address: str
    city: str = "Timișoara"
    country: str = "Romania"

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

class ImageUrls(BaseModel):
    """Model for adding images"""
    image_urls: List[str]

def serialize_listing(listing):
    """Convert MongoDB document to JSON-serializable dict"""
    if listing:
        listing['id'] = str(listing['_id'])
        del listing['_id']
    return listing

def serialize_listings(listings):
    """Convert list of MongoDB documents to JSON-serializable list"""
    return [serialize_listing(listing) for listing in listings]

@router.post("/create")
async def create_listing(
    listing_data: ListingCreate, 
    current_user: dict = Depends(get_current_user),
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
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "status": "active"
        }
        
        # Insert into MongoDB
        result = await db.listings.insert_one(new_listing)
        new_listing['_id'] = result.inserted_id
        
        return {
            "success": True,
            "listing": serialize_listing(new_listing),
            "message": "Listing created successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create listing: {str(e)}")

@router.get("/all")
async def get_all_listings(status: Optional[str] = "active", db = Depends(get_database)):
    """
    Get all listings from MongoDB, optionally filtered by status
    """
    try:
        # Build filter
        filter_query = {}
        if status:
            filter_query['status'] = status
        
        # Query MongoDB
        cursor = db.listings.find(filter_query)
        listings = await cursor.to_list(length=None)
        
        return {
            "total": len(listings),
            "listings": serialize_listings(listings)
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
        
        # Add is_owner flag
        serialized_listing = serialize_listing(listing)
        serialized_listing['is_owner'] = (listing.get('user_id') == user_id)
        
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
        
        return {
            "success": True,
            "listing": serialize_listing(updated_listing),
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
