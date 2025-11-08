"""
Enrich OSM data with additional details from FREE sources:
- Wikipedia/Wikidata for descriptions and images
- Nominatim for better addresses
- Manual curation for important landmarks

Usage: python enrich_osm_data.py
"""
import json
import time
import requests
from pathlib import Path

def load_osm_data():
    """Load OSM data from file"""
    data_path = Path(__file__).parent.parent / 'data' / 'osm_all_data.json'
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def search_wikidata(place_name, lat, lon):
    """
    Search Wikidata for place information
    100% FREE, no API key needed!
    
    Returns: description, image, wikipedia_url
    """
    print(f"      🔍 Searching Wikidata for: {place_name}")
    
    # Wikidata SPARQL endpoint (free!)
    url = "https://query.wikidata.org/sparql"
    
    # Query for places near coordinates with name
    query = f"""
    SELECT ?place ?placeLabel ?description ?image ?article WHERE {{
      SERVICE wikibase:around {{
        ?place wdt:P625 ?location.
        bd:serviceParam wikibase:center "Point({lon} {lat})"^^geo:wktLiteral.
        bd:serviceParam wikibase:radius "0.5".
        bd:serviceParam wikibase:distance ?dist.
      }}
      ?place rdfs:label ?placeLabel.
      FILTER(LANG(?placeLabel) = "ro" || LANG(?placeLabel) = "en")
      FILTER(CONTAINS(LCASE(?placeLabel), LCASE("{place_name}")))
      
      OPTIONAL {{ ?place schema:description ?description. FILTER(LANG(?description) = "ro") }}
      OPTIONAL {{ ?place wdt:P18 ?image. }}
      OPTIONAL {{
        ?article schema:about ?place.
        ?article schema:isPartOf <https://ro.wikipedia.org/>.
      }}
    }}
    LIMIT 1
    """
    
    try:
        response = requests.get(
            url,
            params={'query': query, 'format': 'json'},
            headers={'User-Agent': 'TimisoaraLens/1.0'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', {}).get('bindings', [])
            
            if results:
                result = results[0]
                info = {
                    'description': result.get('description', {}).get('value'),
                    'image': result.get('image', {}).get('value'),
                    'wikipedia_url': result.get('article', {}).get('value'),
                }
                print(f"         ✅ Found Wikidata info!")
                return {k: v for k, v in info.items() if v}
        
        return {}
    
    except Exception as e:
        print(f"         ⚠️ Wikidata error: {e}")
        return {}

def get_wikipedia_summary(place_name):
    """
    Get Wikipedia summary in Romanian
    100% FREE!
    """
    url = "https://ro.wikipedia.org/w/api.php"
    
    params = {
        'action': 'query',
        'format': 'json',
        'titles': place_name,
        'prop': 'extracts|pageimages',
        'exintro': True,
        'explaintext': True,
        'piprop': 'original',
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            pages = data.get('query', {}).get('pages', {})
            
            for page_id, page in pages.items():
                if page_id != '-1':  # Page exists
                    return {
                        'description': page.get('extract'),
                        'image': page.get('original', {}).get('source'),
                        'wikipedia_url': f"https://ro.wikipedia.org/?curid={page_id}"
                    }
        
        return {}
    
    except Exception as e:
        print(f"         ⚠️ Wikipedia error: {e}")
        return {}

def add_manual_landmarks():
    """
    Add important Timișoara landmarks manually with rich details
    Based on the existing coordinates.json
    """
    landmarks_path = Path(__file__).parent.parent / 'data' / 'coordinates.json'
    
    if landmarks_path.exists():
        print("\n📚 Loading manual landmark data from coordinates.json...")
        with open(landmarks_path, 'r', encoding='utf-8') as f:
            landmarks = json.load(f)
        print(f"   ✅ Loaded {len(landmarks)} curated landmarks")
        return landmarks
    
    return []

def enrich_place(place, category):
    """
    Enrich a single place with additional data
    """
    name = place.get('name', 'Unknown')
    
    if name == 'Unknown' or not name:
        return place
    
    print(f"   🔧 Enriching: {name}")
    
    lat = place.get('latitude')
    lon = place.get('longitude')
    
    enriched = place.copy()
    
    # Try Wikidata first (more structured)
    if lat and lon:
        wikidata_info = search_wikidata(name, lat, lon)
        if wikidata_info:
            enriched.update(wikidata_info)
            time.sleep(1)  # Be nice to Wikidata
            return enriched
    
    # Fallback to Wikipedia direct search
    wiki_info = get_wikipedia_summary(name)
    if wiki_info:
        enriched.update(wiki_info)
    
    time.sleep(0.5)  # Rate limiting
    return enriched

def merge_with_manual_data(osm_data, manual_landmarks):
    """
    Merge OSM data with manually curated landmarks
    """
    print("\n🔄 Merging OSM data with manual landmarks...")
    
    # Convert manual landmarks to same format
    enriched_landmarks = []
    
    for landmark in manual_landmarks:
        enriched = {
            'id': f"manual_{landmark['id']}",
            'name': landmark['name'],
            'name_en': landmark.get('name_en'),
            'latitude': landmark['latitude'],
            'longitude': landmark['longitude'],
            'category': landmark.get('category', 'landmark'),
            'description': landmark.get('description'),
            'trivia': landmark.get('trivia', []),
            'year_built': landmark.get('year_built'),
            'architect': landmark.get('architect'),
            'style': landmark.get('style'),
            'opening_hours': landmark.get('opening_hours'),
            'entrance_fee': landmark.get('entrance_fee'),
            'radius_meters': landmark.get('radius_meters', 50),
            'source': 'Manual Curation',
        }
        enriched_landmarks.append(enriched)
    
    # Add to tourist_attractions category
    if 'tourist_attractions' not in osm_data['categories']:
        osm_data['categories']['tourist_attractions'] = []
    
    osm_data['categories']['tourist_attractions'].extend(enriched_landmarks)
    
    print(f"   ✅ Added {len(enriched_landmarks)} manually curated landmarks")
    
    return osm_data

def enrich_osm_data():
    """
    Main enrichment function
    """
    print("=" * 70)
    print("🎨 OSM Data Enrichment - Adding Details from FREE Sources")
    print("=" * 70)
    print("\nSources:")
    print("  • Wikidata (descriptions, images, Wikipedia links)")
    print("  • Wikipedia (summaries, images)")
    print("  • Manual curation (coordinates.json)")
    print()
    
    # Load OSM data
    print("📂 Loading OSM data...")
    osm_data = load_osm_data()
    total_before = osm_data['total_places']
    print(f"   Loaded {total_before} places\n")
    
    # Add manual landmarks first
    manual_landmarks = add_manual_landmarks()
    if manual_landmarks:
        osm_data = merge_with_manual_data(osm_data, manual_landmarks)
    
    # Enrich important categories only (to save time)
    categories_to_enrich = ['cafes', 'tourist_attractions']
    
    print(f"\n🔍 Enriching {len(categories_to_enrich)} categories with external data...\n")
    
    for category in categories_to_enrich:
        places = osm_data['categories'].get(category, [])
        
        if not places:
            continue
        
        print(f"📍 Category: {category} ({len(places)} places)")
        
        # Enrich only top 10 per category to save time
        top_places = places[:10]
        
        enriched_places = []
        for place in top_places:
            enriched = enrich_place(place, category)
            enriched_places.append(enriched)
        
        # Keep rest as-is
        enriched_places.extend(places[10:])
        
        osm_data['categories'][category] = enriched_places
        print()
    
    # Update totals
    osm_data['total_places'] = sum(len(places) for places in osm_data['categories'].values())
    osm_data['enriched_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
    
    # Save enriched data
    output_path = Path(__file__).parent.parent / 'data' / 'osm_enriched_data.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(osm_data, f, ensure_ascii=False, indent=2)
    
    print("=" * 70)
    print("✅ ENRICHMENT COMPLETE!")
    print("=" * 70)
    print(f"\n📊 Statistics:")
    print(f"   Before: {total_before} places")
    print(f"   After:  {osm_data['total_places']} places")
    print(f"   Added:  {osm_data['total_places'] - total_before} places")
    print(f"\n💾 Saved to: {output_path}")
    
    # Show sample enriched place
    cafes = osm_data['categories'].get('cafes', [])
    if cafes:
        sample = cafes[0]
        print("\n📝 Sample enriched place:")
        print(f"   Name: {sample.get('name')}")
        print(f"   Description: {sample.get('description', 'N/A')[:100]}...")
        print(f"   Image: {'Yes' if sample.get('image') else 'No'}")
        print(f"   Wikipedia: {'Yes' if sample.get('wikipedia_url') else 'No'}")

if __name__ == '__main__':
    print("\n💡 This will enrich OSM data with:")
    print("   • Wikipedia descriptions and images")
    print("   • Wikidata structured information")
    print("   • Manual curated landmarks from coordinates.json")
    print("\n⏱️  This may take 5-10 minutes for top places...\n")
    
    input("Press Enter to start enrichment...")
    
    enrich_osm_data()
    
    print("\n✅ Done! Use osm_enriched_data.json in your app.")
