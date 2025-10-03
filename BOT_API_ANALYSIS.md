# 📊 PHÂN TÍCH API CALLS CỦA TRADING BOTS

## 🔍 Các API endpoints hiện tại bots đang sử dụng:

### 1. **Market Data APIs** (Có thể thay thế bằng WebSocket)
- **`/api/v3/klines`** - Lấy dữ liệu candles (weight: 1)
  - **Sử dụng:** BotExecutor fetch candles mỗi lần chạy strategy
  - **Tần suất:** Mỗi 1-5 phút tùy timeframe
  - **WebSocket thay thế:** `kline` stream

- **`/api/v3/ticker/price`** - Lấy giá hiện tại (weight: 1)
  - **Sử dụng:** Price monitoring, balance calculation
  - **Tần suất:** Mỗi 30s-60s
  - **WebSocket thay thế:** `ticker` stream

- **`/api/v3/ticker/24hr`** - Thống kê 24h (weight: 1)
  - **Sử dụng:** Analysis, indicators
  - **Tần suất:** Mỗi 5-15 phút
  - **WebSocket thay thế:** `ticker` stream

- **`/api/v3/depth`** - Order book (weight: 1-10)
  - **Sử dụng:** Market analysis
  - **Tần suất:** Mỗi 10-30s
  - **WebSocket thay thế:** `depth` stream

### 2. **Account Data APIs** (Không thể thay thế bằng WebSocket)
- **`/api/v3/account`** - Thông tin tài khoản (weight: 10)
  - **Sử dụng:** Kiểm tra balance, positions
  - **Tần suất:** Mỗi 30s-60s
  - **WebSocket:** ❌ Không có stream tương đương

- **`/api/v3/myTrades`** - Lịch sử giao dịch (weight: 10)
  - **Sử dụng:** Trade history, P&L calculation
  - **Tần suất:** Mỗi 1-5 phút
  - **WebSocket:** ❌ Không có stream tương đương

### 3. **Order Management APIs** (Không thể thay thế bằng WebSocket)
- **`/api/v3/order`** - Tạo/hủy orders (weight: 1)
  - **Sử dụng:** Execute trades
  - **Tần suất:** Khi có signal
  - **WebSocket:** ❌ Phải dùng REST API

- **`/api/v3/openOrders`** - Orders đang mở (weight: 3)
  - **Sử dụng:** Monitor active orders
  - **Tần suất:** Mỗi 10-30s
  - **WebSocket:** ❌ Không có stream tương đương

## 🎯 ĐỀ XUẤT THAY THẾ BẰNG WEBSOCKET

### ✅ Có thể thay thế 100%:
1. **Price Updates** → `ticker` stream
2. **Candles Data** → `kline` stream  
3. **Order Book** → `depth` stream
4. **Trade Stream** → `trade` stream

### ⚠️ Có thể thay thế một phần:
1. **Market Analysis** → Kết hợp multiple streams
2. **Real-time Indicators** → Tính toán từ streams

### ❌ Không thể thay thế:
1. **Account Info** → Phải dùng REST API
2. **Order Execution** → Phải dùng REST API
3. **Trade History** → Phải dùng REST API
4. **Balance Updates** → Phải dùng REST API

## 📈 ƯỚC TÍNH GIẢM API CALLS:

### Trước khi tối ưu:
- **Market Data:** ~200-500 calls/phút
- **Account Data:** ~20-50 calls/phút  
- **Order Data:** ~10-30 calls/phút
- **Tổng:** ~230-580 calls/phút

### Sau khi tối ưu WebSocket:
- **Market Data:** ~0 calls/phút (dùng WebSocket)
- **Account Data:** ~5-10 calls/phút (giảm tần suất)
- **Order Data:** ~5-15 calls/phút (chỉ khi cần)
- **Tổng:** ~10-25 calls/phút

### **Giảm 95%+ API calls!** 🚀

## 🔧 IMPLEMENTATION PLAN:

### Phase 1: Market Data WebSocket
```typescript
// Thay thế REST API calls bằng WebSocket streams
const streams = [
  `${symbol.toLowerCase()}@ticker`,    // Price updates
  `${symbol.toLowerCase()}@kline_1m`,   // Candles
  `${symbol.toLowerCase()}@depth`,      // Order book
  `${symbol.toLowerCase()}@trade`       // Trade stream
];
```

### Phase 2: Smart Caching
```typescript
// Cache account data lâu hơn
const accountCache = {
  ttl: 300000, // 5 phút thay vì 30s
  maxSize: 1000
};
```

### Phase 3: Batch Operations
```typescript
// Batch multiple API calls
const batchRequests = [
  '/api/v3/account',
  '/api/v3/openOrders',
  '/api/v3/myTrades'
];
```

## ⚡ IMMEDIATE ACTIONS:

1. **Tạo WebSocket Manager cho bots**
2. **Implement price stream cho real-time updates**
3. **Cache account data với TTL dài hơn**
4. **Batch API calls khi có thể**
5. **Monitor rate limits real-time**

---
**Kết luận:** Có thể giảm 95%+ API calls bằng cách sử dụng WebSocket cho market data và tối ưu caching cho account data.
