# 🚀 Render.com Environment Variables Setup

## Vấn đề hiện tại
Bot đang gặp lỗi `ECONNREFUSED` khi cố gắng gọi API endpoint `/api/trading/binance/price` vì `API_BASE_URL` không đúng.

## Environment Variables cần thiết

### 1. Cập nhật trong Render.com Dashboard

Vào **Settings > Environment** và thêm các biến sau:

```bash
# App URL (Bắt buộc để fix lỗi ECONNREFUSED)
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Next.js Configuration
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production

# API Base URL (Fallback)
API_BASE_URL=https://your-app-name.onrender.com
```

### 2. Cách Bot Executor hoạt động

```typescript
// src/lib/trading/bot-executor.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 
                     process.env.API_BASE_URL || 
                     'http://localhost:9002';

// Bot sẽ gọi: ${API_BASE_URL}/api/trading/binance/price
// Thay vì: http://localhost:9002/api/trading/binance/price
```

### 3. Kiểm tra cấu hình

Sau khi cập nhật environment variables:

1. **Redeploy** ứng dụng trên Render.com
2. **Kiểm tra logs** để đảm bảo không còn lỗi ECONNREFUSED
3. **Test bot** để xác nhận API calls hoạt động

### 4. Troubleshooting

Nếu vẫn gặp lỗi:

```bash
# Kiểm tra environment variables trong logs
console.log('API_BASE_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('Fallback API_BASE_URL:', process.env.API_BASE_URL);

# Kiểm tra API endpoint có tồn tại
curl https://your-app-name.onrender.com/api/trading/binance/price
```

### 5. Cấu hình thay thế

Nếu muốn sử dụng domain tùy chỉnh:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com
```

## Lưu ý quan trọng

- **NEXT_PUBLIC_APP_URL** phải bắt đầu bằng `https://`
- **Không sử dụng localhost** trên production
- **Redeploy** sau khi thay đổi environment variables
- **Kiểm tra logs** để xác nhận cấu hình đúng
