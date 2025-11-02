@echo off
echo 🚀 Starting CityLens Backend...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
python main.py
pause
