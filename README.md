# 🏛️ CityLens Timișoara

Aplicație mobilă AI pentru explorarea orașului Timișoara cu funcții de tracking GPS, informații turistice și quiz-uri interactive.

## 📱 Tehnologii

### Backend
- **FastAPI** - REST API cu documentație automată
- **MongoDB** - Bază de date NoSQL (Motor async driver)
- **JWT Authentication** - Autentificare securizată cu bcrypt
- **Python 3.11+** - Environment virtual (venv)

### Frontend
- **React Native** - Aplicație mobilă cross-platform
- **Expo** - Development toolchain
- **React Navigation** - Navigare între ecrane
- **React Native Paper** - UI components
- **AsyncStorage** - Persistență locală
- **Axios** - HTTP client

### AI Features (Coming Soon)
- **LangChain + Ollama** - RAG system pentru informații turistice
- **ChromaDB** - Vector database pentru embeddings
- **Quiz Generator** - Quiz-uri generate de AI

---

## 🚀 Cum pornești aplicația

### **Pas 1: Pornește MongoDB**
```powershell
# Verifică dacă MongoDB rulează
Get-Service MongoDB

# Pornește serviciul MongoDB
net start MongoDB
```

### **Pas 2: Pornește Backend (Terminal 1)**
```powershell
# Navighează la folder backend
cd backend

# Pornește serverul (folosește venv automat)
.\start.ps1
```

**SAU manual:**
```powershell
cd backend
c:\Users\OWNER\Desktop\TimisoaraLens\backend\venv\Scripts\python.exe main.py
```

✅ **Backend va rula pe:** `http://localhost:8000`
📖 **API Docs:** `http://localhost:8000/docs`

### **Pas 3: Pornește Mobile App (Terminal 2)**
```bash
# Navighează la folder mobile
cd mobile

# Pornește Expo
npx expo start
```

### **Pas 4: Deschide aplicația**

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
python -m venv venv

# Activează venv
.\venv\Scripts\Activate.ps1

# Instalează pachetele
pip install -r requirements.txt
```

### **Mobile Setup**
```bash
cd mobile

# Instalează dependențele
npm install
```

### **Configurare API URL pentru telefon real**

⚠️ **IMPORTANT:** Dacă testezi pe telefon real, editează `mobile/src/services/api.js`:

```javascript
// Schimbă de la:
const API_URL = 'http://localhost:8000/api';

// La IP-ul PC-ului tău:
const API_URL = 'http://192.168.100.45:8000/api';
```

**Cum afli IP-ul PC-ului:**
```powershell
ipconfig
# Caută "IPv4 Address" pentru adaptorul WiFi
```

---

## 🧪 Testare Aplicație

### **1. Register (Înregistrare)**
1. Deschide aplicația
2. Click pe **"Create Account"**
3. Completează formular:
   - **Email:** `test@example.com`
   - **Username:** `testuser` (minim 3 caractere)
   - **Password:** `test123` (minim 6 caractere)
   - **Full Name:** `Test User` (opțional)
4. Click **"Register"**

✅ În terminal backend vei vedea: `POST /api/auth/register HTTP/1.1" 201 Created`

### **2. Login (Autentificare)**
1. Introdu username și password
2. Click **"Login"**
3. Vei fi redirectat la **HomeScreen**

✅ Token JWT este salvat automat în AsyncStorage

### **3. Verificare MongoDB**
```bash
# Conectează-te la MongoDB
mongosh

# Selectează database
use TimisoaraLens

# Vezi utilizatorii înregistrați
db.users.find().pretty()
```

---

## 🗂️ Structura Proiectului

```
TimisoaraLens/
│
├── backend/                    # FastAPI Backend
│   ├── venv/                  # Python virtual environment
│   ├── api/                   # API endpoints
│   │   ├── auth.py           # ✅ Authentication (register, login)
│   │   ├── gps.py            # 📍 GPS & location tracking
│   │   ├── rag.py            # 🤖 RAG system (TODO)
│   │   └── quiz.py           # 🎯 Quiz generator (TODO)
│   │
│   ├── data/
│   │   └── coordinates.json  # 5 obiective turistice Timișoara
│   │
│   ├── auth_utils.py         # JWT tokens + bcrypt hashing
│   ├── database_mongo.py     # MongoDB connection & models
│   ├── main.py               # FastAPI app entry point
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment variables
│   └── start.ps1             # ⚡ Script pornire backend
│
├── mobile/                    # React Native App
│   ├── src/
│   │   ├── screens/          # UI Screens
│   │   │   ├── LoginScreen.js       # ✅ Ecran login
│   │   │   ├── RegisterScreen.js    # ✅ Ecran register
│   │   │   └── HomeScreen.js        # ✅ Ecran principal
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.js       # Global auth state
│   │   │
│   │   └── services/
│   │       └── api.js               # API client (axios)
│   │
│   ├── App.js                # Root component + navigation
│   ├── package.json          # npm dependencies
│   └── app.json              # Expo configuration
│
└── README.md                 # 📖 Acest fișier
```

---

## 🔧 Troubleshooting (Rezolvare Probleme)

### ❌ **Backend nu pornește**

**Problema:** MongoDB nu rulează

**Soluție:**
```powershell
# Verifică status
Get-Service MongoDB

# Pornește serviciul
net start MongoDB
```

---

### ❌ **"Registration Failed" în aplicație**

**Problema 1:** Backend-ul nu rulează

**Soluție:**
```powershell
# Verifică dacă backend rulează
curl http://localhost:8000/health

# Dacă nu răspunde, pornește backend-ul
cd backend
.\start.ps1
```

**Problema 2:** API URL greșit (pentru telefon real)

**Soluție:**
1. Editează `mobile/src/services/api.js`
2. Schimbă `localhost` cu IP-ul PC-ului tău
3. Reîncarcă aplicația (shake telefon → Reload)

---

### ❌ **"Network Error" pe telefon**

**Cauze posibile:**
1. ❌ PC-ul și telefonul NU sunt pe aceeași rețea WiFi
2. ❌ Firewall-ul blochează portul 8000
3. ❌ Backend-ul nu ascultă pe `0.0.0.0`

**Soluții:**

**1. Verifică rețeaua WiFi:**
- Ambele dispozitive trebuie să fie pe **aceeași rețea**

**2. Verifică Firewall-ul:**
```powershell
# Adaugă regulă firewall pentru portul 8000
New-NetFirewallRule -DisplayName "FastAPI Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

**3. Verifică backend-ul:**
- În `backend/main.py`, host-ul trebuie să fie `0.0.0.0` (nu `127.0.0.1`)

---

### ❌ **Erori bcrypt/passlib**

**Eroare:** `ValueError: password cannot be longer than 72 bytes`

**Soluție:**
```powershell
cd backend
.\venv\Scripts\pip.exe install --upgrade bcrypt==4.1.2
```

---

## 📋 Features Implementate

### ✅ **Funcționalități Complete**
- ✅ **Autentificare completă** - Register, Login, JWT tokens
- ✅ **MongoDB integration** - Async driver (Motor)
- ✅ **React Native App** - Login/Register/Home screens
- ✅ **Navigation System** - Auth/No-Auth routing automat
- ✅ **Token Persistence** - AsyncStorage pentru sesiuni persistente
- ✅ **Password Security** - bcrypt hashing
- ✅ **Form Validation** - Client & server-side
- ✅ **Error Handling** - User-friendly error messages

### 📍 **Parțial Implementat**
- 🔄 **GPS Module** - Haversine distance calculation (backend gata)
- 🔄 **5 Obiective** - Coordonate GPS pentru Timișoara (date gata)

### 🚧 **In Development**
- 📋 **RAG System** - LangChain + Ollama + ChromaDB
- 📋 **Quiz Generator** - AI-powered quizzes
- 📋 **Vision Module** - Image recognition (implementare mai târziu)

---

## 🔗 API Endpoints

După pornirea backend-ului, documentația este disponibilă la:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

### **Authentication Endpoints**

| Method | Endpoint | Descriere | Auth Required |
|--------|----------|-----------|---------------|
| POST | `/api/auth/register` | Înregistrare user nou | ❌ |
| POST | `/api/auth/login` | Login (OAuth2 form) | ❌ |
| POST | `/api/auth/login-json` | Login (JSON) | ❌ |
| GET | `/api/auth/me` | Profil user curent | ✅ |
| GET | `/api/auth/users/count` | Număr total users | ❌ |

### **GPS Endpoints (Coming Soon)**

| Method | Endpoint | Descriere | Auth Required |
|--------|----------|-----------|---------------|
| POST | `/api/gps/check-location` | Verifică proximitate obiective | ✅ |

---

## 📊 Date Preîncărcate

### **5 Obiective Turistice Timișoara**

Aplicația vine cu coordonate GPS pentru:

1. **Catedrala Mitropolitană** (45.7489, 21.2267)
2. **Piața Unirii** (45.7537, 21.2257)
3. **Bastionul Theresia** (45.7522, 21.2311)
4. **Opera Națională** (45.7567, 21.2297)
5. **Castelul Huniade** (45.7514, 21.2262)

---

## 🎯 Next Steps (Următorii Pași)

### **Scurt Termen**
1. ✅ ~~Implementare autentificare~~ (DONE)
2. ✅ ~~Setup MongoDB~~ (DONE)
3. ✅ ~~React Native app cu navigation~~ (DONE)
4. 📍 **GPS tracking real-time** (în lucru)
5. 🗺️ **Map integration** - React Native Maps

### **Mediu Termen**
6. 🤖 **RAG System** - Ollama + ChromaDB pentru informații turistice
7. 🎯 **Quiz Generator** - LLM pentru generare quiz-uri contextuale
8. 🏆 **Gamification** - Puncte, badge-uri, leaderboard

### **Lung Termen**
9. 📸 **Vision Module** - MobileNetV3 pentru recunoaștere imagini
10. 🔊 **Audio Guide** - Text-to-Speech pentru narative
11. 🌍 **Multi-language** - Suport i18n (RO, EN, DE)

---

## 🛠️ Development Tools

### **Backend Development**
```powershell
# Activează venv
cd backend
.\venv\Scripts\Activate.ps1

# Rulează backend cu auto-reload
python main.py

# Testează API-ul
curl http://localhost:8000/api/auth/users/count
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

# Vezi toate database-urile
show dbs

# Folosește CityLens database
use TimisoaraLens

# Vezi colecțiile
show collections

# Query users
db.users.find().pretty()

# Șterge un user
db.users.deleteOne({username: "testuser"})
```

---

## 📝 Environment Variables

### **backend/.env**
```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/TimisoaraLens
DATABASE_NAME=TimisoaraLens

# JWT Configuration
SECRET_KEY=your-secret-key-change-this-in-production-12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Server Configuration
API_PORT=8000
API_HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:19000,exp://192.168.100.45:8081
```

---

## 📞 Contact & Support

Pentru întrebări, probleme sau sugestii:
- 📧 Email: [your-email@example.com]
- 🐛 Issues: Deschide un issue pe GitHub
- 💬 Discussions: GitHub Discussions

---

## 📄 License

Acest proiect este licensed under the MIT License.

---

**🏛️ Developed with ❤️ for Timișoara**

*Explorează istoria și frumusețea Timișoarei cu ajutorul AI!*
