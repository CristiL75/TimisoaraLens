"""
Small audit logging helper.
Keeps operational logs useful while stripping sensitive fields.
"""
import hashlib
import logging
from typing import Any

logger = logging.getLogger("audit")

SENSITIVE_KEYS = {
    "password",
    "hashed_password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "payment_method_id",
    "stripe_client_secret",
    "client_secret",
    "card",
    "secret",
}


def _safe_value(key: str, value: Any) -> Any:
    key_lower = str(key or "").lower()
    if any(sensitive in key_lower for sensitive in SENSITIVE_KEYS):
        return "[redacted]"
    if value is None:
        return None
    if isinstance(value, (int, float, bool)):
        return value
    text = str(value)
    if "email" in key_lower:
        return hashlib.sha256(text.lower().encode("utf-8")).hexdigest()[:12]
    if len(text) > 120:
        return f"{text[:117]}..."
    return text


def audit_log(event: str, **fields: Any) -> None:
    safe_fields = {key: _safe_value(key, value) for key, value in fields.items()}
    logger.info("%s %s", event, safe_fields)
