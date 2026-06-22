from types import SimpleNamespace

from main import SimpleRateLimiter


class FakeHeaders(dict):
    def get(self, key, default=None):
        return super().get(key.lower(), default)


def make_request(path: str, ip: str = "127.0.0.1"):
    return SimpleNamespace(
        url=SimpleNamespace(path=path),
        headers=FakeHeaders({"x-forwarded-for": ip}),
        client=SimpleNamespace(host=ip),
    )


def test_login_rate_limit_blocks_after_configured_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")
    monkeypatch.setenv("RATE_LIMIT_AUTH_MAX_REQUESTS", "2")

    limiter = SimpleRateLimiter()
    request = make_request("/api/auth/login-json")

    assert limiter.check(request)[0] is True
    assert limiter.check(request)[0] is True

    allowed, limit, retry_after = limiter.check(request)

    assert allowed is False
    assert limit == 2
    assert retry_after > 0


def test_rate_limit_uses_different_buckets_for_ai_routes(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")
    monkeypatch.setenv("RATE_LIMIT_ASSISTANT_MAX_REQUESTS", "1")
    monkeypatch.setenv("RATE_LIMIT_RAG_MAX_REQUESTS", "1")

    limiter = SimpleRateLimiter()
    assistant_request = make_request("/api/bookings/assistant")
    rag_request = make_request("/api/rag/query")

    assert limiter.check(assistant_request)[0] is True
    assert limiter.check(assistant_request)[0] is False

    assert limiter.check(rag_request)[0] is True
    assert limiter.check(rag_request)[0] is False
