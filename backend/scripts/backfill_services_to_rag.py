"""
Backfill service ecosystem data into HF Space RAG (services_hub collection).

Entities indexed:
- provider
- service
- table
- room
- experience
- reservation_type (club event packages)

Usage:
  python backend/scripts/backfill_services_to_rag.py --limit 200

Environment:
  MONGODB_URL, DATABASE_NAME
  HF_RAG_SPACE_URL (or RAG_BASE_URL)
"""

import argparse
import asyncio
import os
from pathlib import Path
from typing import Optional
from datetime import datetime

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId


def _load_dotenv() -> None:
    dotenv_keys = set()
    candidates = [
        Path(__file__).resolve().parents[1] / ".env",
        Path(__file__).resolve().parents[2] / ".env",
    ]
    for path in candidates:
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"')
            if key in os.environ and key not in dotenv_keys:
                continue
            os.environ[key] = value
            dotenv_keys.add(key)


def _get_env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    return value.strip() if isinstance(value, str) else value


def _to_jsonable(value):
    if isinstance(value, dict):
        return {k: _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, ObjectId):
        return str(value)
    return value


def _normalize_location(doc: dict) -> dict:
    return {
        "address": doc.get("address"),
        "city": doc.get("city") or "Timisoara",
        "country": doc.get("country") or "Romania",
        "latitude": doc.get("latitude"),
        "longitude": doc.get("longitude"),
    }


_CATEGORY_ALIASES = {
    "food_drinks": ["food and drinks", "restaurant", "bar", "cafenea", "restaurant"],
    "nightlife": ["club", "pub", "night life", "viata de noapte"],
    "rent_a_car": ["rent a car", "car rental", "inchiriere auto", "inchirieri auto"],
    "car_rental": ["rent a car", "car rental", "inchiriere auto", "inchirieri auto"],
    "guided_tour": ["guided tour", "tur ghidat", "city tour"],
    "workshop": ["atelier", "workshop", "curs"],
    "indoor_activity": ["activitate indoor", "indoor activity", "recreere"],
    "spa": ["wellness", "spa", "relaxare"],
    "barber": ["barbershop", "frizerie", "barber"],
    "salon": ["beauty salon", "coafor", "salon"],
    "massage": ["masaj", "massage", "terapie"],
    "event_space": ["event venue", "sala evenimente", "event space"],
    "table_booking": ["table reservation", "rezervare masa", "book table"],
    "room_booking": ["room reservation", "rezervare spatiu", "book room"],
}


def _category_aliases(category: Optional[str]) -> list[str]:
    raw = (category or "").strip()
    if not raw:
        return []

    normalized = raw.lower().replace("-", "_").replace(" ", "_")
    base = [raw, raw.replace("_", " "), raw.replace("-", " ")]
    extras = _CATEGORY_ALIASES.get(normalized, [])

    aliases = []
    seen = set()
    for value in [*base, *extras]:
        text = str(value or "").strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        aliases.append(text)
    return aliases


async def _upsert_entity(http: httpx.AsyncClient, rag_base: str, entity: dict) -> bool:
    resp = await http.post(f"{rag_base}/rag/services/upsert", json={"entity": entity})
    if resp.status_code >= 400:
        raise RuntimeError(f"{resp.status_code} {resp.text}")
    return True


async def backfill(limit: Optional[int], all_statuses: bool) -> dict:
    _load_dotenv()
    mongo_url = _get_env("MONGODB_URL", "mongodb://localhost:27017/TimisoaraLens")
    db_name = _get_env("DATABASE_NAME", "TimisoaraLens")
    rag_base = _get_env("RAG_BASE_URL") or _get_env("HF_RAG_SPACE_URL")

    if not rag_base:
        raise RuntimeError("Missing RAG_BASE_URL or HF_RAG_SPACE_URL")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    provider_query = {} if all_statuses else {"status": "active"}
    providers_cursor = db.providers.find(provider_query)
    if limit:
        providers_cursor = providers_cursor.limit(limit)

    stats = {
        "provider": 0,
        "service": 0,
        "table": 0,
        "room": 0,
        "experience": 0,
        "reservation_type": 0,
        "failed": 0,
    }

    providers = await providers_cursor.to_list(length=limit or 5000)
    provider_ids = [p.get("_id") for p in providers if p.get("_id")]

    services = await db.services.find({"provider_id": {"$in": provider_ids}}).to_list(length=20000) if provider_ids else []
    tables = await db.tables.find({"provider_id": {"$in": provider_ids}}).to_list(length=20000) if provider_ids else []
    rooms = await db.rooms.find({"provider_id": {"$in": provider_ids}}).to_list(length=20000) if provider_ids else []

    experiences_query = {} if all_statuses else {"status": "active"}
    experiences = await db.experiences.find(experiences_query).to_list(length=20000)

    provider_by_id = {str(p["_id"]): p for p in providers if p.get("_id")}

    async with httpx.AsyncClient(timeout=30.0) as http:
        for provider in providers:
            provider_id = str(provider.get("_id"))
            entity = {
                "id": provider_id,
                "entity_type": "provider",
                "provider_id": provider_id,
                "provider_name": provider.get("name"),
                "name": provider.get("name"),
                "description": provider.get("description"),
                "category": provider.get("category"),
                "category_aliases": _category_aliases(provider.get("category")),
                "status": provider.get("status"),
                "location": _normalize_location(provider),
                "facilities": provider.get("facilities") or {},
                "cars": _to_jsonable(provider.get("cars") or []),
                "working_hours": _to_jsonable(provider.get("working_hours") or []),
                "reservation_types": _to_jsonable(provider.get("reservation_types") or []),
            }
            try:
                await _upsert_entity(http, rag_base, _to_jsonable(entity))
                stats["provider"] += 1
            except Exception as exc:
                stats["failed"] += 1
                print(f"Failed provider {provider_id}: {exc}")

            for idx, reservation_type in enumerate(provider.get("reservation_types") or []):
                rt_id = reservation_type.get("id") if isinstance(reservation_type, dict) else None
                if not rt_id:
                    rt_id = f"{provider_id}:reservation_type:{idx}"
                rt_name = reservation_type.get("name") if isinstance(reservation_type, dict) else str(reservation_type)
                rt_entity = {
                    "id": str(rt_id),
                    "entity_type": "reservation_type",
                    "provider_id": provider_id,
                    "provider_name": provider.get("name"),
                    "name": rt_name,
                    "description": "Event/club reservation package",
                    "category": provider.get("category"),
                    "category_aliases": _category_aliases(provider.get("category")),
                    "status": provider.get("status"),
                    "location": _normalize_location(provider),
                    "reservation_types": [reservation_type],
                }
                try:
                    await _upsert_entity(http, rag_base, _to_jsonable(rt_entity))
                    stats["reservation_type"] += 1
                except Exception as exc:
                    stats["failed"] += 1
                    print(f"Failed reservation_type {rt_id}: {exc}")

        for service in services:
            sid = str(service.get("_id"))
            provider_id = str(service.get("provider_id")) if service.get("provider_id") else None
            provider = provider_by_id.get(provider_id, {})
            entity = {
                "id": sid,
                "entity_type": "service",
                "provider_id": provider_id,
                "provider_name": provider.get("name"),
                "name": service.get("name"),
                "description": f"Durata: {service.get('duration_minutes')} min, Pret: {service.get('price')} lei",
                "category": provider.get("category") or service.get("category"),
                "category_aliases": _category_aliases(provider.get("category") or service.get("category")),
                "status": service.get("status"),
                "location": _normalize_location(provider),
                "amenities": [],
            }
            try:
                await _upsert_entity(http, rag_base, _to_jsonable(entity))
                stats["service"] += 1
            except Exception as exc:
                stats["failed"] += 1
                print(f"Failed service {sid}: {exc}")

        for table in tables:
            tid = str(table.get("_id"))
            provider_id = str(table.get("provider_id")) if table.get("provider_id") else None
            provider = provider_by_id.get(provider_id, {})
            entity = {
                "id": tid,
                "entity_type": "table",
                "provider_id": provider_id,
                "provider_name": provider.get("name"),
                "name": table.get("name"),
                "description": f"Locuri: {table.get('seats')}, Zona: {table.get('zone')}",
                "category": provider.get("category"),
                "category_aliases": _category_aliases(provider.get("category")),
                "status": table.get("status"),
                "location": _normalize_location(provider),
                "amenities": table.get("special_options") or [],
            }
            try:
                await _upsert_entity(http, rag_base, _to_jsonable(entity))
                stats["table"] += 1
            except Exception as exc:
                stats["failed"] += 1
                print(f"Failed table {tid}: {exc}")

        for room in rooms:
            rid = str(room.get("_id"))
            provider_id = str(room.get("provider_id")) if room.get("provider_id") else None
            provider = provider_by_id.get(provider_id, {})
            entity = {
                "id": rid,
                "entity_type": "room",
                "provider_id": provider_id,
                "provider_name": provider.get("name"),
                "name": room.get("name"),
                "description": f"Tip: {room.get('space_type')}, Capacitate: {room.get('capacity')}",
                "category": provider.get("category"),
                "category_aliases": _category_aliases(provider.get("category")),
                "status": room.get("status"),
                "location": _normalize_location(provider),
                "amenities": room.get("amenities") or [],
            }
            try:
                await _upsert_entity(http, rag_base, _to_jsonable(entity))
                stats["room"] += 1
            except Exception as exc:
                stats["failed"] += 1
                print(f"Failed room {rid}: {exc}")

        for experience in experiences:
            eid = str(experience.get("_id"))
            entity = {
                "id": eid,
                "entity_type": "experience",
                "provider_id": str(experience.get("user_id") or ""),
                "provider_name": None,
                "name": experience.get("name"),
                "description": experience.get("description"),
                "category": "experience",
                "category_aliases": _category_aliases(experience.get("experience_type") or "experience"),
                "experience_type": experience.get("experience_type"),
                "status": experience.get("status"),
                "location": {
                    "address": experience.get("meeting_point"),
                    "city": "Timisoara",
                    "country": "Romania",
                    "latitude": experience.get("meeting_latitude"),
                    "longitude": experience.get("meeting_longitude"),
                },
                "amenities": [],
                "working_hours": experience.get("available_dates") or [],
            }
            try:
                await _upsert_entity(http, rag_base, _to_jsonable(entity))
                stats["experience"] += 1
            except Exception as exc:
                stats["failed"] += 1
                print(f"Failed experience {eid}: {exc}")

    client.close()
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill service ecosystem to HF Space RAG")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of providers")
    parser.add_argument("--all", action="store_true", help="Include non-active entities")
    args = parser.parse_args()

    stats = asyncio.run(backfill(args.limit, args.all))
    print("Backfill services complete:")
    for key, value in stats.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
