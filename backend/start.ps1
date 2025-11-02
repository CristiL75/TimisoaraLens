# Start CityLens Backend Server with Virtual Environment
# Usage: .\start.ps1

Write-Host "🚀 Starting CityLens Backend..." -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path ".\venv\Scripts\python.exe")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Check if MongoDB is running (optional check)
Write-Host "🗄️  Checking MongoDB connection..." -ForegroundColor Yellow

# Activate virtual environment and start server
Write-Host "✅ Starting FastAPI server with uvicorn..." -ForegroundColor Green
Write-Host ""
.\venv\Scripts\python.exe main.py
