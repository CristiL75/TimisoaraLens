#!/usr/bin/env python3
"""
Seed MongoDB with a few sample listings around Timișoara.

Usage:
  - Ensure MongoDB is running locally
  - Activate venv, then run: python scripts/seed_listings.py

Respects env vars:
  MONGODB_URL (e.g., mongodb://localhost:27017/TimisoaraLens)
  DATABASE_NAME (fallback if URL has no default DB)
"""

import os
from datetime import datetime
from pymongo import MongoClient


def get_db():
  mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/TimisoaraLens')
  client = MongoClient(mongodb_url, serverSelectionTimeoutMS=5000)
  client.admin.command('ping')
  db = None
  try:
    db = client.get_default_database()
  except Exception:
    pass
  if db is None:
    db = client[os.getenv('DATABASE_NAME', 'TimisoaraLens')]
  return client, db


def main():
  client, db = get_db()
  try:
    print(f"Using DB: {db.name}")

    samples = [
      {
        "user_id": "seed",
        "owner": {
          "user_id": "seed",
          "username": "seed_user",
          "contact_name": "Seed Owner",
          "contact_phone": "+40 712 345 678",
          "contact_email": "seed@example.com",
        },
        "title": "Apartament Central Unirii",
        "description": "Apartament cochet, aproape de Piața Unirii.",
        "property_type": "apartment",
        "location": {
          "latitude": 45.7575,
          "longitude": 21.2296,
          "address": "Piața Unirii, Timișoara",
          "city": "Timișoara",
          "country": "Romania",
        },
        "location_geo": {"type": "Point", "coordinates": [21.2296, 45.7575]},
        "images": [],
        "price_per_night": 220,
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 1,
        "amenities": ["wifi", "ac", "kitchen"],
        "reviews": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "status": "active",
      },
      {
        "user_id": "seed",
        "owner": {
          "user_id": "seed",
          "username": "seed_user",
          "contact_name": "Seed Owner",
          "contact_phone": "+40 712 345 678",
          "contact_email": "seed@example.com",
        },
        "title": "Studio Modern lângă Iulius Town",
        "description": "Studio luminos, 10 min de Iulius Town.",
        "property_type": "studio",
        "location": {
          "latitude": 45.7579,
          "longitude": 21.2492,
          "address": "Iulius Town, Timișoara",
          "city": "Timișoara",
          "country": "Romania",
        },
        "location_geo": {"type": "Point", "coordinates": [21.2492, 45.7579]},
        "images": [],
        "price_per_night": 180,
        "max_guests": 2,
        "bedrooms": 1,
        "bathrooms": 1,
        "amenities": ["wifi", "parking", "ac"],
        "reviews": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "status": "active",
      },
      {
        "user_id": "seed",
        "owner": {
          "user_id": "seed",
          "username": "seed_user",
          "contact_name": "Seed Owner",
          "contact_phone": "+40 712 345 678",
          "contact_email": "seed@example.com",
        },
        "title": "Casă Spațioasă Zona Elisabetin",
        "description": "Casă cu curte, zonă liniștită Elisabetin.",
        "property_type": "house",
        "location": {
          "latitude": 45.7426,
          "longitude": 21.2195,
          "address": "Elisabetin, Timișoara",
          "city": "Timișoara",
          "country": "Romania",
        },
        "location_geo": {"type": "Point", "coordinates": [21.2195, 45.7426]},
        "images": [],
        "price_per_night": 350,
        "max_guests": 6,
        "bedrooms": 3,
        "bathrooms": 2,
        "amenities": ["wifi", "kitchen", "washer", "parking"],
        "reviews": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "status": "active",
      },
    ]

    # Ensure index exists (no-op if already present)
    try:
      db.listings.create_index([("location_geo", "2dsphere")], name="location_geo_2dsphere")
    except Exception:
      pass

    # Insert only if collection is empty
    if db.listings.count_documents({}) == 0:
      res = db.listings.insert_many(samples)
      print(f"Inserted {len(res.inserted_ids)} listings.")
    else:
      print("Listings already present. Skipping insert.")

  finally:
    client.close()


if __name__ == "__main__":
  main()
