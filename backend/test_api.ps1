# 🧪 Quick Test Script pentru Backend
# Rulează acest script pentru a testa API-ul

Write-Host "🧪 Testing CityLens Backend API..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"

# Test 1: Health Check
Write-Host "1️⃣ Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    $health | ConvertTo-Json
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Register User
Write-Host "2️⃣ Testing user registration..." -ForegroundColor Yellow
$registerData = @{
    email = "test@citylens.ro"
    username = "testuser"
    password = "test123"
    full_name = "Test User"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $registerData -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    $register | ConvertTo-Json
} catch {
    Write-Host "⚠️ Registration failed (might already exist): $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Login
Write-Host "3️⃣ Testing user login..." -ForegroundColor Yellow
$loginData = @{
    username = "testuser"
    password = "test123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login-json" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    $token = $login.access_token
    Write-Host "🔑 Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
    
    Write-Host ""
    
    # Test 4: Get User Info
    Write-Host "4️⃣ Testing authenticated endpoint (get user info)..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $userInfo = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -Headers $headers
    Write-Host "✅ Got user info!" -ForegroundColor Green
    $userInfo | ConvertTo-Json
    
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: GPS Check
Write-Host "5️⃣ Testing GPS endpoint..." -ForegroundColor Yellow
$gpsData = @{
    latitude = 45.7489
    longitude = 21.2267
    accuracy = 10
} | ConvertTo-Json

try {
    $gps = Invoke-RestMethod -Uri "$baseUrl/api/gps/check" -Method Post -Body $gpsData -ContentType "application/json"
    Write-Host "✅ GPS check successful!" -ForegroundColor Green
    Write-Host "📍 Found $($gps.Count) landmarks" -ForegroundColor Cyan
    $gps[0] | ConvertTo-Json
} catch {
    Write-Host "❌ GPS check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "✨ Tests completed! Check results above." -ForegroundColor Cyan
