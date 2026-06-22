import asyncio

import pytest
from fastapi import HTTPException

from api import apartment_bookings


def run_async(coro):
    return asyncio.run(coro)


def test_stripe_webhook_rejects_missing_secret(monkeypatch):
    monkeypatch.setattr(apartment_bookings, "STRIPE_WEBHOOK_SECRET", "")

    with pytest.raises(HTTPException) as exc:
        run_async(apartment_bookings.stripe_webhook(request=None, stripe_signature=None))

    assert exc.value.status_code == 503
    assert "verification is not configured" in exc.value.detail


def test_stripe_webhook_rejects_missing_signature(monkeypatch):
    monkeypatch.setattr(apartment_bookings, "STRIPE_WEBHOOK_SECRET", "whsec_test")

    with pytest.raises(HTTPException) as exc:
        run_async(apartment_bookings.stripe_webhook(request=None, stripe_signature=None))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Missing Stripe signature."


class FakeRequest:
    async def body(self):
        return b"not-a-valid-stripe-payload"


def test_stripe_webhook_rejects_invalid_payload(monkeypatch):
    monkeypatch.setattr(apartment_bookings, "STRIPE_WEBHOOK_SECRET", "whsec_test")

    with pytest.raises(HTTPException) as exc:
        run_async(
            apartment_bookings.stripe_webhook(
                request=FakeRequest(),
                stripe_signature="invalid-signature",
            )
        )

    assert exc.value.status_code == 400
