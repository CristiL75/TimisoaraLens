"""
OpenStreetMap Data Fetcher for Timișoara
100% FREE, LEGAL, NO API KEY NEEDED!

Extracts cafes, restaurants, tourist attractions from OpenStreetMap
using Overpass API

Usage: python fetch_osm_data.py
"""
import requests
import json
import time
from pathlib import Path

# Overpass API endpoint (free, no authentication needed!)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Timișoara bounding box (south, west, north, east)
# Covers the entire city
TIMISOARA_BBOX = {
    'south': 45.7,
    'west': 21.15,
    'north': 45.8,
    'east': 21.3
}

def build_overpass_query(bbox, amenities):
    """
    Build Overpass QL query for specific amenities in bounding box
    
    Args:
        bbox: Dict with south, west, north, east
        amenities: List of OSM amenity types (e.g., ['cafe', 'restaurant'])
    
    Returns:
        Overpass QL query string
    """
    bbox_str = f"{bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']}"
    
    # Build query for multiple amenity types
    amenity_queries = []
    for amenity in amenities:
        amenity_queries.append(f'  node["amenity"="{amenity}"]({bbox_str});')
        amenity_queries.append(f'  way["amenity"="{amenity}"]({bbox_str});')
    
    query = f"""
[out:json][timeout:60];
(
{chr(10).join(amenity_queries)}
);
out body;
>;
out skel qt;
"""
    return query

def fetch_osm_data(amenities, category_name):
    """
    Fetch data from OpenStreetMap Overpass API
    
    Args:
        amenities: List of OSM amenity types
        category_name: Human-readable category name
    
    Returns:
        List of places
    """
    print(f"\n🔍 Fetching {category_name} from OpenStreetMap...")
    print(f"   Amenities: {', '.join(amenities)}")
    
    query = build_overpass_query(TIMISOARA_BBOX, amenities)
    
    try:
        response = requests.post(
            OVERPASS_URL,
            data={'data': query},
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        
        elements = data.get('elements', [])
        print(f"   ✅ Found {len(elements)} raw elements")
        
        return elements
    
    except requests.RequestException as e:
        print(f"   ❌ Error: {e}")
        return []

def process_osm_element(element):
    """
    Convert OSM element to our format
    
    Args:
        element: Raw OSM element
    
    Returns:
        Processed place dict
    """
    tags = element.get('tags', {})
    
    # Get coordinates
    if element['type'] == 'node':
        lat = element.get('lat')
        lon = element.get('lon')
    elif element['type'] == 'way':
        # For ways, use center point (if available)
        lat = element.get('center', {}).get('lat')
        lon = element.get('center', {}).get('lon')
    else:
        lat = None
        lon = None
    
    place = {
        'id': f"osm_{element['type']}_{element['id']}",
        'name': tags.get('name', tags.get('name:ro', 'Unknown')),
        'name_en': tags.get('name:en'),
        'latitude': lat,
        'longitude': lon,
        'amenity': tags.get('amenity'),
        'cuisine': tags.get('cuisine'),
        'address': {
            'street': tags.get('addr:street'),
            'housenumber': tags.get('addr:housenumber'),
            'postcode': tags.get('addr:postcode'),
            'city': tags.get('addr:city', 'Timișoara'),
        },
        'contact': {
            'phone': tags.get('phone') or tags.get('contact:phone'),
            'website': tags.get('website') or tags.get('contact:website'),
            'email': tags.get('email') or tags.get('contact:email'),
            'facebook': tags.get('contact:facebook'),
            'instagram': tags.get('contact:instagram'),
        },
        'opening_hours': tags.get('opening_hours'),
        'wheelchair': tags.get('wheelchair'),
        'outdoor_seating': tags.get('outdoor_seating'),
        'wifi': tags.get('internet_access'),
        'description': tags.get('description'),
        'source': 'OpenStreetMap',
        'osm_type': element['type'],
        'osm_id': element['id'],
    }
    
    # Clean up None values
    place = {k: v for k, v in place.items() if v is not None}
    if place.get('contact'):
        place['contact'] = {k: v for k, v in place['contact'].items() if v is not None}
    if place.get('address'):
        place['address'] = {k: v for k, v in place['address'].items() if v is not None}
    
    return place

def fetch_all_categories():
    """
    Fetch all categories of places in Timișoara
    
    Returns:
        Dict with categories and their places
    """
    print("=" * 70)
    print("🗺️  OpenStreetMap Data Fetcher - Timișoara")
    print("=" * 70)
    print(f"\n📍 Bounding Box: {TIMISOARA_BBOX}")
    print("🆓 100% FREE, NO API KEY NEEDED!\n")
    
    categories = {
        'cafes': ['cafe'],
        'restaurants': ['restaurant', 'fast_food'],
        'bars_pubs': ['bar', 'pub', 'biergarten'],
        'tourist_attractions': ['attraction', 'viewpoint'],
        'museums': ['museum', 'gallery'],
        'religious': ['place_of_worship'],
        'parks': ['park'],
        'entertainment': ['cinema', 'theatre', 'arts_centre'],
        'hotels': ['hotel', 'hostel', 'guest_house'],
        'shops': ['mall', 'marketplace'],
    }
    
    all_data = {}
    
    for category_name, amenities in categories.items():
        elements = fetch_osm_data(amenities, category_name)
        
        # Process elements
        places = []
        for element in elements:
            place = process_osm_element(element)
            if place.get('latitude') and place.get('longitude'):
                places.append(place)
        
        all_data[category_name] = places
        print(f"   📊 Processed: {len(places)} valid places\n")
        
        # Be nice to the server
        time.sleep(1)
    
    return all_data

def save_data(data):
    """
    Save OSM data to JSON files
    
    Args:
        data: Dict with categories and places
    """
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save all data in one file
    all_output_path = output_dir / 'osm_all_data.json'
    
    # Calculate totals
    total_places = sum(len(places) for places in data.values())
    
    output_data = {
        'source': 'OpenStreetMap',
        'location': 'Timișoara, Romania',
        'bbox': TIMISOARA_BBOX,
        'fetched_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total_places': total_places,
        'categories': data,
    }
    
    with open(all_output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 All data saved to: {all_output_path}")
    
    # Save individual category files
    for category, places in data.items():
        if places:
            category_path = output_dir / f'osm_{category}.json'
            with open(category_path, 'w', encoding='utf-8') as f:
                json.dump(places, f, ensure_ascii=False, indent=2)
            print(f"   📁 {category}: {len(places)} places → {category_path.name}")
    
    # Print summary
    print("\n" + "=" * 70)
    print("📈 SUMMARY")
    print("=" * 70)
    print(f"Total Places: {total_places}")
    print("\nBy Category:")
    for category, places in sorted(data.items(), key=lambda x: len(x[1]), reverse=True):
        if places:
            print(f"  • {category:20s}: {len(places):3d} places")
    
    # Top cafes/restaurants with names
    print("\n🏆 Top Cafes:")
    cafes = data.get('cafes', [])
    for i, cafe in enumerate(cafes[:10], 1):
        name = cafe.get('name', 'Unknown')
        addr = cafe.get('address', {}).get('street', '')
        print(f"  {i}. {name}" + (f" - {addr}" if addr else ""))

def main():
    """
    Main function
    """
    print("\n⚠️  DISCLAIMER:")
    print("   OpenStreetMap data is © OpenStreetMap contributors")
    print("   Licensed under ODbL (Open Database License)")
    print("   You must give attribution when using this data")
    print("   More info: https://www.openstreetmap.org/copyright\n")
    
    input("Press Enter to start fetching data...")
    
    # Fetch all categories
    data = fetch_all_categories()
    
    # Save to files
    save_data(data)
    
    print("\n" + "=" * 70)
    print("✅ Done! Data is ready to use.")
    print("=" * 70)
    print("\n💡 Next steps:")
    print("   1. Check backend/data/osm_all_data.json")
    print("   2. Integrate into your GPS API (api/gps.py)")
    print("   3. Display on MapScreen in mobile app")
    print("   4. Add to ChromaDB for RAG system")

if __name__ == '__main__':
    main()
