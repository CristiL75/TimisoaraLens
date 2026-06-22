import os
import sys
import types
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-security-tests")
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017/TimisoaraLensTest")
os.environ.setdefault("HF_RAG_SPACE_URL", "")
os.environ.pop("RENDER", None)
os.environ.pop("APP_ENV", None)
os.environ.pop("ENVIRONMENT", None)

try:
    import stripe  # noqa: F401
except ModuleNotFoundError:
    class SignatureVerificationError(Exception):
        pass

    class StripeError(Exception):
        pass

    class CardError(StripeError):
        pass

    class FakeWebhook:
        @staticmethod
        def construct_event(payload, signature, secret):
            raise SignatureVerificationError("Invalid signature")

    class FakePaymentIntent:
        @staticmethod
        def create(*args, **kwargs):
            raise StripeError("Stripe test stub")

        @staticmethod
        def capture(*args, **kwargs):
            raise StripeError("Stripe test stub")

        @staticmethod
        def cancel(*args, **kwargs):
            raise StripeError("Stripe test stub")

    fake_stripe = types.SimpleNamespace(
        api_key=None,
        Webhook=FakeWebhook,
        PaymentIntent=FakePaymentIntent,
        error=types.SimpleNamespace(
            SignatureVerificationError=SignatureVerificationError,
            StripeError=StripeError,
            CardError=CardError,
        ),
    )
    sys.modules["stripe"] = fake_stripe
