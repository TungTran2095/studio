# Cleanup Ports Script for Urus Studio
# Dọn dẹp các ports đang bị sử dụng

Write-Host "🧹 Dọn dẹp ports cho Urus Studio..." -ForegroundColor Green

# Kiểm tra và dừng port 9002 (Next.js dev server)
$port9002 = netstat -ano | findstr :9002
if ($port9002) {
    Write-Host "🔍 Tìm thấy process đang sử dụng port 9002" -ForegroundColor Yellow
    $pid = ($port9002[0] -split '\s+')[4]
    Write-Host "🛑 Dừng process PID: $pid" -ForegroundColor Red
    taskkill /F /PID $pid
    Write-Host "✅ Port 9002 đã được giải phóng" -ForegroundColor Green
} else {
    Write-Host "✅ Port 9002 đang trống" -ForegroundColor Green
}

# Kiểm tra và dừng port 3000 (backup port)
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "🔍 Tìm thấy process đang sử dụng port 3000" -ForegroundColor Yellow
    $pid = ($port3000[0] -split '\s+')[4]
    Write-Host "🛑 Dừng process PID: $pid" -ForegroundColor Red
    taskkill /F /PID $pid
    Write-Host "✅ Port 3000 đã được giải phóng" -ForegroundColor Green
} else {
    Write-Host "✅ Port 3000 đang trống" -ForegroundColor Green
}

Write-Host "🎉 Hoàn thành dọn dẹp ports!" -ForegroundColor Green
Write-Host "💡 Bây giờ bạn có thể chạy: npm run dev" -ForegroundColor Cyan 