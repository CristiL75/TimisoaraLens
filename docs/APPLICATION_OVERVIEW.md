# TimisoaraLens - Descriere Aplicație și Facilități Implementate

## 1. PRIVIRE DE ANSAMBLU

**TimisoaraLens** este o aplicație mobile cross-platform (iOS/Android) care permite utilizatorilor să:
- Exploreze și să se cazeze în apartamente disponibile pentru închiriere pe termen scurt
- Construiască trasee turistice interactive asociate cu anunțurile de apartamente
- Vizualizeze locații pe hartă interactivă cu Date-driven filtering
- **Lase și citește recenzii (reviews) pentru apartamente**

### Tipuri de Utilizatori:
1. **Vizitatori** - Vizualizează apartamente, trasee turistice și recenzii
2. **Proprietari** - Crează, editează și gestionează anunțurile de apartamente
3. **Locatari** - Pot lăsa recenzii și rating-uri pentru apartamentele în care s-au cazat
4. **Toți utilizatorii** - Autentificare, profil, și gestionare date personale

---

## 1.1 LIMBAJE DE PROGRAMARE ȘI TEHNOLOGII DE BAZĂ

### Frontend - Limbaje și Tehnologii
| Aspect | Detalii |
|--------|---------|
| **Limbaj Principal** | **JavaScript** (ES6+/ES2020+) |
| **Dialect** | JSX (JavaScript XML) pentru componente React |
| **Framework** | React Native v0.73 |
| **Runtime** | Node.js (development), native runtime (iOS/Android) |
| **Versiunea JavaScript** | ECMAScript 2020+ cu suport pentru: async/await, destructuring, arrow functions, spread operator |
| **Transpilation** | Babel (transpile ES6+ to ES5 compatible) |
| **Module System** | ES6 modules (import/export) |

**Exemplu - ES6+ Features utilizate:**
```javascript
// Arrow functions
const handleClick = () => { ... }

// Async/await (asynchronous operations)
async function fetchListings() {
  try {
    const response = await APIService.getListings();
    setListings(response);
  } catch (error) {
    setError(error.message);
  }
}

// Destructuring
const { title, description, amenities } = listingData;

// Spread operator
const updatedAmenities = [...amenities, 'WiFi'];

// Template literals
const message = `User ${username} created listing "${title}"`;

// Promise-based operations
fetch(url)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

### Backend - Limbaje și Tehnologii
| Aspect | Detalii |
|--------|---------|
| **Limbaj Principal** | **Python 3.10+** |
| **Caracteristici** | Type hints (PEP 484), dataclasses, async/await native |
| **Versiune Minimă** | Python 3.10 (pentru match statement și union types) |
| **Framework Web** | FastAPI (ASGI-based, async by default) |
| **Server WSGI/ASGI** | Uvicorn (ASGI server) |
| **Package Manager** | pip (Python package installer) |

**Exemplu - Python Features utilizate:**
```python
# Type hints (PEP 484)
def create_listing(user_id: str, listing_data: dict) -> dict:
    pass

# Async/await for asynchronous operations
async def get_listings(skip: int = 0, limit: int = 10) -> List[dict]:
    listings = await db.get_listings(skip, limit)
    return listings

# Dataclasses (simplified object definition)
from dataclasses import dataclass

@dataclass
class User:
    id: str
    email: str
    username: str
    hashed_password: str

# Match statement (Python 3.10+)
match property_type:
    case "apartment":
        return "Apartament"
    case "house":
        return "Casă"
    case _:
        return "Necunoscut"

# F-strings for string interpolation
message = f"User {username} created listing with ID {listing_id}"

# Context managers (with statement)
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.json()
```

### Database - Limbaj & Tehnologie
| Aspect | Detalii |
|--------|---------|
| **Limbaj Query** | MongoDB Query Language (JSON-based) |
| **Format Stocare** | BSON (Binary JSON) |
| **Dialect** | MongoDB 4.4+ |

**Exemplu - MongoDB Query:**
```javascript
// MongoDB query language (JSON-like)
db.listings.find({
  "location": { $near: [45.123, 21.456] },
  "status": "active",
  "price_per_night": { $lte: 100 }
})
```

---

## 2. TEHNOLOGII ȘI BIBLIOTECI UTILIZATE

### 2.1 Frontend - Tehnologii Principale

#### 2.1.1 Framework & Runtime
- **React Native** (v0.73+) - Framework cross-platform pentru iOS/Android
- **Expo** (v51) - Managed service pentru React Native cu acces la native APIs fără compilare

#### 2.1.2 Biblioteci Esențiale

| Biblioteca | Versiune | Funcție |
|---|---|---|
| `react-navigation` | ^6.x | Stack Navigator pentru tranziții între ecrane |
| `react-native-paper` | ^5.x | Material Design UI components |
| `axios` | ^1.x | HTTP client pentru API calls |
| `react-native-maps` | ^1.x | Native mapView cu markere, drag&drop |
| `expo-location` | ^16.x | GPS positioning, reverse geocoding |
| `expo-image-picker` | ^14.x | Camera & photo gallery access |
| `@react-native-async-storage/async-storage` | ^1.x | Key-value persistent storage (10MB) |
| `expo-permissions` | ^13.x | Runtime permission handling |
| `expo-media-library` | ^15.x | Access to device media |

#### 2.1.3 State Management & Context API
- **React Context API** - Global authentication state
  - `AuthContext` - User token, authentication status, auto-login
  - Persisted via AsyncStorage
  - JWT token stored securely locally

#### 2.1.4 Procesarea Datelor
- **JSON Processing**:
  - Formaturi API: `application/json`
  - Axios auto-parses responses
  - Manual JSON stringification pentru form submissions
  - AsyncStorage stores JSON stringified form state

```javascript
// Exemplu: Save form as JSON to AsyncStorage
const formState = {
  title: "...",
  description: "...",
  amenities: ["WiFi", "Parking"],
  images: [...]
};
await AsyncStorage.setItem(
  'createListingFormState',
  JSON.stringify(formState)
);
```

### 2.2 Backend - Tehnologii Principale

#### 2.2.1 Framework & Runtime
- **FastAPI** (Python 3.10+) - Modern async REST API framework
- **Uvicorn** - ASGI server with hot reload in development
- **Python 3.10+** - Type hints, async/await, modern syntax

#### 2.2.2 Biblioteci Backend Esențiale

| Biblioteca | Versiune | Funcție |
|---|---|---|
| `fastapi` | ^0.104+ | Web framework with auto-documentation |
| `python-jose` | ^3.3+ | JWT token creation & verification |
| `passlib[bcrypt]` | ^1.7+ | Password hashing with bcrypt algorithm |
| `motor` | ^3.3+ | Async MongoDB driver |
| `pydantic` | ^2.x | Request/response validation & serialization |
| `python-multipart` | ^0.0.6 | Form data parsing |
| `requests` | ^2.31+ | HTTP client for Nominatim OSM API calls |
| `python-dotenv` | ^1.0+ | Environment variable management |

#### 2.2.3 Baze de Date

**MongoDB Atlas** (Cloud Database):
- **Collections**:
  ```
  ├── users
  │   ├── email (indexed, unique)
  │   ├── username (indexed, unique)
  │   ├── hashed_password (bcrypt)
  │   ├── full_name
  │   ├── is_active
  │   ├── is_admin
  │   ├── created_at
  │   └── last_login
  │
  ├── listings
  │   ├── user_id (indexed, foreign key)
  │   ├── title
  │   ├── description
  │   ├── property_type
  │   ├── location (2dsphere geospatial index)
  │   │   ├── latitude
  │   │   └── longitude
  │   ├── address
  │   ├── price_per_night
  │   ├── amenities (array)
  │   ├── image_urls (array)
  │   ├── suggested_route (nested object)
  │   │   ├── places (array of tourist locations)
  │   │   └── title
  │   ├── contact_name
  │   ├── contact_phone
  │   ├── contact_email
  │   ├── status (active/inactive)
  │   ├── created_at (indexed)
  │   └── updated_at
  │
  └── landmark_visits
      ├── user_id
      ├── landmark_id
      ├── visited_at
      └── distance_meters
  
  └── reviews
      ├── id (ObjectId)
      ├── listing_id (indexed, foreign key)
      ├── user_id (indexed)
      ├── rating (1-5 stars)
      ├── title
      ├── comment
      ├── helpful_count (number of users who found review helpful)
      ├── created_at (indexed)
      └── updated_at
  ```

**Características DB**:
- Geospatial indexing (2dsphere) pentru location-based queries
- Compound indexes pe `user_id + created_at`
- TTL indexes pentru session cleanup (dacă se implementează)
- Connection pooling via Motor (async MongoDB driver)

### 2.3 Integrări Externe

#### 2.3.1 Nominatim OpenStreetMap API
- **URL**: `https://nominatim.openstreetmap.org/`
- **Metode**:
  - `search` - Geocoding (adresa → lat/lng)
  - `reverse` - Reverse geocoding (lat/lng → adresa)
- **Rate Limiting**: 1 request/sec (respectat în aplicație)
- **Response Format**: JSON

```python
# Exemplu backend
response = requests.get(
    f"https://nominatim.openstreetmap.org/search",
    params={
        'q': query,
        'format': 'json',
        'limit': 10
    }
)
```

#### 2.3.2 Google OAuth (Optional Future)
- Can be added via `expo-google-app-auth` for single-sign-on
- Redirect URI: `https://auth.expo.io/@username/appname`

---

## 3. ARHITECTURA APLICAȚIEI

### 3.1 Frontend Architecture

```
Mobile App (React Native + Expo)
│
├── Navigation Layer (React Navigation)
│   ├── Stack Navigator
│   ├── Screen routing
│   └── Transition animations
│
├── Screens (UI Components)
│   ├── Auth Screens (Login, Register)
│   ├── Listings Screens (List, Detail, Create, Edit)
│   ├── Route Builder Screen
│   └── Location Picker Screen
│
├── Context Layer (State Management)
│   └── AuthContext
│       ├── User state
│       ├── Token persistence
│       └── Auto-login logic
│
├── Services Layer
│   ├── APIService
│   │   ├── HTTP client (Axios)
│   │   ├── JWT interceptor
│   │   └── Request/response handlers
│   │
│   └── StorageService
│       ├── Token storage
│       ├── Form state persistence
│       └── Temporary data channels (AsyncStorage)
│
└── Data Layer
    ├── Models (User, Listing, Route, Place)
    ├── AsyncStorage
    └── Native APIs (Location, Camera, Maps)
```

### 3.2 Backend Architecture

```
FastAPI Backend
│
├── API Routers
│   ├── AuthRouter (/auth)
│   │   ├── POST /register
│   │   ├── POST /login
│   │   ├── POST /login-json (JSON body support)
│   │   └── GET /me (current user)
│   │
│   ├── ListingsRouter (/listings)
│   │   ├── POST / (create)
│   │   ├── GET / (list with pagination)
│   │   ├── GET /{id}
│   │   ├── PUT /{id} (update)
│   │   └── DELETE /{id}
│   │
│   └── GPSRouter (/gps)
│       └── GET /cafes (OSM cafes data)
│
├── Database Layer
│   ├── Motor (async MongoDB driver)
│   ├── Collections access
│   └── Connection pooling
│
├── Authentication & Security
│   ├── JWT tokens (python-jose)
│   ├── Password hashing (bcrypt)
│   ├── Token verification middleware
│   └── CORS headers
│
├── Data Validation
│   ├── Pydantic models
│   ├── Request validation
│   └── Response serialization
│
└── External APIs
    └── Nominatim OSM API
        ├── Geocoding
        └── Reverse geocoding
```

---

## 4. COMPONENTE SPECIFICE IMPLEMENTATE

### 4.1 Autentificare & Securitate

**Componenta: JWT Token Management**

```python
# Backend: Token creation (python-jose)
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

**Frontend: Token Persistence (AsyncStorage)**

```javascript
// React Native: Token storage
class AsyncStorageManager {
  static async saveToken(token) {
    await AsyncStorage.setItem('userToken', token);
  }
  
  static async getToken() {
    return await AsyncStorage.getItem('userToken');
  }
  
  static async removeToken() {
    await AsyncStorage.removeItem('userToken');
  }
}
```

**Axios Interceptor: Auto-attach JWT**

```javascript
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### 4.2 Mapare Interactivă & GPS

**Componenta: Native Maps Integration**

```javascript
// react-native-maps: MapView with drag&drop
import MapView, { Marker } from 'react-native-maps';

<MapView
  style={{ flex: 1 }}
  initialRegion={initialRegion}
  onPress={(event) => handleMapPress(event.nativeEvent.coordinate)}
>
  {places.map((place) => (
    <Marker
      key={place.id}
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      draggable
      onDragEnd={(event) => handleMarkerDragEnd(event.nativeEvent.coordinate)}
    >
      <Callout>
        <Text>{place.name}</Text>
      </Callout>
    </Marker>
  ))}
</MapView>
```

**Componenta: GPS Positioning (Expo)**

```javascript
// expo-location: Get device location
import * as Location from 'expo-location';

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    setErrorMsg('Permission to access location was denied');
    return;
  }
  
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });
  
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy
  };
}
```

**Reverse Geocoding (Nominatim API)**

```python
# Backend: Convert coordinates to address
async def reverse_geocode(lat: float, lng: float):
    async with aiohttp.ClientSession() as session:
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lng,
            'format': 'json'
        }
        async with session.get(url, params=params) as response:
            data = await response.json()
            return data.get('address', {})
```

---

### 4.3 Gestionare Imagini & Galerie

**Componenta: Image Picker (Expo)**

```javascript
// expo-image-picker: Camera & gallery access
import * as ImagePicker from 'expo-image-picker';

async function pickImages() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.8
  });
  
  if (!result.cancelled) {
    const imageUris = result.assets.map(asset => asset.uri);
    setImages([...images, ...imageUris]);
  }
}

async function takePhoto() {
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: true,
    aspect: [4, 3]
  });
  
  if (!result.cancelled) {
    setImages([...images, result.assets[0].uri]);
  }
}
```

---

### 4.4 Persistență Date & AsyncStorage

**Componenta: Form State Management (AsyncStorage)**

```javascript
// Auto-save form state to local storage
async function saveFormState() {
  const state = {
    title, description, propertyType,
    latitude, longitude, address,
    pricePerNight, maxGuests, bedrooms, bathrooms,
    amenities, images, contactName, contactPhone, contactEmail,
    timestamp: new Date().toISOString()
  };
  
  await AsyncStorage.setItem(
    'createListingFormState',
    JSON.stringify(state)
  );
}

// Restore on screen focus (only first time)
async function restoreFormState() {
  const saved = await AsyncStorage.getItem('createListingFormState');
  if (saved) {
    const state = JSON.parse(saved);
    setTitle(state.title);
    setDescription(state.description);
    // ... restore all fields
  }
}
```

**Componenta: Temporary Data Channel (Inter-Screen Communication)**

```javascript
// RouteBuilder saves route to AsyncStorage
async function finishRoute() {
  await AsyncStorage.setItem(
    'pendingSuggestedRoute',
    JSON.stringify({
      title: routeTitle,
      places: selectedPlaces
    })
  );
  navigation.goBack();
}

// CreateListing loads route on focus
useFocusEffect(
  useCallback(() => {
    if (isFirstFocus) {
      // Load route from AsyncStorage
      const route = await AsyncStorage.getItem('pendingSuggestedRoute');
      if (route) {
        setSuggestedRoute(JSON.parse(route));
        await AsyncStorage.removeItem('pendingSuggestedRoute');
      }
      setIsFirstFocus(false);
    }
  }, [isFirstFocus])
);
```

---

### 4.5 Operații Asincrone & Threading

**Componenta: Async HTTP Requests (Axios + AsyncTask Pattern)**

```javascript
// Frontend: APIService - simulates async task
class APIService {
  static async createListing(data) {
    try {
      // Loading state managed by component (similar to AsyncTask)
      const response = await axiosInstance.post('/listings', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Network error');
    }
  }
  
  static async getListings(skip = 0, limit = 10) {
    const response = await axiosInstance.get('/listings', {
      params: { skip, limit }
    });
    return response.data;
  }
}

// Component level: AsyncTask-like pattern
const [loading, setLoading] = useState(false);

const handleCreateListing = async () => {
  setLoading(true);
  try {
    await APIService.createListing(formData);
    // Success
  } catch (error) {
    // Error handling
  } finally {
    setLoading(false);
  }
};
```

**Backend: Async Tasks (Motor - Async MongoDB)**

```python
# FastAPI: Async operations via Motor driver
from motor.motor_asyncio import AsyncIOMotorClient

class Database:
    client: AsyncIOMotorClient
    database = None
    
    @classmethod
    async def connect_to_mongo(cls):
        cls.client = AsyncIOMotorClient(MONGODB_URL)
        cls.database = cls.client.timisoaralens
    
    @classmethod
    async def close_mongo_connection(cls):
        cls.client.close()

# Async CRUD operations
async def create_listing(user_id: str, listing_data: dict):
    listings_collection = db.database.listings
    result = await listings_collection.insert_one({
        'user_id': user_id,
        **listing_data,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    })
    return str(result.inserted_id)

async def get_listings(skip: int = 0, limit: int = 10):
    listings_collection = db.database.listings
    listings = await listings_collection.find(
        {'status': 'active'}
    ).skip(skip).limit(limit).to_list(limit)
    return listings
```

---

### 4.6 Procesarea JSON & API Communication

**Request/Response Flow**

```
Frontend (JSON)
    ↓
Axios HTTP Client
    ↓ [JSON stringify/parse]
    ↓
FastAPI Server
    ↓ [Pydantic validation]
    ↓
Backend Processing
    ↓ [JSON serialization]
    ↓
MongoDB
    ↓ [BSON storage]
```

**Exemplu: Listing Creation Flow**

```javascript
// Frontend: JSON preparation
const listingData = {
  title: "Modern Apartment",
  description: "...",
  property_type: "apartment",
  price_per_night: 50,
  amenities: ["WiFi", "Parking", "AC"],
  images: ["file://...", "file://..."],
  suggested_route: {
    title: "Historic Center Tour",
    places: [
      { name: "Cathedral", latitude: 45.123, longitude: 21.456 },
      { name: "Museum", latitude: 45.124, longitude: 21.457 }
    ]
  },
  contact_name: "John Doe",
  contact_phone: "+40...",
  contact_email: "john@example.com"
};

// Axios sends as JSON
const response = await axios.post('/listings', listingData);
```

```python
# Backend: Pydantic validation
from pydantic import BaseModel
from typing import List, Optional

class PlaceSchema(BaseModel):
    name: str
    latitude: float
    longitude: float
    description: Optional[str] = None

class RouteSchema(BaseModel):
    title: str
    places: List[PlaceSchema]

class CreateListingRequest(BaseModel):
    title: str
    description: str
    property_type: str
    price_per_night: float
    amenities: List[str]
    images: List[str]
    suggested_route: Optional[RouteSchema] = None
    contact_name: str
    contact_phone: str
    contact_email: str

@app.post("/listings")
async def create_listing(
    listing: CreateListingRequest,
    current_user: User = Depends(get_current_user)
):
    # Pydantic auto-validates JSON
    # Response automatically serialized back to JSON
    result = await db.create_listing(current_user.id, listing.dict())
    return {"id": result, "status": "created"}
```

---

### 4.7 Review Management & Rating System

**Componenta: Review Listing Screen**

```javascript
// Frontend: Display reviews for an apartment
function ReviewsListScreen({ listingId }) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchReviews();
  }, [listingId]);
  
  const fetchReviews = async () => {
    try {
      const response = await APIService.getReviews(listingId);
      setReviews(response.reviews);
      setAverageRating(response.average_rating);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView>
      {/* Average rating display */}
      <View style={styles.ratingContainer}>
        <Rating rating={averageRating} />
        <Text>{averageRating.toFixed(1)}/5.0</Text>
        <Text>({reviews.length} reviews)</Text>
      </View>
      
      {/* List of reviews */}
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      
      {/* Add review button (if user is authenticated) */}
      <Button title="Add Review" onPress={navigateToAddReview} />
    </ScrollView>
  );
}
```

**Componenta: Add Review Screen**

```javascript
// Frontend: Create/submit a review
function AddReviewScreen({ listingId }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!rating || !title.trim() || !comment.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await APIService.createReview(listingId, {
        rating,
        title,
        comment
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Rating</Text>
      <StarRating 
        rating={rating} 
        onRatingChange={setRating}
        starSize={40}
      />
      
      <Text style={styles.label}>Title</Text>
      <TextInput
        placeholder="Great apartment!"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        maxLength={100}
      />
      
      <Text style={styles.label}>Comment</Text>
      <TextInput
        placeholder="Share your experience..."
        value={comment}
        onChangeText={setComment}
        style={[styles.input, styles.commentInput]}
        multiline
        numberOfLines={5}
        maxLength={500}
      />
      
      <Button
        title={submitting ? "Submitting..." : "Submit Review"}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </ScrollView>
  );
}
```

**Componenta: Review API Endpoints**

```python
# Backend: FastAPI endpoints for reviews

class ReviewsRouter:
    router = APIRouter(prefix="/listings/{listing_id}/reviews", tags=["reviews"])
    
    @router.get("/")
    async def get_reviews(
        listing_id: str,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "newest"  # newest, oldest, rating_high, rating_low
    ) -> dict:
        """
        Get reviews for a specific listing with statistics
        
        Returns:
        {
            "average_rating": 4.5,
            "total_reviews": 25,
            "rating_distribution": {1: 1, 2: 2, 3: 5, 4: 8, 5: 9},
            "reviews": [...]
        }
        """
        reviews_collection = db.database.reviews
        
        # Calculate statistics
        stats = await reviews_collection.aggregate([
            {"$match": {"listing_id": ObjectId(listing_id)}},
            {"$group": {
                "_id": "$listing_id",
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }}
        ]).to_list(1)
        
        # Fetch reviews with sorting
        sort_order = [
            ("created_at", -1) if sort_by == "newest" else ("rating", -1)
        ]
        
        reviews = await reviews_collection.find(
            {"listing_id": ObjectId(listing_id)}
        ).sort(sort_order).skip(skip).limit(limit).to_list(limit)
        
        return {
            "average_rating": stats[0]["average_rating"] if stats else 0,
            "total_reviews": stats[0]["total_reviews"] if stats else 0,
            "reviews": reviews
        }
    
    @router.post("/")
    async def create_review(
        listing_id: str,
        review_data: dict,
        current_user: User = Depends(get_current_user)
    ) -> dict:
        """
        Create a new review for a listing
        
        Body:
        {
            "rating": 5,
            "title": "Excellent!",
            "comment": "Very clean and spacious..."
        }
        """
        reviews_collection = db.database.reviews
        
        # Check if user already reviewed this listing
        existing = await reviews_collection.find_one({
            "listing_id": ObjectId(listing_id),
            "user_id": current_user.id
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="You have already reviewed this listing"
            )
        
        result = await reviews_collection.insert_one({
            "listing_id": ObjectId(listing_id),
            "user_id": current_user.id,
            "rating": review_data["rating"],
            "title": review_data["title"],
            "comment": review_data["comment"],
            "helpful_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return {"id": str(result.inserted_id), "status": "created"}
    
    @router.put("/{review_id}")
    async def update_review(
        listing_id: str,
        review_id: str,
        review_data: dict,
        current_user: User = Depends(get_current_user)
    ):
        """Update a review (only by author)"""
        reviews_collection = db.database.reviews
        
        review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if review["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        await reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": {
                **review_data,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"status": "updated"}
    
    @router.delete("/{review_id}")
    async def delete_review(
        listing_id: str,
        review_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Delete a review (only by author or listing owner)"""
        reviews_collection = db.database.reviews
        listings_collection = db.database.listings
        
        review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        listing = await listings_collection.find_one({"_id": review["listing_id"]})
        
        # Check authorization
        is_author = review["user_id"] == current_user.id
        is_owner = listing["user_id"] == current_user.id
        
        if not (is_author or is_owner):
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        await reviews_collection.delete_one({"_id": ObjectId(review_id)})
        
        return {"status": "deleted"}
```

**Pydantic Models for Reviews**

```python
from pydantic import BaseModel, Field
from typing import Optional

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    title: str = Field(..., min_length=5, max_length=100)
    comment: str = Field(..., min_length=10, max_length=500)

class ReviewResponse(BaseModel):
    id: str
    listing_id: str
    user_id: str
    rating: int
    title: str
    comment: str
    helpful_count: int
    created_at: str
    updated_at: str

class ReviewStats(BaseModel):
    average_rating: float
    total_reviews: int
    rating_distribution: dict  # {1: count, 2: count, ...}
    reviews: list[ReviewResponse]
```

---

## 4. SCENARII DE UTILIZARE DETALIATE (Use Cases pas cu pas)

### 4.1 Scenario 1: Utilizator Nou - Înregistrare și Explorare Anunțuri

**Personaj**: Maria (25 ani) - turist venit pentru prima dată la Timișoara

**Obiectiv**: Să se înregistreze în aplicație și să exploreze apartamente disponibile

**Pași detaliat**:

**Pas 1: Descarcă și lansează aplicația**
- Maria descarcă aplicația TimisoaraLens
- App-ul se deschide și afișează Splash Screen (logo și loading)
- Backend verifică dacă avem token salvat în AsyncStorage → Nu există
- App navigează la LoginScreen

**Pas 2: Merge la Registration**
- Maria apasă pe "Don't have an account? Register here"
- Navigare la RegisterScreen
- Form-ul este gol și pregatit pentru date

**Pas 3: Completează formularul de înregistrare**
- Introdu email: `maria@example.com`
- Introdu username: `maria_travel`
- Introdu parolă: `SecurePass123!`
- Introdu nume complet: `Maria Popescu`
- Apasă butonul "Register"

```javascript
// Frontend: RegisterScreen submittal
const handleRegister = async () => {
  if (!email || !username || !password || !fullName) {
    Alert.alert('Error', 'Please fill all fields');
    return;
  }
  
  setLoading(true);
  try {
    const response = await APIService.register({
      email,
      username,
      password,
      full_name: fullName
    });
    // Store token
    await AsyncStorage.setItem('userToken', response.access_token);
    // Authenticate user in context
    authContext.signIn(response);
  } catch (error) {
    Alert.alert('Registration failed', error.message);
  } finally {
    setLoading(false);
  }
};
```

**Pas 4: Backend procesează înregistrarea**
- FastAPI primește POST /auth/register cu JSON body
- Pydantic validează: email format, password strength, etc.
- FastAPI hashează parola cu bcrypt (10 rounds)
- MongoDB stochează documentul în colecția `users`:

```javascript
// MongoDB: User document created
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "maria@example.com",
  "username": "maria_travel",
  "hashed_password": "$2b$10$...[bcrypt hash]...",
  "full_name": "Maria Popescu",
  "is_active": true,
  "is_admin": false,
  "created_at": ISODate("2024-01-16T10:30:00Z"),
  "last_login": null
}
```

**Pas 5: Backend returnează JWT token**
- Token format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Expirare: 30 minute
- Payload include: `{user_id, email, exp}`

**Pas 6: Frontend stochează token și navigează**
- Token salvat în AsyncStorage (cheia: 'userToken')
- AuthContext actualizat cu user info și status `isSignedIn = true`
- App navigează la HomeScreen
- Axios interceptor setează header: `Authorization: Bearer {token}`

**Pas 7: Maria exploreaza pe HomeScreen**
- Apasă pe "Apartments" tab
- Navigare la ListingsScreen

**Pas 8: ListingsScreen - Fetch initial de anunțuri**
- Component mount → useEffect declanșat
- Apel: `APIService.getListings(skip=0, limit=10)`

```javascript
// Frontend: Fetch listings
const fetchListings = async () => {
  try {
    const data = await APIService.getListings(0, 10);
    setListings(data.listings);
    setTotalCount(data.total);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

- Backend: FastAPI GET /listings cu query params `skip=0&limit=10`
- MongoDB query: `db.listings.find({status: "active"}).skip(0).limit(10)`
- Backend returnează array de 10 anunțuri active cu detalii

**MongoDB query result**:
```javascript
[
  {
    "_id": ObjectId("507f1f77bcf86cd799439012"),
    "user_id": ObjectId("507f1f77bcf86cd799439003"),
    "title": "Modern Apartment in City Center",
    "description": "Spacious 2-bedroom apartment...",
    "property_type": "apartment",
    "location": {
      "type": "Point",
      "coordinates": [21.2272, 45.7489]  // [lon, lat]
    },
    "address": "Str. Cibinului 15, Timișoara",
    "price_per_night": 65,
    "amenities": ["WiFi", "AC", "Parking", "Kitchen"],
    "image_urls": ["https://cdn.../img1.jpg", ...],
    "status": "active",
    "created_at": ISODate("2024-01-10T08:00:00Z")
  },
  ... (9 more listings)
]
```

**Pas 9: Maria selectează un apartament**
- Apasă pe card-ul unui apartament
- Navigare la ListingDetailScreen cu listing ID

**Pas 10: Vizualizează detalii anunț**
- Apasă pe butonul "View Reviews" pentru a vedea ce au spus alți oaspeți
- Navigare la ReviewsListScreen pentru acel apartament

---

### 4.2 Scenario 2: Utilizator Autentificat - Adaugă o Recenzie

**Personaj**: Maria - acum a locuit 3 nopți în apartament și vrea să lase o recenzie

**Obiectiv**: Să adauge o recenzie cu rating și comentariu pentru apartament

**Pași detaliat**:

**Pas 1: Pe ecranul ReviewsListScreen**
- Maria vede rating-ul mediu: 4.2/5 (din 18 recenzii)
- Vede lista cu recenzii: "Great location!" (5★), "Noisy at night" (3★), etc.
- Apasă butonul "Add Review" (doar dacă e autentificată)

**Pas 2: Navigare la AddReviewScreen**
- Form gol cu câmpuri:
  - Star rating selector (1-5)
  - Title input
  - Comment textarea
  - Submit button

**Pas 3: Maria completează recenzia**
```javascript
// Frontend: Add review form
const handleAddReview = async () => {
  if (rating < 1 || !title.trim() || !comment.trim()) {
    Alert.alert('Error', 'Please fill all fields');
    return;
  }
  
  setSubmitting(true);
  try {
    await APIService.createReview(listingId, {
      rating: 5,
      title: "Amazing experience!",
      comment: "The apartment was clean, spacious, and in perfect location..."
    });
    Alert.alert('Success', 'Review submitted!');
    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setSubmitting(false);
  }
};
```

- Rating: ⭐⭐⭐⭐⭐ (5 stars)
- Title: "Amazing experience!"
- Comment: "The apartment was clean, spacious, and in perfect location for exploring the city. Highly recommend!"
- Apasă "Submit Review"

**Pas 4: Frontend validare și trimitere**
- Axios prepare POST request la `/listings/{listingId}/reviews`
- Header include: `Authorization: Bearer {JWT_TOKEN}`
- Request body (JSON):
```json
{
  "rating": 5,
  "title": "Amazing experience!",
  "comment": "The apartment was clean, spacious, and in perfect location..."
}
```

**Pas 5: Backend primește și validează**
- FastAPI decode JWT token din header
- Extract user_id din token payload
- Pydantic validează: rating 1-5, title min 5 chars, comment min 10 chars
- MongoDB check: utilizatorul deja a recenzionat acest anunț?
  ```python
  existing = await reviews_collection.find_one({
      "listing_id": ObjectId(listing_id),
      "user_id": current_user.id
  })
  ```
- Nu există → continuă

**Pas 6: MongoDB stochează recenzia**
```javascript
// MongoDB: Review document
{
  "_id": ObjectId("507f1f77bcf86cd799439050"),
  "listing_id": ObjectId("507f1f77bcf86cd799439012"),
  "user_id": ObjectId("507f1f77bcf86cd799439011"),
  "rating": 5,
  "title": "Amazing experience!",
  "comment": "The apartment was clean, spacious, and in perfect location...",
  "helpful_count": 0,
  "created_at": ISODate("2024-01-16T14:45:00Z"),
  "updated_at": ISODate("2024-01-16T14:45:00Z")
}
```

**Pas 7: Backend returnează success**
```json
{
  "id": "507f1f77bcf86cd799439050",
  "status": "created"
}
```

**Pas 8: Frontend navigează înapoi și refresh-uiește**
- `navigation.goBack()` → ReviewsListScreen
- `useFocusEffect` trigger pe ReviewsListScreen
- API call pentru a re-fetch toate recenziile
- Noua recenzie apare în lista cu timestamp "Just now"
- Rating mediu se recalculează: 4.3/5 (din 19 recenzii)

---

### 4.3 Scenario 3: Proprietar - Creează Anunț cu Traseu Turistic

**Personaj**: Ion (45 ani) - proprietar apartament care vrea să adauge traseu turistic

**Obiectiv**: Să creeze un anunț cu detalii apartament + traseu turistic sugerat

**Pași detaliat**:

**Pas 1: Ion e autentificat și navigează la Create Listing**
- Apasă pe "Create" tab (bara de navigare)
- Navigare la CreateListingScreen
- Form gol pregătit, AsyncStorage check pentru form state salvat anterior → nu există

**Pas 2: Completează detalii apartament**
- Title: "Spacious 3BR near Cathedral"
- Description: "Beautiful apartment with high ceilings..."
- Property type: "Apartment"
- Price per night: 75 RON
- Max guests: 6
- Bedrooms: 3
- Bathrooms: 2
- Amenities: selectează ["WiFi", "AC", "Parking", "Kitchen", "Washer"]
- Images: apasă pentru a selecta din galerie → alegește 3 imagini
  - Frontend declanșează `ImagePicker.launchImageLibraryAsync()`
  - Images în format URI: `file:///storage/emulated/0/DCIM/IMG_001.jpg`

**Pas 3: Setare locație**
- Apasă "Pick Location"
- Navigare la LocationPickerScreen
- Două opțiuni:
  - **A) GPS Actual**: Apasă "Get Current Location"
    - Expo Location request pentru permisiuni
    - `Location.getCurrentPositionAsync()` returnează GPS
    - Reverse geocode cu Nominatim: lat=45.123, lng=21.456 → "Str. Cibinului 15"
  - **B) Manual cu Harta**: Apasă pe locația dorită pe MapView
    - Pin apare pe hartă
    - Reverse geocode automatic

- Ion selectează: Latitude 45.7489, Longitude 21.2272, Address "Piața Unirii"

**Pas 4: Contact info**
- Contact name: "Ion Gheorghe"
- Contact phone: "+40723123456"
- Contact email: "ion@example.com"

**Pas 5: Auto-save la AsyncStorage**
```javascript
// Frontend: Auto-save form state
const saveFormState = async () => {
  const state = {
    title: "Spacious 3BR near Cathedral",
    description: "...",
    propertyType: "apartment",
    price: 75,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["WiFi", "AC", "Parking", "Kitchen", "Washer"],
    images: ["file://...", "file://...", "file://..."],
    latitude: 45.7489,
    longitude: 21.2272,
    address: "Piața Unirii",
    contactName: "Ion Gheorghe",
    contactPhone: "+40723123456",
    contactEmail: "ion@example.com"
  };
  
  await AsyncStorage.setItem(
    'createListingFormState',
    JSON.stringify(state)
  );
};
```

**Pas 6: Apasă "Add Suggested Route"**
- Navigare la RouteBuilderScreen (gol, fără rută)

**Pas 7: RouteBuilder - Construire traseu turistic**
- Input: "Historic Center Tour"
- Apasă "Search Places" și introdu "Cathedral"
  - Nominatim API query: `search?q=Cathedral&format=json`
  - Rezultate: "Cathedral", "Military Museum", "Humorului Park", etc.
- Selectează "Cathedral" (din list)
  - MapView pune marker pe hartă la coordonatele returnate
  - Place adăugat în array: `selectedPlaces`

```javascript
// Frontend: Search places with Nominatim
const searchPlaces = async (query) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=10`
  );
  const results = await response.json();
  setSearchResults(results);
};

// User selects a place
const addPlaceToRoute = (place) => {
  setSelectedPlaces([
    ...selectedPlaces,
    {
      name: place.name,
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon)
    }
  ]);
  // Map updates with new marker
};
```

- Repetă pentru mai multe locații: "Military Museum", "Humorului Park"
- Final: 3 locații în traseu
- Apasă "Finish Route"

**Pas 8: AsyncStorage - Salvează ruta în temp location**
```javascript
// Frontend: Save route to AsyncStorage
const finishRoute = async () => {
  await AsyncStorage.setItem(
    'pendingSuggestedRoute',
    JSON.stringify({
      title: "Historic Center Tour",
      places: [
        { name: "Cathedral", latitude: 45.7490, longitude: 21.2278 },
        { name: "Military Museum", latitude: 45.7512, longitude: 21.2290 },
        { name: "Humorului Park", latitude: 45.7445, longitude: 21.2350 }
      ]
    })
  );
  navigation.goBack();
};
```

- `goBack()` → Revenire la CreateListingScreen
- Form state la CreateListing preserved (Nu se resetează)

**Pas 9: CreateListing - Load ruta din AsyncStorage**
```javascript
// Frontend: useFocusEffect loads pending route
useFocusEffect(
  useCallback(() => {
    if (isFirstFocus) {
      const loadRoute = async () => {
        const pendingRoute = await AsyncStorage.getItem('pendingSuggestedRoute');
        if (pendingRoute) {
          setSuggestedRoute(JSON.parse(pendingRoute));
          await AsyncStorage.removeItem('pendingSuggestedRoute');
        }
      };
      loadRoute();
      setIsFirstFocus(false);
    }
  }, [isFirstFocus])
);
```

- Ruta încărcată și afișată pe ecran
- Ion apasă "Submit Listing"

**Pas 10: Validare și submit**
- Form validation: toți câmpurile completate ✓
- Images upload simulation (în real, ar fi cloudinary/s3)
- API call: `POST /listings` cu date complete

```javascript
// Frontend: Submit listing with route
const handleSubmit = async () => {
  const listingData = {
    title: "Spacious 3BR near Cathedral",
    description: "...",
    property_type: "apartment",
    price_per_night: 75,
    max_guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["WiFi", "AC", "Parking", "Kitchen", "Washer"],
    images: imageUris,
    location: {
      latitude: 45.7489,
      longitude: 21.2272
    },
    address: "Piața Unirii",
    suggested_route: {
      title: "Historic Center Tour",
      places: [
        { name: "Cathedral", latitude: 45.7490, longitude: 21.2278 },
        { name: "Military Museum", latitude: 45.7512, longitude: 21.2290 },
        { name: "Humorului Park", latitude: 45.7445, longitude: 21.2350 }
      ]
    },
    contact_name: "Ion Gheorghe",
    contact_phone: "+40723123456",
    contact_email: "ion@example.com"
  };
  
  const response = await APIService.createListing(listingData);
  // Success
};
```

**Pas 11: Backend proceseaza anunțul**
- FastAPI POST /listings
- JWT validation: user_id extracted
- Pydantic validează schema completă
- MongoDB create anunț în colecția `listings`:

```javascript
// MongoDB: Listing document
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "user_id": ObjectId("507f1f77bcf86cd799439005"),
  "title": "Spacious 3BR near Cathedral",
  "description": "Beautiful apartment with high ceilings...",
  "property_type": "apartment",
  "location": {
    "type": "Point",
    "coordinates": [21.2272, 45.7489]
  },
  "address": "Piața Unirii",
  "price_per_night": 75,
  "max_guests": 6,
  "bedrooms": 3,
  "bathrooms": 2,
  "amenities": ["WiFi", "AC", "Parking", "Kitchen", "Washer"],
  "image_urls": ["https://cdn.../img1.jpg", "https://cdn.../img2.jpg", ...],
  "suggested_route": {
    "title": "Historic Center Tour",
    "places": [
      { "name": "Cathedral", "latitude": 45.7490, "longitude": 21.2278 },
      { "name": "Military Museum", "latitude": 45.7512, "longitude": 21.2290 },
      { "name": "Humorului Park", "latitude": 45.7445, "longitude": 21.2350 }
    ]
  },
  "contact_name": "Ion Gheorghe",
  "contact_phone": "+40723123456",
  "contact_email": "ion@example.com",
  "status": "active",
  "created_at": ISODate("2024-01-16T15:30:00Z"),
  "updated_at": ISODate("2024-01-16T15:30:00Z")
}
```

**Pas 12: Backend returnează success și frontend navigează**
```json
{
  "id": "507f1f77bcf86cd799439015",
  "status": "created"
}
```

- Frontend navigează la ListingsScreen
- Anunț nou apare în lista (dacă refresh-ul e triggered)
- Ion vede propriul anunț cu ruta suggested

---

### 4.4 Scenario 4: Utilizator șterge propria recenzie

**Personaj**: Maria - după 2 zile, vrea să șteargă recenzia (s-a răzgândit)

**Obiectiv**: Să șteargă o recenzie pe care a postat-o

**Pași detaliat**:

**Pas 1: ReviewsListScreen - Recenzia lui Maria**
- Maria se întoarce la apartament și apasă "View Reviews"
- Vede propria recenzie: "Amazing experience!" (5★)
- Recenzia are opțiuni: buton "Edit" și "Delete" (doar pentru autoare)

**Pas 2: Apasă "Delete"**
- Dialog confirm: "Are you sure you want to delete this review?"
- Opțiuni: "Cancel" sau "Delete"
- Maria apasă "Delete"

**Pas 3: Frontend trimite delete request**
```javascript
// Frontend: Delete review
const handleDeleteReview = async (reviewId) => {
  Alert.alert(
    'Delete Review',
    'Are you sure you want to delete this review?',
    [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await APIService.deleteReview(listingId, reviewId);
            // Refresh reviews list
            fetchReviews();
            Alert.alert('Success', 'Review deleted');
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
        style: 'destructive'
      }
    ]
  );
};
```

- API call: `DELETE /listings/{listingId}/reviews/{reviewId}`
- Header: `Authorization: Bearer {JWT_TOKEN}`

**Pas 4: Backend validează și șterge**
- FastAPI extract user_id din JWT
- MongoDB find review:
  ```python
  review = await reviews_collection.find_one({
      "_id": ObjectId(review_id)
  })
  ```
- Check autorizare:
  - `is_author = review["user_id"] == current_user.id` → TRUE
  - Sau `is_owner = listing["user_id"] == current_user.id`
- Delete din bază: `await reviews_collection.delete_one({"_id": ObjectId(review_id)})`

**Pas 5: Backend returnează succes**
```json
{
  "status": "deleted"
}
```

**Pas 6: Frontend refresh și update UI**
- `fetchReviews()` - API call pentru a obține lista updated
- Recenzia dispare din lista
- Rating mediu se recalculează: 4.2/5 (din 18 recenzii - una mai puțin)
- Message: "Review successfully deleted"
- Numar total reviews: 18 (anterior 19)

---

## 4.5 GHID SCURT - Pași Principali de Utilizare

### 4.5.1 Fluxul 1: Utilizator Nou → Explorare Apartamente

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Deschide app | Splash Screen | Se verifică token salvat |
| 2 | Apasă "Register" | Register Screen | Form gol pentru înregistrare |
| 3 | Completează email, username, parolă | Register Screen | Validare date în timp real |
| 4 | Apasă "Create Account" | Register Screen | Token JWT primit, navigation la Home |
| 5 | Merge la "Apartments" tab | Home → Listings Screen | Afișează 10 apartamente active |
| 6 | Selectează un apartament | Listings Screen | Navigare la Listing Detail |

### 4.5.2 Fluxul 2: Utilizator Autentificat → Adaugă Recenzie

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Din Listing Detail → "View Reviews" | Listing Detail | Afișează lista recenzii + rating mediu |
| 2 | Apasă "Add Review" (buton albastru) | Reviews List | Navigare la Add Review Screen |
| 3 | Selectează rating (★★★★★) + scrie titlu/comment | Add Review Screen | Form validare în real-time |
| 4 | Apasă "Submit" | Add Review Screen | POST la `/listings/{id}/reviews` + navigare înapoi |
| 5 | Recenzia apare în lista | Reviews List | Rating mediu se recalculează automat |

### 4.5.3 Fluxul 3: Proprietar → Creează Anunț cu Rută

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Apasă "Create" tab | Home | Navigare la Create Listing Screen |
| 2 | Completează form: titlu, descriere, preț, amenities, imagini | Create Listing | Auto-save la AsyncStorage la fiecare schimbare |
| 3 | Apasă "Add Location" | Create Listing | Navigare la Location Picker → GPS sau hartă |
| 4 | Selectează locație → Reverse geocode | Location Picker | Adresa se completează automat |
| 5 | Apasă "Add Route" | Create Listing | Navigare la Route Builder Screen |
| 6 | Caută și selectează 3 locații turistice | Route Builder | Marker-e pe hartă, locații în array |
| 7 | Apasă "Finish" | Route Builder | Ruta salvată în AsyncStorage, navigare înapoi |
| 8 | Apasă "Submit Listing" | Create Listing | POST la `/listings` cu toate datele + ruta |

### 4.5.4 Fluxul 4: Utilizator → Șterge Recenzia

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Din Reviews List → Localizează propria recenzie | Reviews List | Recenzia are buton "Delete" roșu |
| 2 | Apasă "Delete" | Reviews List | Alert confirm: "Sure?" |
| 3 | Apasă "Delete" (în dialog) | Reviews List | DELETE `/listings/{id}/reviews/{reviewId}` |
| 4 | Recenzia dispare | Reviews List | Lista se refresh-uiește automat |

---

## 4.6 INVENTAR ELEMENTE UI - Descriere și Rol

### 4.6.1 Elemente de Navigare

| Element | Tip | Unde | Rol | Comportament |
|---------|-----|------|-----|--------------|
| **Bottom Tab Navigator** | Navigation | În toată app-ul (bottom) | Navigare între secțiuni principale | Highlight tab activ, transition suav |
| **Header Back Button** | Button | Top-left pe fiecare Screen | Navigare înapoi la ecranul anterior | Pop din stack, stare formularelor se păstrează |
| **Stack Navigator** | Navigation | În spatele tab navigator | Gestionează fluxul pe ecrane | Animație slide din dreapta |

### 4.6.2 Elemente de Input

| Element | Tip | Unde | Rol | Validare |
|---------|-----|------|-----|----------|
| **TextInput - Email** | Text Field | Register, Login, Create Listing | Introdu email utilizator | `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` |
| **TextInput - Parolă** | Secure Field | Register, Login | Introdu parolă (masked) | Min 6 chars, regex pentru caractere speciale |
| **TextInput - Username** | Text Field | Register | Unic username | 3-20 chars, alphanumeric + underscore |
| **TextInput - Titlu Anunț** | Text Field | Create Listing | Titlu apartament | 5-100 chars |
| **TextInput - Descriere** | TextArea | Create Listing, Add Review | Text lung cu multiple linii | Max 500 chars |
| **Picker/Dropdown - Property Type** | Dropdown | Create Listing | Selectează tip proprietate | Opțiuni: "Apartment", "House", "Studio" |
| **Slider - Preț/Guests** | Slider | Create Listing | Selectează numeric cu slide | 1-500 RON, 1-20 persoane |
| **Checkbox Array - Amenities** | Checkboxes | Create Listing | Selectează multiple amenities | Toggle on/off, array se actualizează |
| **Star Rating - Review** | Custom Component | Add Review | Rating 1-5 stele | Tap pe stea selectează rating |

### 4.6.3 Elemente de Afișare Dată

| Element | Tip | Unde | Rol | Format |
|---------|-----|------|-----|--------|
| **Text - Titlu** | Typography | Peste tot | Heading principal | Bold, 18-20px, negru |
| **Text - Subtitle** | Typography | Peste tot | Descriere secundară | Regular, 14px, gri (#666) |
| **Card Component** | Container | Listings List, Reviews List | Container pentru item | Elevation shadow, rounded corners |
| **Rating Badge** | Visual | Listing Detail, Reviews List | Afișează ⭐ + score | Ex: "4.2/5.0 (18 reviews)" |
| **Image Component** | Image Display | Listing Detail, Create Listing | Afișează imagini de apartament | Aspect ratio 4:3, click pentru full-screen |
| **Location Text** | Text | Listing Detail, Create Listing | Adresa din reverse geocode | Gri, iconiță location |
| **List View / FlatList** | Scrollable List | Listings Screen, Reviews Screen | Lista de apartamente/recenzii | Pagination: load 10 items la scroll |

### 4.6.4 Elemente de Acțiune (Buttons)

| Element | Tip | Unde | Rol | State |
|---------|-----|------|-----|-------|
| **Primary Button - Register/Login** | Filled Button | Register, Login Screen | Trimite form | Disabled dacă form incomplete |
| **Secondary Button - Cancel/Back** | Outlined Button | Peste tot | Anuleaza acțiune | Pop navigation sau reset form |
| **FAB - Create Listing** | Floating Action Button | Listings Screen | Quick access la create | Always visible, rotate animation |
| **Delete Button** | Danger Button (Red) | Reviews List, Listing Detail | Șterge review/anunț | Requires confirmation dialog |
| **Edit Button** | Secondary Button | Reviews List (own review) | Editeaza review | Navigate la edit form |
| **Add to Favorites** | Icon Button | Listing Detail | Mark as favorite | Heart icon, toggle fill/outline |
| **Share Button** | Icon Button | Listing Detail | Share listing link | Native share sheet |
| **GPS Button** | Icon Button | Location Picker | Get current location | Loading spinner când activ |

### 4.6.5 Elemente de Feedback Utilizator

| Element | Tip | Unde | Rol | Apariție |
|---------|-----|------|-----|----------|
| **Loading Spinner** | Spinner | La fiecare network request | Indică loading | Apare la POST/GET/DELETE |
| **Toast Notification** | Snackbar | Bottom screen | Notificare scurtă (1-2 sec) | Succes: "Review added!", Eroare: "Network error" |
| **Dialog / Alert** | Modal | Peste tot | Confirmare/eroare importantă | Click outside nu close, trebuie buton |
| **Empty State** | Illustration + Text | Listings/Reviews gol | Mesaj când nu-s date | "No apartments found", cu icon |
| **Error Message** | Red text | Sub input field | Validare în real-time | "Email invalid", "Min 6 characters" |
| **Success Checkmark** | Green icon + text | După submit form | Confirmare completare | Apare 2 sec, apoi navigation |

### 4.6.6 Elemente de Hartă și Locație

| Element | Tip | Unde | Rol | Interacțiune |
|---------|-----|------|-----|--------------|
| **MapView Component** | Native Map | Location Picker, Route Builder | Afișează hartă interactivă | Pan, zoom, pinch gestures |
| **Marker** | Map Overlay | MapView | Pin pe hartă pentru locații | Tap → callout, long-press → drag, double-tap → info |
| **Polyline** | Map Overlay | Route Builder | Linie între locații (optional) | Visual aid pentru traseu |
| **Callout / Popup** | InfoBox | Pe Marker | Info despre locație | Auto-close la tap out, can contain buttons |
| **Search Input - Places** | Text Field + List | Route Builder | Caută locații Nominatim | Dropdown cu rezultate sub input |

### 4.6.7 Elemente de Form Management

| Element | Tip | Unde | Rol | Comportament |
|---------|-----|------|-----|--------------|
| **Form Progress Indicator** | Progress Bar | Create Listing (optional) | Arată câte step-uri done | Visual cue de progres (20%, 40%, etc) |
| **Stepper / Tab List** | Navigation | Create Listing (future) | Separă form în etape | Click pe tab → scroll la section |
| **Save Draft Toggle** | Toggle Switch | Create Listing | Auto-save or manual | Enabled by default, data în AsyncStorage |
| **Validation Summary** | Error List | Bottom form | Listează toate erorile | Red icon + text, click = scroll to field |

### 4.6.8 Elemente de Gestionare Conținut

| Element | Tip | Unde | Rol | Funcție |
|---------|-----|------|-----|---------|
| **Image Picker Button** | Button + ActionSheet | Create Listing | Selectează imagini | Opens camera/gallery, allows multiple |
| **Image Thumbnail Grid** | Grid View | Create Listing, Listing Detail | Afișează imagini selected | Tap pentru full-screen, swipe pt delete |
| **Delete Image (X Button)** | Icon Button | Pe thumbnail | Șterge imagine | Immediate remove din array |
| **Gallery Fullscreen Viewer** | Modal | Tap pe image | Fullscreen swipe-able gallery | Pinch-to-zoom, navigation indicators |
| **Upload Progress** | Progress Circle | În ImagePicker | Arată % upload | "Uploading 2/5 images..." |

---

## 5. FLOW-URI PRINCIPALE

### 5.1 Autentificare

```
┌──────────────────────────────────────────────────────────┐
│ Splash Screen                                            │
│ - Check stored token in AsyncStorage                    │
│ - Validate with backend                                 │
└────────────────┬─────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         ▼                ▼
    Token valid       No token
         │                │
         ▼                ▼
    Home Screen    Login/Register Screen
```

### 5.2 Creare Anunț cu Traseu Turistic

```
Create Listing Screen
    ↓
Fill form fields (auto-save to AsyncStorage)
    ├─ Title, description
    ├─ Property type, price, amenities
    ├─ Get GPS location OR pick from map
    │  (Location Picker Screen with Nominatim reverse geocode)
    └─ Select images (Camera/Gallery)
    ↓
Navigate to Route Builder Screen
    ├─ Search places (Nominatim API)
    ├─ Drag & drop markers on map
    ├─ Finish route → save to AsyncStorage (pendingSuggestedRoute)
    └─ Go back (goBack() preserves CreateListing state)
    ↓
CreateListing: Load pendingSuggestedRoute from AsyncStorage
    ↓
Validate form
    ↓
Submit to backend (HTTP POST /listings)
    ↓
Backend: Validate with Pydantic → Save to MongoDB
    ↓
Success → Navigate to Listings Screen
```

---

## 6. DEPENDENȚE ȘI VERSIUNI

### 6.1 Frontend (package.json)

```json
{
  "dependencies": {
    "react": "18.2.x",
    "react-native": "0.73.x",
    "expo": "51.x",
    "react-navigation": "^6.x",
    "react-native-paper": "^5.x",
    "axios": "^1.x",
    "react-native-maps": "^1.x",
    "expo-location": "^16.x",
    "expo-image-picker": "^14.x",
    "@react-native-async-storage/async-storage": "^1.x"
  }
}
```

### 6.2 Backend (requirements.txt)

```
fastapi==0.104.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
motor==3.3.1
pydantic==2.5.0
python-multipart==0.0.6
requests==2.31.0
python-dotenv==1.0.0
uvicorn==0.24.0
```

---

## 7. SECURITATE ȘI BEST PRACTICES

### 7.1 Autentificare
- JWT tokens: 30-minute expiration
- Refresh token implementation (optional future)
- Password hashing: bcrypt (10+ rounds)

### 7.2 Storage
- AsyncStorage: Local device storage (não cloud)
- Sensitive data: Token storage only
- Form state: Non-sensitive data backup

### 7.3 API Communication
- HTTPS only in production
- CORS headers configured
- Request timeout: 10 seconds
- Rate limiting: Respects OSM API limits (1 req/sec)

### 7.4 Data Validation
- Pydantic on backend for all inputs
- Type hints for clarity
- Email validation (EmailStr)
- Coordinate validation (latitude -90..90, longitude -180..180)

---

## 8. DIAGRAME REFERINȚĂ

Consulta următoarele diagrame în folder `docs/`:
1. **1-usecase-diagram.puml** - Use cases ale aplicației
2. **2-class-diagram-simplified.puml** - Structura claselor și relații
3. **3-sequence-diagram-simplified.puml** - State transitions
4. **architecture-diagram.puml** - Arhitectura sistem

---

**Document generat**: 2026-01-16
**Versiune Aplicație**: 1.0.0
