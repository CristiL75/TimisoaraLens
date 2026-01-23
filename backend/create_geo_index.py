#!/usr/bin/env python3
"""
Script to create geospatial index on listings collection
Run this once to enable proximity search functionality
"""

import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def create_geo_index():
    """Create 2dsphere index on location_geo field"""
    
    mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
    client = motor.motor_asyncio.AsyncMotorClient(mongodb_url)
    db = client['timisoaralens']
    
    try:
        print("Connecting to MongoDB...")
        # Test connection
        await db.command('ping')
        print("✓ Connected to MongoDB")
        
        print("\nCreating geospatial index on 'location_geo' field...")
        result = await db.listings.create_index(
            [("location_geo", "2dsphere")],
            name="location_geo_2dsphere"
        )
        print(f"✓ Index created: {result}")
        
        # List all indexes
        print("\nAll indexes on 'listings' collection:")
        async for index in db.listings.list_indexes():
            print(f"  - {index}")
        
        print("\n✓ Geospatial index ready for proximity searches!")
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_geo_index())
