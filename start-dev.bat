@echo off
echo 🚀 Khởi động Urus Studio Development Server...
echo.

echo 🧹 Dọn dẹp port 9002...
powershell -ExecutionPolicy Bypass -File "scripts\cleanup-ports.ps1" -Port 9002

echo.
echo 📦 Khởi động development server...
npm run dev

pause 