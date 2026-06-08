# 🏛️ CityLens Timișoara

Aplicație mobilă AI pentru explorarea orașului Timișoara cu funcții de tracking GPS, informații turistice, rezervări, plăți online și un chatbot RAG inteligent.

- **GitHub:** https://github.com/CristiL75/TimisoaraLens
- **Backend live:** deploiat pe [Render.com](https://render.com) (Frankfurt region)
- **RAG Service live:** deploiat pe [HuggingFace Spaces](https://huggingface.co/spaces/latcu/timisoaralens-rag)

---

## 📱 Tehnologii

### Backend
- **FastAPI** - REST API cu documentație automată (Swagger + ReDoc)
- **MongoDB + Motor** - Bază de date NoSQL cu driver async
- **JWT Authentication** - Autentificare securizată cu bcrypt (passlib)
- **Stripe** - Procesare plăți pentru rezervări apartamente
- **Python 3.11+** - Environment virtual (venv)
- **Rate Limiter** - Protecție per-rută (auth, RAG, assistant, default)

### Frontend (React Native / Expo)
- **React Native 0.81 + Expo ~54** - Aplicație mobilă cross-platform
- **React Navigation v7** - Navigare Stack cu flow Auth / App separat
- **React Native Paper** - UI components Material Design
- **React Native Maps** - Hartă interactivă cu markere obiective
- **expo-location** - Acces GPS real-time
- **expo-image-picker** - Upload imagini pentru listings
- **react-native-calendars** - Calendar pentru rezervări
- **AsyncStorage** - Persistență locală token JWT
- **Axios** - HTTP client

### AI / RAG
- **Qdrant Cloud** - Vector database pentru embeddings semantice
- **OpenAI (gpt-5-mini / gpt-4.1-mini fallback)** - Generare răspunsuri chatbot
- **SentenceTransformers (all-MiniLM-L6-v2)** - Embeddings text
- **langdetect** - Detectare limbă query (RO/EN auto-switch)
- **RAG Proxy** - Backend-ul proxiază cererile către HuggingFace Space
- **Suggested Questions** - Generare automată întrebări sugerate după răspuns
- **ChatWidget + SuggestedQuestions** - Componente React Native pentru chatbot

---

## 🚀 Cum pornești aplicația

### **Pas 1: Pornește MongoDB**
```powershell
# Verifică dacă MongoDB rulează
Get-Service MongoDB

# Pornește serviciul MongoDB
net start MongoDB
```

### **Pas 2: Configurează variabilele de mediu**

Creează fișierul `backend/.env` (vezi secțiunea [Environment Variables](#-environment-variables) mai jos pentru toate câmpurile necesare).

### **Pas 3: Pornește Backend (Terminal 1)**
```powershell
# Navighează la folder backend
cd backend

# Pornește serverul (folosește venv automat)
.\start.ps1
```

**SAU manual:**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python main.py
```

✅ **Backend va rula pe:** `http://localhost:8000`
📖 **API Docs:** `http://localhost:8000/docs`

### **Pas 4: Pornește Mobile App (Terminal 2)**
```bash
# Navighează la folder mobile
cd mobile

# Pornește Expo
npx expo start
```

### **Pas 5: Deschide aplicația**

**Opțiune 1 - Telefon real (recomandat):**
1. Instalează **Expo Go** pe telefon
2. Scanează QR code-ul din terminal
3. Aplicația se va deschide automat

**Opțiune 2 - Emulator:**
- Apasă `a` în terminal pentru Android emulator
- Apasă `w` pentru web browser

---

## 📦 Prima instalare (doar o dată)

### **Backend Setup**
```powershell
cd backend

# Creează virtual environment
python -m venv .venv

# Activează venv
.\.venv\Scripts\Activate.ps1

# Instalează pachetele
pip install -r requirements.txt
```

### **Mobile Setup**
```bash
cd mobile

# Instalează dependențele
npm install
```

### **RAG Service (HuggingFace Space)**

RAG-ul rulează ca serviciu separat deploiat pe HuggingFace Space. Nu necesită instalare locală. Configurează URL-ul în `backend/.env`:
```env
HF_RAG_SPACE_URL=https://latcu-timisoaralens-rag.hf.space
```

### **Configurare API URL pentru telefon real**

⚠️ **IMPORTANT:** Dacă testezi pe telefon real, editează `mobile/src/services/api.js`:

```javascript
// Schimbă de la:
const API_URL = 'http://localhost:8000/api';

// La IP-ul PC-ului tău:
const API_URL = 'http://192.168.X.X:8000/api';
```

**Cum afli IP-ul PC-ului:**
```powershell
ipconfig
# Caută "IPv4 Address" pentru adaptorul WiFi
```

---

## 🧪 Testare Aplicație

### **1. Register / Login**
1. Deschide aplicația → **"Create Account"**
2. Completează: Email, Username (≥3 char), Password (≥6 char), Full Name
3. După register → Login → HomeScreen

✅ Backend: `POST /api/auth/register 201` + token JWT salvat în AsyncStorage

### **2. Chatbot RAG**
1. Din HomeScreen apasă butonul chat
2. Scrie o întrebare despre Timișoara (RO sau EN)
3. Răspunsul vine din Qdrant + OpenAI cu surse afișate
4. Întrebările sugerate apar automat sub răspuns

### **3. Hartă & GPS**
1. Du-te la **MapScreen**
2. Acordă permisiunea de locație
3. Obiectivele turistice sunt marcate pe hartă
4. GPS-ul verifică automat proximitatea față de obiective

### **4. Listings (Proprietăți)**
1. **ListingsScreen** → Browse proprietăți disponibile
2. Ca proprietar: **CreateListingScreen** → adaugă titlu, preț, imagini, locație
3. **LocationPickerScreen** → selectezi coordonate pe hartă
4. **ListingDetailScreen** → detalii + buton rezervare

### **5. Rezervări cu Stripe**
1. Selectează o proprietate → Book
2. Introdu datele Stripe (test card: `4242 4242 4242 4242`)
3. Proprietarul vede cererea în **BookingCalendarScreen**
4. Proprietarul acceptă → plata este capturată automat

### **6. Servicii & Restaurante**
1. **ServicesScreen** → browse furnizori
2. **ProviderDetailScreen** → detalii + servicii disponibile
3. **BookServiceScreen** / **BookEventScreen** / **BookExperienceScreen** → rezervare

### **7. Verificare MongoDB**
```bash
mongosh
use TimisoaraLens
db.users.find().pretty()
db.listings.find({status: "active"}).count()
db.bookings.find().sort({created_at: -1}).limit(5).pretty()
```

---

## 🗂️ Structura Proiectului

```
TimisoaraLens/
│
├── backend/                          # FastAPI Backend
│   ├── .venv/                        # Python virtual environment
│   ├── api/                          # API routers
│   │   ├── auth.py                  # ✅ Autentificare (register, login, me)
│   │   ├── gps.py                   # ✅ GPS & verificare proximitate obiective
│   │   ├── listings.py              # ✅ Managementul proprietăților (hotel/apart.)
│   │   ├── bookings.py              # ✅ Rezervări mese, camere, servicii, experiențe
│   │   ├── apartment_bookings.py    # ✅ Rezervări apartamente cu plată Stripe
│   │   ├── rag.py                   # ✅ Proxy RAG → HuggingFace Space
│   │   └── quiz.py                  # 🚧 Quiz generator (placeholder)
│   │
│   ├── data/                         # Date statice preîncărcate
│   │   ├── coordinates.json         # Coordonate GPS obiective turistice
│   │   ├── listings.json            # Listings sample
│   │   ├── osm_*.json               # Date OSM (baruri, cafenele, magazine, etc.)
│   │   ├── timisoara_*_chunks.json  # Chunks text pentru indexare Qdrant
│   │   └── ...
│   │
│   ├── scripts/                      # Scripturi indexare Qdrant
│   │   ├── add_*_to_qdrant.py       # Import date în Qdrant Cloud
│   │   ├── embed_and_upsert_qdrant.py
│   │   └── ...
│   │
│   ├── auth_utils.py                # JWT tokens + bcrypt hashing
│   ├── calendar_block.py            # Blocuri calendar disponibilitate
│   ├── config.py                    # Configurare centralizată
│   ├── database_mongo.py            # Conexiune MongoDB + modele Pydantic
│   ├── main.py                      # FastAPI app entry point + Rate Limiter
│   ├── rag_service_app.py           # RAG service local (dev)
│   ├── requirements.txt             # Python dependencies
│   ├── render.yaml                  # Configurare deployment Render.com
│   └── start.ps1                    # ⚡ Script pornire backend
│
├── TimisoaraLens-RAG/               # HuggingFace Space RAG Service
│   ├── app.py                       # ✅ FastAPI RAG cu Qdrant + OpenAI
│   ├── requirements.txt
│   └── Dockerfile
│
├── hf-space-rag/
│   └── app.py                       # Variantă alternativă HF Space
│
├── mobile/                          # React Native App (Expo ~54)
│   ├── src/
│   │   ├── screens/                 # Ecrane aplicație
│   │   │   ├── LoginScreen.js       # ✅ Autentificare
│   │   │   ├── RegisterScreen.js    # ✅ Înregistrare
│   │   │   ├── HomeScreen.js        # ✅ Dashboard principal + ChatWidget
│   │   │   ├── MapScreen.js         # ✅ Hartă interactivă obiective
│   │   │   ├── ProfileScreen.js     # ✅ Profil utilizator
│   │   │   ├── ListingsScreen.js    # ✅ Listă proprietăți disponibile
│   │   │   ├── ListingDetailScreen.js  # ✅ Detalii proprietate
│   │   │   ├── CreateListingScreen.js  # ✅ Creare listing nou
│   │   │   ├── EditListingScreen.js    # ✅ Editare listing
│   │   │   ├── LocationPickerScreen.js # ✅ Selector locație pe hartă
│   │   │   ├── RouteBuilderScreen.js   # ✅ Constructor rute turistice
│   │   │   ├── ServicesScreen.js       # ✅ Listă furnizori servicii
│   │   │   ├── ProviderDetailScreen.js # ✅ Detalii furnizor
│   │   │   ├── ManageProviderScreen.js # ✅ Administrare profil furnizor
│   │   │   ├── ManageTablesScreen.js   # ✅ Administrare mese restaurant
│   │   │   ├── ManageRoomsScreen.js    # ✅ Administrare camere hotel
│   │   │   ├── ManageServicesScreen.js # ✅ Administrare servicii
│   │   │   ├── ManageEmployeesScreen.js# ✅ Administrare angajați
│   │   │   ├── ManageExperiencesScreen.js # ✅ Administrare experiențe
│   │   │   ├── BookServiceScreen.js    # ✅ Rezervare serviciu
│   │   │   ├── BookEventScreen.js      # ✅ Rezervare eveniment
│   │   │   ├── BookExperienceScreen.js # ✅ Rezervare experiență
│   │   │   └── BookingCalendarScreen.js# ✅ Calendar rezervări
│   │   │
│   │   ├── components/
│   │   │   ├── ChatWidget.js        # ✅ Widget chatbot RAG integrat
│   │   │   └── SuggestedQuestions.js# ✅ Întrebări sugerate automat
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.js       # Global auth state (JWT)
│   │   │
│   │   └── services/
│   │       └── api.js               # API client (axios)
│   │
│   ├── App.js                       # Root component + navigare Stack
│   ├── package.json                 # npm dependencies
│   └── app.json                     # Expo configuration
│
├── docs/                            # Diagrame UML
│   ├── 1-usecase-diagram.puml
│   ├── 2-class-diagram.puml
│   ├── 3-sequence-diagram.puml
│   └── APPLICATION_OVERVIEW.md
│
├── render.yaml                      # Configurare deployment Render.com
├── DEPLOYMENT_GUIDE.md              # Ghid deployment HuggingFace
└── README.md                        # 📖 Acest fișier
```

---

## 🔧 Troubleshooting (Rezolvare Probleme)

### ❌ **Backend nu pornește**

**Problema:** MongoDB nu rulează

**Soluție:**
```powershell
Get-Service MongoDB
net start MongoDB
```

---

### ❌ **"Registration Failed" în aplicație**

**Problema 1:** Backend-ul nu rulează
```powershell
curl http://localhost:8000/health
cd backend
.\start.ps1
```

**Problema 2:** API URL greșit (pentru telefon real)
1. Editează `mobile/src/services/api.js`
2. Schimbă `localhost` cu IP-ul PC-ului tău
3. Reîncarcă aplicația (shake telefon → Reload)

---

### ❌ **"Network Error" pe telefon**

**Cauze posibile:**
1. PC-ul și telefonul nu sunt pe aceeași rețea WiFi
2. Firewall-ul blochează portul 8000
3. Backend-ul nu ascultă pe `0.0.0.0`

**Soluții:**
```powershell
# Adaugă regulă firewall
New-NetFirewallRule -DisplayName "FastAPI Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

### ❌ **RAG chatbot nu răspunde**

**Cauze posibile:**
1. `HF_RAG_SPACE_URL` nu este setat în `backend/.env`
2. HuggingFace Space este în sleep mode (primul request durează 30-60s)
3. `OPENAI_API_KEY` invalid sau fără credit

**Soluție:**
```powershell
# Testează direct HF Space
curl https://latcu-timisoaralens-rag.hf.space/health
```

---

### ❌ **Erori Stripe la rezervări**

**Cauze:**
1. `STRIPE_SECRET_KEY` lipsește din `.env`
2. Se folosesc chei live în loc de test

**Soluție:**
- Asigură-te că folosești chei de test (`sk_test_...`)
- Card test: `4242 4242 4242 4242`, orice dată viitoare, orice CVC

---

### ❌ **Erori bcrypt/passlib**

**Eroare:** `ValueError: password cannot be longer than 72 bytes`

**Soluție:**
```powershell
cd backend
.\.venv\Scripts\pip.exe install --upgrade bcrypt==4.1.2
```

---

### ❌ **expo-location / hartă nu funcționează**

**Soluție:**
```bash
cd mobile
npx expo install expo-location react-native-maps
npx expo start -c
```

---

## 📋 Features Implementate

### ✅ **Funcționalități Complete**
- ✅ **Autentificare completă** - Register, Login, JWT tokens (bcrypt hashing)
- ✅ **MongoDB integration** - Async driver (Motor), colecții: users, listings, bookings, providers, tables, rooms, services, employees, experiences
- ✅ **React Native App** - 20+ ecrane funcționale
- ✅ **Navigation System** - Auth/App routing automat cu Stack Navigator
- ✅ **Token Persistence** - AsyncStorage pentru sesiuni persistente
- ✅ **Form Validation** - Client & server-side
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Hartă interactivă** - React Native Maps cu markere obiective turistice
- ✅ **GPS real-time** - expo-location + Haversine distance
- ✅ **Chatbot RAG** - ChatWidget integrat în HomeScreen cu suggested questions
- ✅ **RAG Service** - Qdrant Cloud + OpenAI (gpt-5-mini) + SentenceTransformers
- ✅ **Rate Limiter** - Protecție per-IP per-rută (auth: 20 req/min, RAG: 60, global: 180)
- ✅ **Listings Management** - CRUD complet pentru proprietăți (hotele, apartamente)
- ✅ **Upload Imagini** - expo-image-picker + stocare proprietate
- ✅ **Location Picker** - Selector coordonate GPS pe hartă pentru listings
- ✅ **Rezervări Mese** - Rezervări restaurant cu management mese, angajați, ore lucru
- ✅ **Rezervări Camere** - Rezervări hotel cu calendar disponibilitate
- ✅ **Rezervări Servicii** - Booking pentru curățenie, electrician, ghid turistic, etc.
- ✅ **Rezervări Experiențe** - Evenimente și experiențe cu date și locuri disponibile
- ✅ **Apartment Bookings cu Stripe** - Plată online, PaymentIntent cu capture manual, flux accept/respingere de către proprietar, webhook Stripe
- ✅ **Provider Management** - Furnizori pot gestiona masa, camere, servicii, angajați
- ✅ **Route Builder** - Constructor rute turistice personalizate
- ✅ **Profil Utilizator** - Editare profil, dating rezervări
- ✅ **Booking Calendar** - Calendar vizualizare rezervări proprii
- ✅ **Assistant AI (Bookings)** - Asistent conversațional pentru rezervări

### 📍 **Parțial Implementat**
- 🔄 **Quiz Generator** - Structură API ready, logică LLM placeholder

### 🚧 **Planificat**
- 📋 **Vision Module** - Recunoaștere imagini (MobileNetV3)
- 📋 **Audio Guide** - Text-to-Speech pentru narative
- 📋 **Multi-language** - Suport i18n (RO, EN, DE)
- 📋 **Gamification** - Puncte, badge-uri, leaderboard

---

## 🔗 API Endpoints

După pornirea backend-ului, documentația completă este disponibilă la:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

### **Authentication** `/api/auth`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/register` | Înregistrare user nou | ❌ |
| POST | `/api/auth/login` | Login (OAuth2 form) | ❌ |
| POST | `/api/auth/login-json` | Login (JSON) | ❌ |
| GET | `/api/auth/me` | Profil user curent | ✅ |
| GET | `/api/auth/users/count` | Număr total users | ❌ |

### **GPS** `/api/gps`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| POST | `/api/gps/check-location` | Verifică proximitate obiective | ✅ |

### **Listings** `/api/listings`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| GET | `/api/listings` | Listă proprietăți | ❌ |
| POST | `/api/listings` | Creare listing (cu image upload) | ✅ |
| GET | `/api/listings/{id}` | Detalii proprietate | ❌ |
| PUT | `/api/listings/{id}` | Actualizare listing | ✅ |
| DELETE | `/api/listings/{id}` | Ștergere listing | ✅ |
| GET | `/api/listings/my` | Listings proprii | ✅ |
| POST | `/api/listings/backfill-rag` | Re-indexare în Qdrant | ✅ |

### **Bookings (Restaurante/Servicii)** `/api/bookings`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| POST | `/api/bookings/providers` | Creare profil furnizor | ✅ |
| GET | `/api/bookings/providers` | Listă furnizori | ❌ |
| GET | `/api/bookings/providers/{id}` | Detalii furnizor | ❌ |
| POST | `/api/bookings/providers/{id}/tables` | Adăugare masă | ✅ |
| POST | `/api/bookings/providers/{id}/rooms` | Adăugare cameră | ✅ |
| POST | `/api/bookings/providers/{id}/services` | Adăugare serviciu | ✅ |
| POST | `/api/bookings/providers/{id}/employees` | Adăugare angajat | ✅ |
| POST | `/api/bookings/providers/{id}/experiences` | Creare experiență | ✅ |
| POST | `/api/bookings/reserve` | Rezervare masă/cameră | ✅ |
| POST | `/api/bookings/book-service` | Rezervare serviciu | ✅ |
| POST | `/api/bookings/book-experience` | Rezervare experiență | ✅ |
| GET | `/api/bookings/my` | Rezervările mele | ✅ |
| POST | `/api/bookings/assistant` | Asistent AI rezervări | ✅ |

### **Apartment Bookings (Stripe)** `/api/apartment-bookings`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| POST | `/api/apartment-bookings/{listing_id}/booking-requests` | Creare cerere rezervare + PaymentIntent | ✅ |
| GET | `/api/apartment-bookings/my-requests` | Cererile mele ca oaspete | ✅ |
| GET | `/api/apartment-bookings/my-incoming-requests` | Cereri primite ca proprietar | ✅ |
| POST | `/api/apartment-bookings/{req_id}/accept` | Acceptare + captare plată Stripe | ✅ |
| POST | `/api/apartment-bookings/{req_id}/reject` | Respingere + anulare PaymentIntent | ✅ |
| POST | `/api/apartment-bookings/{req_id}/cancel` | Anulare de către oaspete | ✅ |
| POST | `/api/apartment-bookings/webhook` | Webhook Stripe (async events) | ❌ |

### **RAG Chatbot** `/api/rag`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| POST | `/api/rag/query` | Query chatbot cu context Qdrant | ❌ |
| POST | `/api/rag/suggested-questions` | Generare întrebări sugerate | ❌ |
| GET | `/api/rag/health` | Status RAG service | ❌ |

### **Quiz** `/api/quiz`

| Method | Endpoint | Descriere | Auth |
|--------|----------|-----------|------|
| POST | `/api/quiz/generate/{landmark_id}` | Generare quiz (placeholder) | ❌ |
| POST | `/api/quiz/submit` | Trimitere răspunsuri | ❌ |

---

## 📊 Date Preîncărcate

### **Obiective Turistice (GPS)**

5 obiective cu coordonate pentru testare GPS:

1. **Catedrala Mitropolitană** (45.7489, 21.2267)
2. **Piața Unirii** (45.7537, 21.2257)
3. **Bastionul Theresia** (45.7522, 21.2311)
4. **Opera Națională** (45.7567, 21.2297)
5. **Castelul Huniade** (45.7514, 21.2262)

### **Colecții Qdrant (Knowledge Base RAG)**

Toate datele sunt indexate în Qdrant Cloud sub colecția `timisoara_knowledge`:

| Fișier | Conținut |
|--------|----------|
| `timisoara_history_chunks.json` | Istoria orașului Timișoara |
| `timisoara_landmarks_chunks.json` | Obiective turistice detaliate |
| `timisoara_revolution_chunks.json` | Revoluția din 1989 |
| `timisoara_2023_chunks.json` | Timișoara Capitală Culturală Europeană 2023 |
| `a_day_in_timisoara_chunks.json` | Ghid o zi în Timișoara |
| `timisoara_for_business_chunks.json` | Timișoara pentru afaceri |
| `visit_timisoara_useful_info.json` | Informații utile vizitatori |
| `timisoara_firsts.json` | Premiere istorice Timișoara |
| `osm_bars_pubs.json` | Baruri și pub-uri (OpenStreetMap) |
| `osm_cafes.json` | Cafenele (OpenStreetMap) |
| `osm_entertainment.json` | Divertisment (OpenStreetMap) |
| `osm_religious.json` | Lăcașuri de cult (OpenStreetMap) |
| `osm_shops.json` | Magazine (OpenStreetMap) |

Scripturi de indexare disponibile în `backend/scripts/add_*_to_qdrant.py`.

---

## 🎯 Next Steps (Următorii Pași)

### **Scurt Termen**
1. ✅ ~~Implementare autentificare~~ (DONE)
2. ✅ ~~Setup MongoDB~~ (DONE)
3. ✅ ~~React Native app cu navigation~~ (DONE)
4. ✅ ~~GPS tracking real-time~~ (DONE)
5. ✅ ~~Map integration~~ - React Native Maps (DONE)
6. ✅ ~~RAG System~~ - Qdrant + OpenAI (DONE)
7. ✅ ~~Listings & Bookings~~ - Hotel, restaurant, servicii (DONE)
8. ✅ ~~Plăți online~~ - Stripe pentru apartamente (DONE)

### **Mediu Termen**
9. 🎯 **Quiz Generator** - LLM pentru generare quiz-uri contextuale
10. 🏆 **Gamification** - Puncte, badge-uri, leaderboard

### **Lung Termen**
11. 📸 **Vision Module** - MobileNetV3 pentru recunoaștere imagini
12. 🔊 **Audio Guide** - Text-to-Speech pentru narative
13. 🌍 **Multi-language** - Suport i18n (RO, EN, DE)

---

## 🛠️ Development Tools

### **Backend Development**
```powershell
# Activează venv
cd backend
.\.venv\Scripts\Activate.ps1

# Rulează backend cu auto-reload
python main.py

# Testează API-ul
curl http://localhost:8000/api/auth/users/count

# Testează RAG (suggested questions)
python test_suggested_questions.py
```

### **Mobile Development**
```bash
# Pornește Expo cu tunnel (pentru acces remote)
npx expo start --tunnel

# Clear cache dacă ai probleme
npx expo start -c

# Build pentru Android
npx expo run:android
```

### **MongoDB Management**
```bash
# Conectare MongoDB
mongosh

# Folosește CityLens database
use TimisoaraLens

# Vezi colecțiile
show collections

# Query users
db.users.find().pretty()

# Query listings
db.listings.find({status: "active"}).count()

# Șterge un user de test
db.users.deleteOne({username: "testuser"})
```

---

## 🚀 Deployment

### **Backend → Render.com**

Configurare în `render.yaml` (Frankfurt region, Python 3.11):

```bash
# Deploy automat la push pe branch main
git push origin main
```

Variabile de mediu setate în dashboard Render:
`MONGODB_URL`, `SECRET_KEY`, `HF_RAG_SPACE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### **RAG Service → HuggingFace Spaces**

```bash
# Adaugă remote HF Space
git remote add hf https://huggingface.co/spaces/latcu/timisoaralens-rag

# Deploy
cd TimisoaraLens-RAG
git subtree push --prefix TimisoaraLens-RAG hf main
```

Secrets setate în HF Space: `QDRANT_URL`, `QDRANT_API_KEY`, `OPENAI_API_KEY`

---

## 📝 Environment Variables

### **backend/.env**
```env
# ── MongoDB ────────────────────────────────────────────
MONGODB_URL=mongodb://localhost:27017/TimisoaraLens
DATABASE_NAME=TimisoaraLens

# ── JWT Authentication ─────────────────────────────────
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# ── Server ─────────────────────────────────────────────
API_PORT=8000
API_HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:19000,exp://192.168.X.X:8081

# ── RAG Service (HuggingFace Space) ────────────────────
HF_RAG_SPACE_URL=https://latcu-timisoaralens-rag.hf.space
RAG_BASE_URL=https://latcu-timisoaralens-rag.hf.space

# ── Stripe (Apartment Bookings) ────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Rate Limiting (opțional, default-uri implicite) ────
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_DEFAULT_MAX_REQUESTS=180
RATE_LIMIT_AUTH_MAX_REQUESTS=20
RATE_LIMIT_ASSISTANT_MAX_REQUESTS=45
RATE_LIMIT_RAG_MAX_REQUESTS=60
```

### **TimisoaraLens-RAG/.env** (HuggingFace Space Secrets)
```env
# ── Qdrant Cloud ───────────────────────────────────────
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key

# ── OpenAI ────────────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
OPENAI_FALLBACK_MODELS=gpt-4.1-mini

# ── Colecții Qdrant ────────────────────────────────────
APARTMENTS_COLLECTION=apartments
SERVICES_COLLECTION=services_hub
```

---

## 📞 Contact & Support

- 🐛 **Issues:** https://github.com/CristiL75/TimisoaraLens/issues
- 💬 **Discussions:** https://github.com/CristiL75/TimisoaraLens/discussions

---

## 📄 License

Acest proiect este licensed under the MIT License.

---

**🏛️ Developed with ❤️ for Timișoara**

*Explorează istoria și frumusețea Timișoarei cu ajutorul AI!*
