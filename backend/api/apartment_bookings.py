"""
Apartment Bookings Module - Stripe-powered reservation flow
=========================================================
Flow:
  1. Guest creates a booking request (POST /{listing_id}/booking-requests)
     - Validates date availability (no overlapping confirmed/pending bookings)
     - Computes total = price_per_night × nights
     - Creates a Stripe PaymentIntent with capture_method=manual + customer_email metadata
     - Saves ApartmentBookingRequest with status='pending'

  2. Owner reviews incoming requests (GET /my-incoming-requests)

  3. Owner accepts → Stripe PaymentIntent captured → status='confirmed'
      OR
     Owner rejects → Stripe PaymentIntent cancelled → status='rejected'

  4. Guest can cancel while still 'pending' (POST /{req_id}/cancel)

  5. Stripe webhook for async payment events (POST /webhook)

Prerequisites in .env:
  STRIPE_SECRET_KEY=sk_live_...   (or sk_test_... for testing)
  STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe dashboard → Webhooks)
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
import os
import logging
import stripe
from bson import ObjectId

from database_mongo import get_database
from api.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Stripe configuration
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
else:
    logger.warning("[APT-BOOKINGS] STRIPE_SECRET_KEY not set — Stripe calls will fail")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ApartmentBookingRequestCreate(BaseModel):
    check_in: str           # "2026-03-10"
    check_out: str          # "2026-03-15"
    guests: int = 1
    payment_method_id: str  # Stripe pm_xxx from frontend (use PaymentSheet / confirmPayment)
    notes: Optional[str] = None


class ApartmentBookingRequestOut(BaseModel):
    id: str
    listing_id: str
    listing_title: str
    listing_address: Optional[str] = None
    listing_image: Optional[str] = None
    guest_user_id: str
    guest_name: str
    guest_email: str
    owner_user_id: str
    check_in: str
    check_out: str
    nights: int
    price_per_night: float
    total_amount: float
    currency: str = "ron"
    guests: int = 1
    notes: Optional[str] = None
    stripe_payment_intent_id: str
    stripe_client_secret: Optional[str] = None   # only returned to guest at creation time
    status: str  # pending | confirmed | rejected | cancelled
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _serialize_apt_booking(doc: dict, include_client_secret: bool = False) -> dict:
    """Normalize MongoDB doc → dict safe for JSON response."""
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    # Convert datetimes
    for field in ("created_at", "updated_at"):
        if isinstance(out.get(field), datetime):
            out[field] = out[field].isoformat()
    if not include_client_secret:
        out.pop("stripe_client_secret", None)
    return out


def _parse_date(d: str, field_name: str) -> date:
    try:
        return date.fromisoformat(d)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format for '{field_name}'. Use YYYY-MM-DD.")


async def _check_overlap(db, listing_id: str, check_in: str, check_out: str, exclude_req_id: Optional[str] = None):
    """
    Return True if there is any existing confirmed/pending booking for this listing
    that overlaps with [check_in, check_out).
    Two ranges overlap when: reqA.check_in < reqB.check_out AND reqA.check_out > reqB.check_in
    """
    query: dict = {
        "listing_id": listing_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$and": [
            {"check_in": {"$lt": check_out}},
            {"check_out": {"$gt": check_in}},
        ],
    }
    if exclude_req_id:
        query["_id"] = {"$ne": ObjectId(exclude_req_id)}

    count = await db.apartment_booking_requests.count_documents(query)
    return count > 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/{listing_id}/booking-requests", summary="Guest: create booking request + Stripe PaymentIntent")
async def create_booking_request(
    listing_id: str,
    body: ApartmentBookingRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Guest creates a booking request for an apartment listing.
    A Stripe PaymentIntent is created with **capture_method=manual** so that
    the card is only *authorised* — funds are captured only when the owner accepts.
    Returns the Stripe **client_secret** so the frontend can confirm the payment method.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured.")

    db = await get_database()

    # --- Resolve listing ---
    try:
        listing = await db.listings.find_one({"_id": ObjectId(listing_id)})
    except Exception:
        listing = None
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    # --- Validate dates ---
    ci = _parse_date(body.check_in, "check_in")
    co = _parse_date(body.check_out, "check_out")
    today = date.today()
    if ci < today:
        raise HTTPException(status_code=400, detail="Check-in date cannot be in the past.")
    if co <= ci:
        raise HTTPException(status_code=400, detail="check_out must be after check_in.")
    nights = (co - ci).days

    # --- Check availability ---
    overlaps = await _check_overlap(db, listing_id, body.check_in, body.check_out)
    if overlaps:
        raise HTTPException(
            status_code=409,
            detail="The selected dates are not available. Another booking overlaps.",
        )

    # --- Compute total ---
    price_per_night: float = float(listing.get("price_per_night", 0))
    total_amount: float = round(price_per_night * nights, 2)
    # Stripe amounts in smallest unit; RON doesn't have sub-units in Stripe
    # Use currency 'ron' and amount in bani (1 RON = 100 bani)
    stripe_amount = int(round(total_amount * 100))

    # --- Owner info ---
    owner_user_id: str = str(listing.get("user_id", ""))
    if owner_user_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot book your own listing.")

    # --- Guest info ---
    guest_user_id = str(current_user["_id"])
    guest_name = current_user.get("full_name") or current_user.get("username") or "Guest"
    guest_email = current_user.get("email", "")

    # --- Create Stripe PaymentIntent (manual capture) ---
    try:
        intent = stripe.PaymentIntent.create(
            amount=stripe_amount,
            currency="ron",
            capture_method="manual",
            payment_method=body.payment_method_id,
            confirm=True,  # Immediately confirm so funds are authorised
            return_url="timisoaralens://stripe-return",  # required for 3DS redirects
            metadata={
                "listing_id": listing_id,
                "listing_title": listing.get("title", ""),
                "guest_user_id": guest_user_id,
                "owner_user_id": owner_user_id,
                "check_in": body.check_in,
                "check_out": body.check_out,
                "nights": str(nights),
            },
        )
    except stripe.error.CardError as e:
        raise HTTPException(status_code=402, detail=f"Card error: {e.user_message}")
    except stripe.error.StripeError as e:
        logger.error("[APT-BOOKINGS] Stripe error: %s", e)
        raise HTTPException(status_code=502, detail=f"Payment service error: {str(e)}")

    # --- Persist booking request ---
    owner_contact = listing.get("owner", {})
    listing_address = (listing.get("location") or {}).get("address", "")
    images = listing.get("images", [])
    listing_image = images[0] if images else None

    now = datetime.utcnow()
    doc = {
        "listing_id": listing_id,
        "listing_title": listing.get("title", ""),
        "listing_address": listing_address,
        "listing_image": listing_image,
        "guest_user_id": guest_user_id,
        "guest_name": guest_name,
        "guest_email": guest_email,
        "owner_user_id": owner_user_id,
        "check_in": body.check_in,
        "check_out": body.check_out,
        "nights": nights,
        "price_per_night": price_per_night,
        "total_amount": total_amount,
        "currency": "ron",
        "guests": body.guests,
        "notes": body.notes,
        "stripe_payment_intent_id": intent.id,
        "stripe_client_secret": intent.client_secret,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.apartment_booking_requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    return {
        "success": True,
        "booking_request": _serialize_apt_booking(doc, include_client_secret=True),
    }


@router.get("/my-requests", summary="Guest: list own outgoing booking requests")
async def get_my_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Returns all booking requests made by the authenticated guest."""
    db = await get_database()
    guest_user_id = str(current_user["_id"])
    query: dict = {"guest_user_id": guest_user_id}
    if status:
        query["status"] = status
    cursor = db.apartment_booking_requests.find(query).sort("created_at", -1)
    requests = [_serialize_apt_booking(doc) async for doc in cursor]
    return {"success": True, "requests": requests}


@router.get("/my-incoming-requests", summary="Owner: list incoming booking requests for own listings")
async def get_incoming_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Returns all booking requests sent to the authenticated listing owner."""
    db = await get_database()
    owner_user_id = str(current_user["_id"])
    query: dict = {"owner_user_id": owner_user_id}
    if status:
        query["status"] = status
    cursor = db.apartment_booking_requests.find(query).sort("created_at", -1)
    requests = [_serialize_apt_booking(doc) async for doc in cursor]
    return {"success": True, "requests": requests}


@router.get("/booking-requests/{req_id}", summary="Get booking request details")
async def get_booking_request(
    req_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Returns full details for a booking request. Only owner or guest may access."""
    db = await get_database()
    try:
        doc = await db.apartment_booking_requests.find_one({"_id": ObjectId(req_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    uid = str(current_user["_id"])
    if doc["guest_user_id"] != uid and doc["owner_user_id"] != uid:
        raise HTTPException(status_code=403, detail="Access denied.")

    return {"success": True, "booking_request": _serialize_apt_booking(doc)}


@router.post("/booking-requests/{req_id}/accept", summary="Owner: accept booking request → capture payment")
async def accept_booking_request(
    req_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Owner accepts the booking:
      - Verifies ownership
      - Captures the Stripe PaymentIntent (charges the guest)
      - Updates status to 'confirmed'
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured.")

    db = await get_database()
    try:
        doc = await db.apartment_booking_requests.find_one({"_id": ObjectId(req_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    if doc["owner_user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only the listing owner can accept bookings.")

    if doc["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot accept a request with status '{doc['status']}'.",
        )

    # --- Capture Stripe PaymentIntent ---
    try:
        intent = stripe.PaymentIntent.capture(doc["stripe_payment_intent_id"])
    except stripe.error.StripeError as e:
        logger.error("[APT-BOOKINGS] Stripe capture error: %s", e)
        raise HTTPException(status_code=502, detail=f"Payment capture failed: {str(e)}")

    # --- Update status ---
    now = datetime.utcnow()
    await db.apartment_booking_requests.update_one(
        {"_id": ObjectId(req_id)},
        {"$set": {"status": "confirmed", "updated_at": now}},
    )
    doc["status"] = "confirmed"
    doc["updated_at"] = now

    return {"success": True, "message": "Booking confirmed and payment captured.", "booking_request": _serialize_apt_booking(doc)}


@router.post("/booking-requests/{req_id}/reject", summary="Owner: reject booking request → cancel payment")
async def reject_booking_request(
    req_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Owner rejects the booking:
      - Verifies ownership
      - Cancels the Stripe PaymentIntent (releases the hold, no charge)
      - Updates status to 'rejected'
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured.")

    db = await get_database()
    try:
        doc = await db.apartment_booking_requests.find_one({"_id": ObjectId(req_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    if doc["owner_user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only the listing owner can reject bookings.")

    if doc["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot reject a request with status '{doc['status']}'.",
        )

    # --- Cancel Stripe PaymentIntent ---
    try:
        stripe.PaymentIntent.cancel(doc["stripe_payment_intent_id"])
    except stripe.error.StripeError as e:
        logger.error("[APT-BOOKINGS] Stripe cancel error: %s", e)
        raise HTTPException(status_code=502, detail=f"Payment cancellation failed: {str(e)}")

    # --- Update status ---
    now = datetime.utcnow()
    await db.apartment_booking_requests.update_one(
        {"_id": ObjectId(req_id)},
        {"$set": {"status": "rejected", "updated_at": now}},
    )
    doc["status"] = "rejected"
    doc["updated_at"] = now

    return {"success": True, "message": "Booking request rejected and payment released.", "booking_request": _serialize_apt_booking(doc)}


@router.post("/booking-requests/{req_id}/cancel", summary="Guest: cancel own pending booking request")
async def cancel_booking_request(
    req_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Guest cancels their own booking request (only while still 'pending').
    Cancels the Stripe PaymentIntent so no money is charged.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured.")

    db = await get_database()
    try:
        doc = await db.apartment_booking_requests.find_one({"_id": ObjectId(req_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    if doc["guest_user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only cancel your own booking requests.")

    if doc["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel a request with status '{doc['status']}'. "
                   "Contact support for confirmed/rejected bookings.",
        )

    # --- Cancel Stripe PaymentIntent ---
    try:
        stripe.PaymentIntent.cancel(doc["stripe_payment_intent_id"])
    except stripe.error.StripeError as e:
        logger.error("[APT-BOOKINGS] Stripe cancel error: %s", e)
        raise HTTPException(status_code=502, detail=f"Payment cancellation failed: {str(e)}")

    # --- Update status ---
    now = datetime.utcnow()
    await db.apartment_booking_requests.update_one(
        {"_id": ObjectId(req_id)},
        {"$set": {"status": "cancelled", "updated_at": now}},
    )
    doc["status"] = "cancelled"
    doc["updated_at"] = now

    return {"success": True, "message": "Booking request cancelled.", "booking_request": _serialize_apt_booking(doc)}


# ---------------------------------------------------------------------------
# Stripe Webhook
# ---------------------------------------------------------------------------

@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Handles async Stripe events (e.g. payment_intent.payment_failed).
    Registered in the Stripe Dashboard → Developers → Webhooks.
    Set the Endpoint URL to: https://timisoaralens.onrender.com/api/apartment-bookings/webhook
    Events to listen to:
      - payment_intent.succeeded
      - payment_intent.payment_failed
      - payment_intent.canceled
    """
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("[APT-BOOKINGS] Webhook received but STRIPE_WEBHOOK_SECRET is not set; skipping verification.")
        return {"received": True}

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = await get_database()
    pi_id: str = ""

    if event["type"] == "payment_intent.payment_failed":
        pi_id = event["data"]["object"]["id"]
        logger.warning("[APT-BOOKINGS] PaymentIntent %s failed — marking as rejected", pi_id)
        await db.apartment_booking_requests.update_many(
            {"stripe_payment_intent_id": pi_id, "status": "pending"},
            {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}},
        )

    elif event["type"] == "payment_intent.canceled":
        pi_id = event["data"]["object"]["id"]
        logger.info("[APT-BOOKINGS] PaymentIntent %s cancelled via webhook", pi_id)
        await db.apartment_booking_requests.update_many(
            {"stripe_payment_intent_id": pi_id, "status": "pending"},
            {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}},
        )

    elif event["type"] == "payment_intent.succeeded":
        # Happens for immediate-capture intents (not manual). Log only.
        pi_id = event["data"]["object"]["id"]
        logger.info("[APT-BOOKINGS] PaymentIntent %s succeeded", pi_id)

    return {"received": True}
