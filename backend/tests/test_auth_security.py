from datetime import timedelta

from jose import jwt

from auth_utils import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_password_hash,
    verify_password,
    verify_token,
)


def test_passwords_are_hashed_and_verified():
    password = "ParolaTest123!"

    hashed = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("parola-gresita", hashed)


def test_access_token_is_valid_and_contains_jti():
    token = create_access_token(
        {"sub": "testuser", "username": "testuser", "email": "test@example.com"},
        expires_delta=timedelta(minutes=5),
    )

    token_data = verify_token(token)

    assert token_data is not None
    assert token_data.username == "testuser"
    assert token_data.email == "test@example.com"
    assert token_data.jti


def test_verify_token_rejects_non_access_tokens():
    refresh_like_token = jwt.encode(
        {
            "sub": "testuser",
            "email": "test@example.com",
            "typ": "refresh",
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    assert verify_token(refresh_like_token) is None
