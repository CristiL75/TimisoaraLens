"""
Backfill existing listings into HF Space RAG (apartments collection).

Usage:
  python backend/scripts/backfill_listings_to_rag.py --status active --limit 100

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
    # Minimal .env loader to avoid extra dependencies.
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
            value = value.strip().strip("\"")
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


async def backfill(status: Optional[str], limit: Optional[int], all_statuses: bool) -> int:
    _load_dotenv()
    mongo_url = _get_env("MONGODB_URL", "mongodb://localhost:27017/TimisoaraLens")
    db_name = _get_env("DATABASE_NAME", "TimisoaraLens")
    rag_base = _get_env("RAG_BASE_URL") or _get_env("HF_RAG_SPACE_URL")

    if not rag_base:
        raise RuntimeError("Missing RAG_BASE_URL or HF_RAG_SPACE_URL")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    query = {}
    if status and not all_statuses:
        query["status"] = status

    total = await db.listings.count_documents(query)
    print(f"Matched {total} listings in {db_name} (query={query}).")
    if total == 0:
        client.close()
        return 0

    cursor = db.listings.find(query)
    if limit:
        cursor = cursor.limit(limit)

    count = 0
    async with httpx.AsyncClient(timeout=20.0) as http:
        async for listing in cursor:
            listing["id"] = str(listing.pop("_id"))
            listing = _to_jsonable(listing)
            try:
                resp = await http.post(
                    f"{rag_base}/rag/apartments/upsert",
                    json={"listing": listing},
                )
                if resp.status_code >= 400:
                    raise RuntimeError(f"{resp.status_code} {resp.text}")
                count += 1
                if count % 25 == 0:
                    print(f"Backfilled {count} listings...")
            except Exception as exc:
                print(f"Failed to backfill listing {listing.get('id')}: {exc}")

    client.close()
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill listings to HF Space RAG")
    parser.add_argument("--status", default="active", help="Filter by status (default: active)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of listings")
    parser.add_argument("--all", action="store_true", help="Ignore status filter")
    args = parser.parse_args()

    total = asyncio.run(backfill(args.status, args.limit, args.all))
    print(f"Done. Backfilled {total} listings.")


if __name__ == "__main__":
    main()
