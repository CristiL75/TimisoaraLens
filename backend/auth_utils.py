"""
Authentication utilities
JWT token generation, password hashing, user verification
"""
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
import os
import uuid

# JWT settings
DEFAULT_SECRET_KEY = "your-secret-key-change-this-in-production-12345"


def _load_secret_key() -> str:
    configured_secret = os.getenv("SECRET_KEY")
    environment = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").strip().lower()
    is_production = environment in {"prod", "production"} or bool(os.getenv("RENDER"))

    if configured_secret and configured_secret != DEFAULT_SECRET_KEY:
        return configured_secret

    if is_production:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong, non-default value in production."
        )

    return DEFAULT_SECRET_KEY


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None

class TokenData(BaseModel):
    """Token data model"""
    username: Optional[str] = None
    email: Optional[str] = None
    jti: Optional[str] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Hash a password"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    
    Args:
        data: Data to encode in token (usually username/email)
        expires_delta: Token expiration time
    
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),
        "typ": "access",
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def verify_token(token: str) -> Optional[TokenData]:
    """
    Verify and decode JWT token
    
    Args:
        token: JWT token to verify
    
    Returns:
        TokenData if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        email: str = payload.get("email")
        token_type: str = payload.get("typ")
        jti: str = payload.get("jti")
        
        if username is None or token_type != "access":
            return None
        
        return TokenData(username=username, email=email, jti=jti)
    
    except JWTError:
        return None


from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-json")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    from jose import jwt
    from database_mongo import get_users_collection, get_revoked_access_tokens_collection
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("email")
    username = payload.get("username")
    token_type = payload.get("typ")
    jti = payload.get("jti")
    if not email or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if jti:
        revoked_tokens = get_revoked_access_tokens_collection()
        revoked = await revoked_tokens.find_one({"jti": jti})
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
    # Caută userul în MongoDB după email și returnează _id-ul real
    import asyncio
    users_col = get_users_collection()
    user_doc = await users_col.find_one({"email": email})
    user_id = str(user_doc["_id"]) if user_doc and "_id" in user_doc else None
    return {"email": email, "username": username, "id": user_id, "_id": user_id}
