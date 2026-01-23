#!/usr/bin/env python3
"""
Script to check and fix geospatial data in MongoDB
"""

import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def check_and_fix():
    """Check listings structure and create/fix geospatial index"""
    
    mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
    client = motor.motor_asyncio.AsyncMotorClient(mongodb_url)
    db = client['timisoaralens']
    
    try:
        print("=" * 60)
        print("CHECKING MONGODB GEOSPATIAL SETUP")
        print("=" * 60)
        
        # Check collection exists
        collections = await db.list_collection_names()
        if 'listings' not in collections:
            print("✗ 'listings' collection does not exist!")
            return
        print("✓ 'listings' collection exists")
        
        # Check first listing structure
        listing = await db.listings.find_one()
        if not listing:
            print("✗ No listings found in database!")
            return
        
        print(f"\n✓ Found {await db.listings.count_documents({})} listings")
        print(f"\nFirst listing structure:")
        print(f"  - ID: {listing.get('_id')}")
        print(f"  - Title: {listing.get('title', 'N/A')[:50]}")
        print(f"  - Location field: {listing.get('location', {})}")
        print(f"  - Location_geo field: {listing.get('location_geo', 'MISSING!')}")
        
        # Check if location_geo exists and has correct structure
        if 'location_geo' not in listing:
            print("\n⚠️  location_geo field is MISSING! Need to create it from location data...")
            
            # Create location_geo from location data
            result = await db.listings.update_many(
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
        else:
            print(f"\n✓ location_geo field exists")
            geo_data = listing.get('location_geo')
            print(f"  Structure: {geo_data}")
        
        # Check indexes
        print("\n" + "=" * 60)
        print("CHECKING INDEXES")
        print("=" * 60)
        
        indexes = await db.listings.list_indexes().to_list(length=None)
        print(f"Current indexes on 'listings':")
        for idx in indexes:
            print(f"  - {idx['name']}: {idx['key']}")
        
        # Check if 2dsphere index exists
        has_geo_index = any('location_geo' in str(idx.get('key', [])) for idx in indexes)
        
        if not has_geo_index:
            print("\n⚠️  2dsphere index NOT FOUND! Creating it...")
            try:
                result = await db.listings.create_index(
                    [("location_geo", "2dsphere")],
                    name="location_geo_2dsphere"
                )
                print(f"✓ Created geospatial index: {result}")
            except Exception as e:
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
        
        result = await db.listings.find({
            'location_geo': {
                '$near': {
                    '$geometry': {
                        'type': 'Point',
                        'coordinates': [test_lng, test_lat]
                    },
                    '$maxDistance': test_radius
                }
            }
        }).to_list(length=None)
        
        print(f"Query: Find listings within 5km of ({test_lat}, {test_lng})")
        print(f"Result: Found {len(result)} listings")
        for listing in result:
            loc = listing.get('location', {})
            print(f"  - {listing.get('title', 'N/A')[:40]}: ({loc.get('latitude', '?')}, {loc.get('longitude', '?')})")
        
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
    asyncio.run(check_and_fix())
