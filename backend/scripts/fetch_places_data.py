"""
Script to fetch places data from Google Places API for Timișoara landmarks
Usage: python fetch_places_data.py
"""
import os
import json
import time
import requests
from pathlib import Path

# Google Places API Configuration
GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY', 'YOUR_API_KEY_HERE')
PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place'

# Timișoara center coordinates
TIMISOARA_CENTER = {
    'lat': 45.7489,
    'lng': 21.2087
}

# Categories to search for
PLACE_TYPES = [
    'tourist_attraction',
    'museum',
    'church',
    'synagogue',
    'park',
    'art_gallery',
    'point_of_interest'
]

def search_nearby_places(location, radius=3000, place_type=None):
    """
    Search for places near a location using Google Places Nearby Search
    
    Args:
        location: Dict with 'lat' and 'lng'
        radius: Search radius in meters (default 3km)
        place_type: Type of place to search for
    
    Returns:
        List of places
    """
    url = f'{PLACES_API_URL}/nearbysearch/json'
    params = {
        'location': f"{location['lat']},{location['lng']}",
        'radius': radius,
        'key': GOOGLE_PLACES_API_KEY,
        'language': 'ro'  # Romanian results
    }
    
    if place_type:
        params['type'] = place_type
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] == 'OK':
            return data.get('results', [])
        else:
            print(f"⚠️ API Error: {data['status']}")
            return []
    
    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
        return []

def get_place_details(place_id):
    """
    Get detailed information about a place
    
    Args:
        place_id: Google Places ID
    
    Returns:
        Dict with place details
    """
    url = f'{PLACES_API_URL}/details/json'
    params = {
        'place_id': place_id,
        'key': GOOGLE_PLACES_API_KEY,
        'language': 'ro',
        'fields': 'name,formatted_address,geometry,rating,user_ratings_total,photos,reviews,opening_hours,website,formatted_phone_number,types'
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] == 'OK':
            return data.get('result', {})
        else:
            print(f"⚠️ Details API Error: {data['status']}")
            return {}
    
    except requests.RequestException as e:
        print(f"❌ Details request failed: {e}")
        return {}

def get_photo_url(photo_reference, max_width=400):
    """
    Get photo URL from photo reference
    
    Args:
        photo_reference: Photo reference from Places API
        max_width: Maximum width of the photo
    
    Returns:
        Photo URL
    """
    return f'{PLACES_API_URL}/photo?maxwidth={max_width}&photoreference={photo_reference}&key={GOOGLE_PLACES_API_KEY}'

def process_place(place_basic, include_details=True):
    """
    Process a place from Places API and convert to our format
    
    Args:
        place_basic: Basic place info from Nearby Search
        include_details: Whether to fetch detailed info
    
    Returns:
        Dict with processed place data
    """
    place_data = {
        'id': place_basic['place_id'],
        'name': place_basic.get('name', ''),
        'latitude': place_basic['geometry']['location']['lat'],
        'longitude': place_basic['geometry']['location']['lng'],
        'address': place_basic.get('vicinity', ''),
        'rating': place_basic.get('rating'),
        'user_ratings_total': place_basic.get('user_ratings_total', 0),
        'types': place_basic.get('types', []),
        'photos': []
    }
    
    # Get photo URLs
    if 'photos' in place_basic:
        for photo in place_basic['photos'][:3]:  # Max 3 photos
            photo_url = get_photo_url(photo['photo_reference'])
            place_data['photos'].append(photo_url)
    
    # Get detailed information if requested
    if include_details:
        print(f"  📍 Fetching details for: {place_data['name']}")
        time.sleep(0.5)  # Rate limiting
        details = get_place_details(place_basic['place_id'])
        
        if details:
            place_data['website'] = details.get('website')
            place_data['phone'] = details.get('formatted_phone_number')
            place_data['opening_hours'] = details.get('opening_hours', {}).get('weekday_text', [])
            
            # Get reviews
            if 'reviews' in details:
                place_data['reviews'] = [
                    {
                        'author': review['author_name'],
                        'rating': review['rating'],
                        'text': review['text'],
                        'time': review['time']
                    }
                    for review in details['reviews'][:5]  # Max 5 reviews
                ]
    
    return place_data

def fetch_all_places(save_to_file=True):
    """
    Fetch all places in Timișoara from Google Places API
    
    Args:
        save_to_file: Whether to save results to JSON file
    
    Returns:
        List of places
    """
    print("🚀 Starting Google Places API data fetch for Timișoara...")
    print(f"📍 Center: {TIMISOARA_CENTER['lat']}, {TIMISOARA_CENTER['lng']}")
    print(f"🔍 Searching for {len(PLACE_TYPES)} place types\n")
    
    all_places = {}
    
    for place_type in PLACE_TYPES:
        print(f"\n🔎 Searching for: {place_type}")
        places = search_nearby_places(TIMISOARA_CENTER, radius=3000, place_type=place_type)
        print(f"   Found {len(places)} places")
        
        for place in places:
            place_id = place['place_id']
            
            # Skip duplicates
            if place_id in all_places:
                continue
            
            # Process place
            place_data = process_place(place, include_details=False)  # Set to True for detailed info
            all_places[place_id] = place_data
        
        # Rate limiting
        time.sleep(1)
    
    places_list = list(all_places.values())
    print(f"\n✅ Total unique places found: {len(places_list)}")
    
    if save_to_file:
        output_path = Path(__file__).parent.parent / 'data' / 'google_places_data.json'
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(places_list, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Data saved to: {output_path}")
    
    return places_list

def merge_with_existing_data():
    """
    Merge Google Places data with existing coordinates.json
    """
    print("\n🔄 Merging with existing coordinates.json...")
    
    coordinates_path = Path(__file__).parent.parent / 'data' / 'coordinates.json'
    google_places_path = Path(__file__).parent.parent / 'data' / 'google_places_data.json'
    
    if not coordinates_path.exists():
        print("⚠️ coordinates.json not found")
        return
    
    if not google_places_path.exists():
        print("⚠️ google_places_data.json not found")
        return
    
    # Load data
    with open(coordinates_path, 'r', encoding='utf-8') as f:
        existing_places = json.load(f)
    
    with open(google_places_path, 'r', encoding='utf-8') as f:
        google_places = json.load(f)
    
    print(f"📊 Existing places: {len(existing_places)}")
    print(f"📊 Google Places: {len(google_places)}")
    
    # Create a merged dataset
    merged_path = Path(__file__).parent.parent / 'data' / 'merged_places_data.json'
    
    merged_data = {
        'existing_landmarks': existing_places,
        'google_places': google_places,
        'total_existing': len(existing_places),
        'total_google': len(google_places)
    }
    
    with open(merged_path, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Merged data saved to: {merged_path}")

if __name__ == '__main__':
    print("=" * 60)
    print("Google Places API Data Fetcher for Timișoara")
    print("=" * 60)
    
    # Check if API key is set
    if GOOGLE_PLACES_API_KEY == 'YOUR_API_KEY_HERE':
        print("\n❌ ERROR: Google Places API key not set!")
        print("\nTo use this script:")
        print("1. Get API key from: https://console.cloud.google.com/")
        print("2. Enable 'Places API' and 'Maps JavaScript API'")
        print("3. Set environment variable:")
        print("   export GOOGLE_PLACES_API_KEY='your-api-key'")
        print("\nOr edit this file and replace 'YOUR_API_KEY_HERE' with your key")
        exit(1)
    
    # Fetch places data
    places = fetch_all_places(save_to_file=True)
    
    # Optionally merge with existing data
    merge_with_existing_data()
    
    print("\n" + "=" * 60)
    print("✅ Script completed successfully!")
    print("=" * 60)
