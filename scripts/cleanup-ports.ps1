# Cleanup Ports Script for Urus Studio
# Dọn dẹp các ports đang bị sử dụng

Write-Host "🧹 Dọn dẹp ports cho Urus Studio..." -ForegroundColor Green

# Script tự động cleanup port 9002
# Chạy script này trước khi khởi động server để tránh lỗi EADDRINUSE

Write-Host "Đang kiểm tra và cleanup port 9002..." -ForegroundColor Yellow

# Tìm process đang sử dụng port 9002
$processes = netstat -ano | findstr :9002

if ($processes) {
    Write-Host "Tìm thấy process đang sử dụng port 9002:" -ForegroundColor Red
    $processes | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    
    # Lấy PID từ output
    $pids = $processes | ForEach-Object {
        $parts = $_ -split '\s+'
        $parts[-1]  # Lấy phần tử cuối cùng (PID)
    } | Sort-Object -Unique
    
    foreach ($pid in $pids) {
        try {
            Write-Host "Đang kill process PID: $pid" -ForegroundColor Yellow
            taskkill /PID $pid /F
            Write-Host "Đã kill thành công process PID: $pid" -ForegroundColor Green
        }
        catch {
            Write-Host "Không thể kill process PID: $pid - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Đợi một chút để port được giải phóng
    Start-Sleep -Seconds 2
    
    # Kiểm tra lại
    $remaining = netstat -ano | findstr :9002
    if ($remaining) {
        Write-Host "Vẫn còn process sử dụng port 9002:" -ForegroundColor Red
        $remaining | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    } else {
        Write-Host "Port 9002 đã được giải phóng thành công!" -ForegroundColor Green
    }
} else {
    Write-Host "Port 9002 không bị sử dụng." -ForegroundColor Green
}

Write-Host "Cleanup hoàn tất!" -ForegroundColor Green

Write-Host "🎉 Hoàn thành dọn dẹp ports!" -ForegroundColor Green
Write-Host "💡 Bây giờ bạn có thể chạy: npm run dev" -ForegroundColor Cyan 