# Hướng dẫn Khắc phục Lỗi Trading Bot

## 🔧 Các lỗi thường gặp và cách khắc phục

### 1. Lỗi Port 9002 bị chiếm (EADDRINUSE)

**Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use :::9002
```

**Cách khắc phục:**

**Cách 1: Sử dụng script tự động (Khuyến nghị)**
```bash
npm run cleanup-port
npm run dev
```

**Cách 2: Sử dụng lệnh dev-clean**
```bash
npm run dev-clean
```

**Cách 3: Thủ công**
```bash
# Tìm process đang sử dụng port 9002
netstat -ano | findstr :9002

# Kill process (thay PID bằng số thực tế)
taskkill /PID <PID> /F

# Khởi động lại server
npm run dev
```

### 2. Lỗi TimeSync - Đồng bộ thời gian

**Triệu chứng:**
```
[TimeSync] Lỗi đồng bộ thời gian: Error: Lỗi API: 400 Bad Request
```

**Nguyên nhân:** Kết nối mạng không ổn định hoặc API Binance bị lỗi

**Cách khắc phục:**
- Bot sẽ tự động thử lại với các endpoint khác nhau
- Nếu vẫn lỗi, bot sẽ sử dụng offset mặc định an toàn
- Không cần can thiệp thủ công

### 3. Lỗi Invalid Symbol

**Triệu chứng:**
```
{"code":-1121,"msg":"Invalid symbol."}
```

**Nguyên nhân:** Symbol không hợp lệ trong Binance API

**Cách khắc phục:**
- Đã sửa lỗi `USDTBTC` thành `BTCUSDT`
- Chỉ sử dụng các symbol hợp lệ: `BTCUSDT`, `ETHUSDT`, `BNBUSDT`

### 4. Lỗi Bot không chạy được

**Triệu chứng:**
- Bot không start/stop
- Không có logs
- Modal "Chi tiết Trading Bot" bị lỗi
- Signal không được tính toán
- Log: "Unknown strategy type: rsi"

**Cách khắc phục:**

**Bước 1: Kiểm tra Strategy Type**
- Strategy type phải là chữ thường: `'rsi'`, `'ma_crossover'`, `'bollinger_bands'`
- Không sử dụng chữ hoa: `'RSI'`, `'MA_CROSSOVER'`
- Bot executor sẽ tự động convert về lowercase

**Bước 2: Sử dụng SignalDebug Component**
- Mở trang Trading
- Click vào nút "🐛 Debug" ở góc phải dưới
- Chuyển sang tab "Signals"
- Click "Start Monitoring" để theo dõi signal calculation real-time
- Xem logs chi tiết về RSI calculation và signal generation

**Bước 3: Kiểm tra API endpoints**
```bash
# Test API lấy candles
curl http://localhost:9002/api/trading/binance/candles?symbol=BTCUSDT&interval=1h&limit=100

# Test API lấy balance
curl http://localhost:9002/api/trading/binance/balance

# Test API start bot
curl -X POST http://localhost:9002/api/trading/bot/start \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","strategy":"rsi","apiKey":"your-api-key","apiSecret":"your-api-secret"}'
```

**Bước 4: Sử dụng BotTest Component**
- Mở trang Trading
- Tìm component "Bot Test"
- Test start/stop bot trực tiếp
- Xem logs real-time

**Bước 5: Kiểm tra logs**
```bash
# Xem logs của server
npm run dev

# Trong console browser, xem logs:
console.log('[BotExecutor]', 'logs here');
```

**Bước 6: Debug Signal Calculation**
- Sử dụng SignalDebug component để theo dõi:
  - RSI calculation process
  - Input data validation
  - Signal generation logic
  - Error handling
- Xem real-time RSI values và trading signals

### 5. Lỗi Kết nối Binance API

**Triệu chứng:**
```
Error: Request timeout
Error: Network error
```

**Cách khắc phục:**

**Bước 1: Kiểm tra API Key/Secret**
- Đảm bảo API Key và Secret đúng
- Kiểm tra quyền của API Key (cần quyền giao dịch)

**Bước 2: Kiểm tra Testnet**
- Nếu dùng testnet, đảm bảo đã chọn đúng
- Testnet có API Key riêng

**Bước 3: Kiểm tra mạng**
```bash
# Test kết nối Binance
curl https://api1.binance.com/api/v3/time
```

### 6. Lỗi Validation Form

**Triệu chứng:**
- Form không submit được
- Không có thông báo lỗi
- Component bị đơ

**Cách khắc phục:**

**Bước 1: Kiểm tra validation**
- Đảm bảo tất cả field bắt buộc đã điền
- Kiểm tra format dữ liệu (số, text, etc.)

**Bước 2: Sử dụng Debug Component**
- Mở Debug Panel trong Trading Panel
- Xem logs real-time
- Kiểm tra state của form

**Bước 3: Reset form**
```javascript
// Trong console browser
document.querySelector('form').reset();
```

## 🛠️ Công cụ Debug

### 1. SignalDebug Component
- **Vị trí:** Nút "🐛 Debug" ở góc phải dưới → Tab "Signals"
- **Chức năng:**
  - Monitor signal calculation real-time
  - Capture RSI calculation logs
  - Auto-extract current RSI value
  - Show trading signals (BUY/SELL)
  - Display detailed error messages
- **Cách sử dụng:**
  1. Click "Start Monitoring"
  2. Start bot hoặc thực hiện giao dịch
  3. Xem logs real-time trong component
  4. Check current RSI value và last signal

### 2. BotTest Component
- Test bot trực tiếp
- Xem logs real-time
- Start/stop bot
- Kiểm tra trạng thái

### 3. Debug Panel (General Tab)
- Xem logs real-time
- Kiểm tra state
- Monitor API calls
- Error tracking

### 4. API Endpoints Test
```bash
# Test tất cả endpoints
npm run test-api

# Hoặc test từng endpoint riêng
curl http://localhost:9002/api/trading/bot/status
curl http://localhost:9002/api/trading/binance/balance
```

## 📋 Checklist Khắc phục

Trước khi báo cáo lỗi, hãy kiểm tra:

- [ ] Port 9002 đã được giải phóng
- [ ] API Key/Secret đúng và có quyền
- [ ] Kết nối mạng ổn định
- [ ] Đã sử dụng SignalDebug component để monitor signal calculation
- [ ] Đã test với BotTest Component
- [ ] Đã xem logs trong Debug Panel
- [ ] Đã thử restart server
- [ ] Đã kiểm tra RSI calculation logs
- [ ] Đã verify input data format cho candles

## 🚀 Khởi động An toàn

**Cách khuyến nghị:**
```bash
npm run dev-clean
```

**Hoặc từng bước:**
```bash
npm run cleanup-port
npm run dev
```

## 📞 Hỗ trợ

Nếu vẫn gặp lỗi:
1. Chụp màn hình lỗi
2. Copy logs từ console
3. Mô tả các bước đã thử
4. Gửi thông tin cho team support 