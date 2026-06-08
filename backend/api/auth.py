"""
Authentication API endpoints
Register, Login, User management, Google OAuth
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
from jose import JWTError, jwt
from bson import ObjectId
import os
import hashlib
import secrets

from database_mongo import (
    get_users_collection,
    get_refresh_tokens_collection,
    get_revoked_access_tokens_collection,
    UserModel
)
from auth_utils import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    verify_token,
    Token,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

router = APIRouter()

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Request/Response Models
class UserRegister(BaseModel):
    """User registration model"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    
    @validator('username')
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v
    
    @validator('password')
    def password_valid(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    """User login model"""
    username: str
    password: str

class RefreshTokenRequest(BaseModel):
    """Refresh token request model"""
    refresh_token: str

class LogoutRequest(BaseModel):
    """Logout request model"""
    refresh_token: Optional[str] = None


def _hash_refresh_token(refresh_token: str) -> str:
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()


def _create_refresh_token_value() -> str:
    return secrets.token_urlsafe(48)


async def _store_refresh_token(user: dict) -> str:
    refresh_token = _create_refresh_token_value()
    refresh_tokens = get_refresh_tokens_collection()
    now = datetime.utcnow()
    await refresh_tokens.insert_one({
        "token_hash": _hash_refresh_token(refresh_token),
        "user_id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "created_at": now,
        "expires_at": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "revoked_at": None,
        "replaced_by": None,
    })
    return refresh_token


async def _issue_token_pair(user: dict) -> Token:
    access_token = create_access_token(
        data={"sub": user["username"], "username": user["username"], "email": user["email"]}
    )
    refresh_token = await _store_refresh_token(user)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def _revoke_access_token_from_header(request: Request) -> None:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_exp": False},
        )
    except JWTError:
        return

    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti:
        return

    expires_at = datetime.utcfromtimestamp(exp) if exp else datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    revoked_tokens = get_revoked_access_tokens_collection()
    await revoked_tokens.update_one(
        {"jti": jti},
        {
            "$setOnInsert": {
                "jti": jti,
                "revoked_at": datetime.utcnow(),
                "expires_at": expires_at,
            }
        },
        upsert=True,
    )


async def _revoke_refresh_token(refresh_token: Optional[str]) -> None:
    if not refresh_token:
        return
    refresh_tokens = get_refresh_tokens_collection()
    await refresh_tokens.update_one(
        {
            "token_hash": _hash_refresh_token(refresh_token),
            "revoked_at": None,
        },
        {"$set": {"revoked_at": datetime.utcnow()}},
    )

# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Get current authenticated user from token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token)
    if token_data is None or token_data.username is None:
        raise credentials_exception

    if token_data.jti:
        revoked_tokens = get_revoked_access_tokens_collection()
        revoked = await revoked_tokens.find_one({"jti": token_data.jti})
        if revoked:
            raise credentials_exception
    
    users_collection = get_users_collection()
    user = await users_collection.find_one({"username": token_data.username})
    
    if user is None:
        raise credentials_exception
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Convert ObjectId to string
    user["_id"] = str(user["_id"])
    # Provide common id aliases so other modules can reliably read the id
    user["user_id"] = user["_id"]
    user["id"] = user["_id"]
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """
    Register a new user
    """
    users_collection = get_users_collection()
    
    # Check if email already exists
    existing_email = await users_collection.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = await users_collection.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user document
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "email": user_data.email,
        "username": user_data.username,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "is_active": True,
        "is_admin": False,
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    
    # Insert into MongoDB
    result = await users_collection.insert_one(user_doc)
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    
    # Convert ObjectId to string for response
    created_user["_id"] = str(created_user["_id"])
    
    return UserResponse(
        id=created_user["_id"],
        email=created_user["email"],
        username=created_user["username"],
        full_name=created_user.get("full_name"),
        is_active=created_user["is_active"],
        created_at=created_user["created_at"]
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login user and return JWT token
    Uses OAuth2PasswordRequestForm for compatibility with Swagger UI
    """
    users_collection = get_users_collection()
    
    # Find user by username
    user = await users_collection.find_one({"username": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return await _issue_token_pair(user)

@router.post("/login-json", response_model=Token)
async def login_json(user_data: UserLogin):
    """
    Login user with JSON body (pentru React Native)
    Alternative endpoint for mobile app
    """
    users_collection = get_users_collection()
    user = await users_collection.find_one({"username": user_data.username})
    
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return await _issue_token_pair(user)

@router.post("/refresh", response_model=Token)
async def refresh_token(body: RefreshTokenRequest):
    """
    Rotate refresh token and return a fresh access token.
    """
    refresh_tokens = get_refresh_tokens_collection()
    token_hash = _hash_refresh_token(body.refresh_token)
    now = datetime.utcnow()

    token_doc = await refresh_tokens.find_one({
        "token_hash": token_hash,
        "revoked_at": None,
        "expires_at": {"$gt": now},
    })
    if not token_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    users_collection = get_users_collection()
    user = None
    user_id = token_doc.get("user_id")
    if user_id and ObjectId.is_valid(user_id):
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        user = await users_collection.find_one({"email": token_doc.get("email")})
    if not user or not user.get("is_active", True):
        await refresh_tokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"revoked_at": now}},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_token_pair = await _issue_token_pair(user)
    await refresh_tokens.update_one(
        {"_id": token_doc["_id"]},
        {
            "$set": {
                "revoked_at": now,
                "replaced_by": _hash_refresh_token(new_token_pair.refresh_token),
            }
        },
    )
    return new_token_pair

@router.post("/logout")
async def logout(body: LogoutRequest, request: Request):
    """
    Revoke the current refresh token and access token.
    """
    await _revoke_refresh_token(body.refresh_token)
    await _revoke_access_token_from_header(request)
    return {"success": True}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user information
    Requires authentication
    """
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        username=current_user["username"],
        full_name=current_user.get("full_name"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"]
    )

@router.get("/users/count")
async def get_users_count():
    """
    Get total number of registered users (public endpoint)
    """
    users_collection = get_users_collection()
    count = await users_collection.count_documents({})
    return {"total_users": count}

# Google OAuth Models
class GoogleSignIn(BaseModel):
    """Google Sign-In token model"""
    token: str  # Google ID token from client

class GoogleAuthCode(BaseModel):
    """Google Authorization Code model"""
    code: str  # Authorization code from Google
    redirect_uri: str  # Same redirect URI used in the request

@router.post("/google/exchange", response_model=Token)
async def google_exchange_code(auth_data: GoogleAuthCode):
    """
    Exchange Google authorization code for tokens
    Professional OAuth 2.0 Authorization Code Flow
    """
    import httpx
    
    try:
        # Get Google credentials from environment
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
        
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured on server"
            )
        
        # Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": auth_data.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": auth_data.redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code: {token_response.text}"
                )
            
            tokens = token_response.json()
            id_token_str = tokens.get("id_token")
            
            if not id_token_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No ID token received from Google"
                )
        
        # Verify and decode the ID token
        idinfo = id_token.verify_oauth2_token(
            id_token_str, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user info from Google token
        google_user_id = idinfo['sub']
        email = idinfo.get('email')
        full_name = idinfo.get('name')
        picture = idinfo.get('picture')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        users_collection = get_users_collection()
        
        # Check if user exists by email
        existing_user = await users_collection.find_one({"email": email})
        
        if existing_user:
            # User exists - update last login
            await users_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            return await _issue_token_pair(existing_user)
        
        else:
            # New user - create account
            # Generate username from email
            username = email.split('@')[0]
            
            # Check if username exists, append number if needed
            username_exists = await users_collection.find_one({"username": username})
            if username_exists:
                counter = 1
                while await users_collection.find_one({"username": f"{username}{counter}"}):
                    counter += 1
                username = f"{username}{counter}"
            
            # Create new user document
            user_doc = {
                "email": email,
                "username": username,
                "hashed_password": "",  # No password for Google users
                "full_name": full_name,
                "is_active": True,
                "is_admin": False,
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "google_id": google_user_id,
                "picture": picture,
                "auth_provider": "google"
            }
            
            # Insert into MongoDB
            result = await users_collection.insert_one(user_doc)
            
            created_user = await users_collection.find_one({"_id": result.inserted_id})
            return await _issue_token_pair(created_user)
    
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None):
    """
    Google OAuth callback endpoint
    This receives the authorization code from Google and redirects back to the app
    """
    from fastapi.responses import RedirectResponse
    
    if error:
        # Redirect to app with error
        return RedirectResponse(url=f"timisoaralens://auth?error={error}")
    
    if code:
        # Redirect to app with authorization code
        return RedirectResponse(url=f"timisoaralens://auth?code={code}")
    
    return {"error": "No code provided"}

@router.post("/google", response_model=Token)
async def google_sign_in(google_data: GoogleSignIn):
    """
    Google Sign-In authentication
    Validates Google ID token and creates/logs in user
    """
    try:
        # Get Google Client ID from environment
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured on server"
            )
        
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            google_data.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user info from Google token
        google_user_id = idinfo['sub']
        email = idinfo.get('email')
        full_name = idinfo.get('name')
        picture = idinfo.get('picture')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        users_collection = get_users_collection()
        
        # Check if user exists by email
        existing_user = await users_collection.find_one({"email": email})
        
        if existing_user:
            # User exists - update last login
            await users_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            return await _issue_token_pair(existing_user)
        
        else:
            # New user - create account
            # Generate username from email
            username = email.split('@')[0]
            
            # Check if username exists, append number if needed
            username_exists = await users_collection.find_one({"username": username})
            if username_exists:
                counter = 1
                while await users_collection.find_one({"username": f"{username}{counter}"}):
                    counter += 1
                username = f"{username}{counter}"
            
            # Create new user document
            user_doc = {
                "email": email,
                "username": username,
                "hashed_password": "",  # No password for Google users
                "full_name": full_name,
                "is_active": True,
                "is_admin": False,
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "google_id": google_user_id,
                "picture": picture,
                "auth_provider": "google"
            }
            
            # Insert into MongoDB
            result = await users_collection.insert_one(user_doc)
            
            created_user = await users_collection.find_one({"_id": result.inserted_id})
            return await _issue_token_pair(created_user)
    
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )
