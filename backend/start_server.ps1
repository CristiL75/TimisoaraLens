# 🚀 START BACKEND SERVER

Write-Host "🚀 Starting CityLens Backend..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 API Documentation will be available at:" -ForegroundColor Yellow
Write-Host "   http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Change to backend directory
Set-Location "c:\Users\OWNER\Desktop\TimisoaraLens\backend"

# Activate virtual environment if exists
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    Write-Host "🐍 Activating virtual environment..." -ForegroundColor Cyan
    .\venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️ Virtual environment not found. Please run setup first!" -ForegroundColor Yellow
    Write-Host "Run: python -m venv venv" -ForegroundColor Gray
    exit
}

# Start server
Write-Host "🌐 Starting FastAPI server..." -ForegroundColor Cyan
python main.py
