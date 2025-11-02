"""
GPS Module - Location Detection & Matching
Detects user location and matches with landmarks from coordinates.json
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import math
from pathlib import Path

router = APIRouter()

class GPSCoordinate(BaseModel):
    """GPS coordinate model"""
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class LandmarkResponse(BaseModel):
    """Landmark information response"""
    id: int
    name: str
    name_en: str
    distance_meters: float
    category: str
    description: str
    in_range: bool

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula
    Returns distance in meters
    """
    R = 6371000  # Earth radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def load_landmarks():
    """Load landmarks from coordinates.json"""
    coords_path = Path(__file__).parent.parent / "data" / "coordinates.json"
    with open(coords_path, 'r', encoding='utf-8') as f:
        return json.load(f)

@router.post("/check", response_model=List[LandmarkResponse])
async def check_location(gps: GPSCoordinate):
    """
    Check if user is near any landmark
    Returns all landmarks with distance, sorted by proximity
    """
    try:
        landmarks = load_landmarks()
        results = []
        
        for landmark in landmarks:
            distance = haversine_distance(
                gps.latitude, gps.longitude,
                landmark['latitude'], landmark['longitude']
            )
            
            in_range = distance <= landmark['radius_meters']
            
            results.append(LandmarkResponse(
                id=landmark['id'],
                name=landmark['name'],
                name_en=landmark['name_en'],
                distance_meters=round(distance, 2),
                category=landmark['category'],
                description=landmark['description'],
                in_range=in_range
            ))
        
        # Sort by distance
        results.sort(key=lambda x: x.distance_meters)
        
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GPS check failed: {str(e)}")

@router.get("/landmarks")
async def get_all_landmarks():
    """Get all available landmarks"""
    try:
        landmarks = load_landmarks()
        return {
            "total": len(landmarks),
            "landmarks": landmarks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load landmarks: {str(e)}")

@router.get("/landmark/{landmark_id}")
async def get_landmark_details(landmark_id: int):
    """Get detailed information about a specific landmark"""
    try:
        landmarks = load_landmarks()
        landmark = next((l for l in landmarks if l['id'] == landmark_id), None)
        
        if not landmark:
            raise HTTPException(status_code=404, detail="Landmark not found")
        
        return landmark
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get landmark: {str(e)}")
