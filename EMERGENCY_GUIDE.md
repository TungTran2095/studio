# 🚨 HƯỚNG DẪN KHẨN CẤP - GIẢI QUYẾT IP BAN BINANCE

## 📋 Tình trạng hiện tại
- **IP đã bị ban** từ Binance API do quá nhiều requests
- **Thời gian ban:** Đến 1759488899563 (khoảng 10 phút)
- **Lý do:** Vượt quá rate limit (HTTP 418: I'm a teapot)

## ✅ Các biện pháp đã triển khai

### 1. 🛡️ Emergency Mode Activated
- Tất cả API calls đến Binance đã bị **CHẶN**
- Rate limits giảm xuống mức cực thấp (300 weight/min)
- Auto-reset sau 10 phút

### 2. ⏱️ Polling Intervals Optimized
- **Rate Monitor:** 3s → 30s
- **Analysis Panel:** 5s → 60s  
- **API Monitor:** 5s → 60s
- **Price Monitor:** 30s → 120s
- **Smart API Status:** 10s → 60s
- **Timestamp Monitor:** 5s → 30s

### 3. 🔌 WebSocket Implementation
- Tạo hook `useWebSocketPrice` để thay thế REST API
- Cập nhật `TotalAssetsCard` sử dụng WebSocket
- Fallback mechanism khi WebSocket không hoạt động

### 4. 💾 Enhanced Caching
- TTL tăng từ 30s → 120s
- Cache size tăng từ 1000 → 2000
- Cleanup interval tăng từ 1m → 5m

## 🎯 Hành động ngay lập tức

### 1. Đợi IP ban hết hạn
```bash
# Kiểm tra thời gian ban còn lại
node -e "console.log('Ban expires at:', new Date(1759488899563).toLocaleString())"
```

### 2. Restart ứng dụng
```bash
# Dừng ứng dụng hiện tại
# Sau đó restart với emergency mode
npm run dev
```

### 3. Kiểm tra trạng thái
- Mở `/api/monitor/emergency-status` để xem trạng thái
- Kiểm tra `emergency-mode.json` file
- Monitor logs để đảm bảo không có API calls

## 🔧 Cấu hình khẩn cấp

### Environment Variables (.env.local)
```env
# EMERGENCY MODE - Ultra Conservative Limits
BINANCE_USED_WEIGHT_PER_MIN=300
BINANCE_ORDERS_PER_10S=10
BINANCE_ORDERS_PER_1M=400
BINANCE_ORDERS_PER_1D=50000
BINANCE_RAW_1M=2000

# Force emergency mode
BINANCE_EMERGENCY_MODE=true

# Disable polling
DISABLE_POLLING=true
```

## 📊 Monitoring & Debugging

### 1. Kiểm tra API calls
```bash
# Xem logs để đảm bảo không có API calls
tail -f logs/emergency-actions.log
```

### 2. Monitor WebSocket status
```typescript
// Sử dụng hook để kiểm tra WebSocket
import { useWebSocketStatus } from '@/hooks/use-websocket-price';

const { isConnected, lastConnectionCheck } = useWebSocketStatus();
```

### 3. Emergency reset (nếu cần)
```bash
# Reset emergency mode thủ công
node scripts/emergency-rate-limit-reset.js
```

## 🚀 Sau khi IP ban hết hạn

### 1. Kiểm tra kết nối
- Test API với 1 request đơn giản
- Đảm bảo WebSocket hoạt động
- Monitor rate limits

### 2. Gradual ramp-up
- Bắt đầu với polling intervals cao (60s+)
- Tăng dần khi thấy stable
- Luôn monitor rate limits

### 3. Best practices
- **Ưu tiên WebSocket** cho price updates
- **Sử dụng caching** với TTL phù hợp
- **Monitor rate limits** liên tục
- **Implement circuit breaker** cho API calls

## ⚠️ Lưu ý quan trọng

1. **KHÔNG** restart ứng dụng trong vòng 10 phút đầu
2. **KHÔNG** thực hiện API calls thủ công
3. **ĐỢI** emergency mode tự động reset
4. **MONITOR** logs để đảm bảo không có calls

## 📞 Hỗ trợ

Nếu vấn đề vẫn tiếp tục:
1. Kiểm tra `emergency-mode.json`
2. Xem logs trong `logs/emergency-actions.log`
3. Restart ứng dụng sau khi IP ban hết hạn
4. Sử dụng WebSocket thay vì REST API

---
**Cập nhật lần cuối:** ${new Date().toLocaleString('vi-VN')}
**Trạng thái:** 🚨 EMERGENCY MODE ACTIVE
