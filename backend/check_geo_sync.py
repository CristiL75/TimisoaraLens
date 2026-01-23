#!/usr/bin/env python3
"""
Script to check and fix geospatial data in MongoDB (synchronous version)

Improvements:
- Auto-detect database name from MONGODB_URL if provided (uses default DB in URI)
- Fallback to env var DATABASE_NAME (or TimisoaraLens) when URI has no DB
- Creates the listings collection and 2dsphere index even if the collection is missing
"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import OperationFailure

load_dotenv()

def check_and_fix():
    """Check listings structure and create/fix geospatial index"""
    
    mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/TimisoaraLens')
    
    try:
        client = MongoClient(mongodb_url, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command('ping')
        # Determine database to use
        db = None
        try:
            # If URI contains a default database, use it
            db = client.get_default_database()
        except Exception:
            db = None

        if db is None:
            # Fallback to env/database name
            db_name = (
                os.getenv('DATABASE_NAME')
                or os.getenv('MONGODB_DB')
                or 'TimisoaraLens'
            )
            db = client[db_name]

        print("============================================================")
        print("CHECKING MONGODB GEOSPATIAL SETUP")
        print("============================================================")
        try:
            print(f"Connected to: {mongodb_url}")
        except Exception:
            print("Connected to MongoDB")
        print(f"Using database: {db.name}")
        
        # Check collection exists
        collections = db.list_collection_names()
        if 'listings' not in collections:
            print("⚠️  'listings' collection does not exist — creating it and adding 2dsphere index...")
            try:
                # Creating an index will implicitly create the collection
                db.listings.create_index([("location_geo", "2dsphere")], name="location_geo_2dsphere")
                print("✓ Created 'listings' collection with 2dsphere index")
            except OperationFailure as e:
                print(f"✗ Error creating index on new collection: {e}")
            # After creation, refresh collections list
            collections = db.list_collection_names()
        else:
            print("✓ 'listings' collection exists")
        
        # Check first listing structure
        listing = db.listings.find_one()
        if not listing:
            print("⚠️  No listings found yet. Index setup will still be verified.")
        
        total_count = db.listings.count_documents({})
        print(f"\n✓ Found {total_count} listings")
        if listing:
            print(f"\nFirst listing structure:")
            print(f"  - ID: {listing.get('_id')}")
            print(f"  - Title: {listing.get('title', 'N/A')[:50]}")
            print(f"  - Location field: {listing.get('location', {})}")
            print(f"  - Location_geo field: {listing.get('location_geo', 'MISSING!')}")
        
        # Check if location_geo exists and has correct structure
        if listing and 'location_geo' not in listing:
            print("\n⚠️  location_geo field is MISSING! Creating it from location data...")
            
            # Create location_geo from location data
            result = db.listings.update_many(
                {},
                [
                    {
                        '$set': {
                            'location_geo': {
                                'type': 'Point',
                                'coordinates': [
                                    '$location.longitude',
                                    '$location.latitude'
                                ]
                            }
                        }
                    }
                ]
            )
            print(f"✓ Updated {result.modified_count} listings with location_geo")
        elif listing:
            print(f"\n✓ location_geo field exists")
            geo_data = listing.get('location_geo')
            print(f"  Structure: {geo_data}")
        
        # Check indexes
        print("\n" + "=" * 60)
        print("CHECKING INDEXES")
        print("=" * 60)
        
        indexes = list(db.listings.list_indexes())
        print(f"Current indexes on 'listings':")
        for idx in indexes:
            print(f"  - {idx['name']}: {idx['key']}")
        
        # Check if 2dsphere index exists
        has_geo_index = any('location_geo' in str(idx.get('key', [])) and '2dsphere' in str(idx.get('key', [])) for idx in indexes)
        
        if not has_geo_index:
            print("\n⚠️  2dsphere index NOT FOUND! Creating it...")
            try:
                result = db.listings.create_index(
                    [("location_geo", "2dsphere")],
                    name="location_geo_2dsphere"
                )
                print(f"✓ Created geospatial index: {result}")
            except OperationFailure as e:
                print(f"✗ Error creating index: {e}")
        else:
            print("\n✓ 2dsphere index already exists")
        
        # Test a proximity query
        print("\n" + "=" * 60)
        print("TESTING PROXIMITY QUERY")
        print("=" * 60)
        
        test_lat = 45.7489
        test_lng = 21.2272
        test_radius = 5000  # 5km in meters
        
        result = list(db.listings.find({
            'location_geo': {
                '$near': {
                    '$geometry': {
                        'type': 'Point',
                        'coordinates': [test_lng, test_lat]
                    },
                    '$maxDistance': test_radius
                }
            }
        }))
        
        print(f"Query: Find listings within 5km of ({test_lat}, {test_lng})")
        print(f"Result: Found {len(result)} listings")
        for l in result:
            loc = l.get('location', {})
            title = l.get('title', 'N/A')[:40]
            lat = loc.get('latitude', '?')
            lng = loc.get('longitude', '?')
            print(f"  - {title}: ({lat}, {lng})")
        
        print("\n" + "=" * 60)
        print("✓ GEOSPATIAL SETUP COMPLETE")
        print("=" * 60)
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    check_and_fix()
