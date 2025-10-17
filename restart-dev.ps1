# PowerShell script to restart development server
# This script kills any existing Node.js processes and starts the dev server

Write-Host "Stopping existing Node.js processes..." -ForegroundColor Yellow

# Kill all Node.js processes
try {
    taskkill /IM node.exe /F 2>$null
    Write-Host "Node.js processes stopped." -ForegroundColor Green
} catch {
    Write-Host "No Node.js processes found." -ForegroundColor Gray
}

# Wait a moment
Start-Sleep -Seconds 2

Write-Host "Cleaning Next.js cache..." -ForegroundColor Yellow

# Remove .next directory if it exists
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Next.js cache cleaned." -ForegroundColor Green
} else {
    Write-Host "No cache to clean." -ForegroundColor Gray
}

Write-Host "Starting development server..." -ForegroundColor Yellow

# Start the development server
npm run dev


