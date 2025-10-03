# 🔧 Environment Variables Setup Guide

## 📋 **1. Tạo file `.env.local` (cho development)**

Tạo file `.env.local` trong thư mục gốc của project và thêm các biến sau:

```env
# Binance API Rate Limits (Conservative Settings)
BINANCE_USED_WEIGHT_PER_MIN=1000
BINANCE_ORDERS_PER_10S=40
BINANCE_ORDERS_PER_1M=1500

# Cache Settings
CACHE_DEFAULT_TTL=30000
CACHE_MAX_SIZE=1000

# WebSocket Settings
WEBSOCKET_RECONNECT_ATTEMPTS=5
WEBSOCKET_RECONNECT_INTERVAL=5000

# Next.js Public Environment Variables (for client-side)
NEXT_PUBLIC_BINANCE_WEIGHT_1M=1000
NEXT_PUBLIC_BINANCE_WEIGHT_1D=100000
NEXT_PUBLIC_BINANCE_ORDERS_10S=40
NEXT_PUBLIC_BINANCE_ORDERS_1M=1500
NEXT_PUBLIC_BINANCE_ORDERS_1D=200000
NEXT_PUBLIC_BINANCE_RAW_1M=6000
```

## 🌐 **2. Thêm vào Render.com (cho production)**

### Cách 1: Qua Render Dashboard
1. Vào Render Dashboard → Chọn service của bạn
2. Vào tab **Environment**
3. Thêm từng biến một:

| Key | Value |
|-----|-------|
| `BINANCE_USED_WEIGHT_PER_MIN` | `1000` |
| `BINANCE_ORDERS_PER_10S` | `40` |
| `BINANCE_ORDERS_PER_1M` | `1500` |
| `CACHE_DEFAULT_TTL` | `30000` |
| `CACHE_MAX_SIZE` | `1000` |
| `WEBSOCKET_RECONNECT_ATTEMPTS` | `5` |
| `WEBSOCKET_RECONNECT_INTERVAL` | `5000` |
| `NEXT_PUBLIC_BINANCE_WEIGHT_1M` | `1000` |
| `NEXT_PUBLIC_BINANCE_WEIGHT_1D` | `100000` |
| `NEXT_PUBLIC_BINANCE_ORDERS_10S` | `40` |
| `NEXT_PUBLIC_BINANCE_ORDERS_1M` | `1500` |
| `NEXT_PUBLIC_BINANCE_ORDERS_1D` | `200000` |
| `NEXT_PUBLIC_BINANCE_RAW_1M` | `6000` |

### Cách 2: Qua Render CLI
```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Set environment variables
render env set BINANCE_USED_WEIGHT_PER_MIN=1000
render env set BINANCE_ORDERS_PER_10S=40
render env set BINANCE_ORDERS_PER_1M=1500
render env set CACHE_DEFAULT_TTL=30000
render env set CACHE_MAX_SIZE=1000
render env set WEBSOCKET_RECONNECT_ATTEMPTS=5
render env set WEBSOCKET_RECONNECT_INTERVAL=5000
render env set NEXT_PUBLIC_BINANCE_WEIGHT_1M=1000
render env set NEXT_PUBLIC_BINANCE_WEIGHT_1D=100000
render env set NEXT_PUBLIC_BINANCE_ORDERS_10S=40
render env set NEXT_PUBLIC_BINANCE_ORDERS_1M=1500
render env set NEXT_PUBLIC_BINANCE_ORDERS_1D=200000
render env set NEXT_PUBLIC_BINANCE_RAW_1M=6000
```

## 🚀 **3. Deploy và Test**

Sau khi thêm environment variables:

1. **Restart service trên Render**
2. **Test local development:**
   ```bash
   npm run dev
   ```

3. **Kiểm tra logs để đảm bảo không có lỗi:**
   ```bash
   # Trong browser console
   console.log('Environment loaded:', process.env.NEXT_PUBLIC_BINANCE_WEIGHT_1M);
   ```

## 🔍 **4. Verify Setup**

### Kiểm tra trong code:
```typescript
// Trong component hoặc API route
console.log('Rate limit config:', {
  weightPerMin: process.env.BINANCE_USED_WEIGHT_PER_MIN,
  ordersPer10s: process.env.BINANCE_ORDERS_PER_10S,
  ordersPer1m: process.env.BINANCE_ORDERS_PER_1M
});
```

### Kiểm tra WebSocket connection:
```typescript
import { binanceWebSocketManager } from '@/lib/websocket/binance-websocket';

console.log('WebSocket connected:', binanceWebSocketManager.isWebSocketConnected());
```

## ⚠️ **5. Troubleshooting**

### Nếu environment variables không load:
1. **Restart development server**
2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Nếu Render không nhận environment variables:
1. **Check spelling** của key names
2. **Restart service** trên Render
3. **Check logs** trong Render dashboard

### Nếu vẫn bị rate limit:
1. **Giảm limits** xuống:
   ```env
   BINANCE_USED_WEIGHT_PER_MIN=800
   BINANCE_ORDERS_PER_10S=30
   ```

2. **Tăng intervals** trong code:
   ```typescript
   refreshInterval: 60000 // 60 seconds instead of 30
   ```

## 📊 **6. Monitoring**

Sau khi setup, monitor performance qua:
- **OptimizationStatus component** trong UI
- **Render logs** để check API calls
- **Browser console** để check WebSocket status

---

**💡 Lưu ý**: Sau khi thêm environment variables, hệ thống sẽ tự động sử dụng các settings tối ưu và giảm đáng kể khả năng bị ban IP từ Binance API.
