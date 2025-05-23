# Hướng dẫn thiết lập API Keys

## Các API Keys cần thiết

### 1. CoinMarketCap API Key (Khuyến nghị)
- **Mục đích**: Lấy dữ liệu giá crypto real-time và market overview
- **Cách lấy**:
  1. Đăng ký tài khoản tại [CoinMarketCap API](https://coinmarketcap.com/api/)
  2. Tạo API key miễn phí (basic plan: 10,000 calls/month)
  3. Copy API key

### 2. Supabase Configuration (Bắt buộc)
- **Mục đích**: Database để lưu trữ dữ liệu OHLCV và chat history
- **Cách thiết lập**:
  1. Tạo project tại [Supabase](https://supabase.com/)
  2. Lấy URL và anon key từ Settings > API

### 3. Binance API (Tùy chọn)
- **Mục đích**: Thu thập dữ liệu lịch sử và trading (tính năng nâng cao)
- **Cách lấy**:
  1. Đăng ký [Binance](https://binance.com/)
  2. Tạo API key tại Account > API Management
  3. Chỉ cần quyền "Read" để lấy dữ liệu

## Cách thiết lập

### Tạo file `.env.local`
```bash
# Supabase (Bắt buộc)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# CoinMarketCap (Khuyến nghị)
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key

# Binance (Tùy chọn)
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret

# Environment
NODE_ENV=development
```

## Tính năng hoạt động mà không cần API keys

### Không có CoinMarketCap API Key
- Ứng dụng vẫn hoạt động bình thường
- Sử dụng mock data cho real-time prices
- Hiển thị cảnh báo trong console

### Không có Binance API Key
- Thu thập dữ liệu lịch sử sẽ không hoạt động
- Các tính năng trading sẽ bị giới hạn

### Không có Supabase
- Không thể lưu/load dữ liệu OHLCV
- Chat history không được lưu trữ

## Kiểm tra kết nối

Sau khi thiết lập, vào module "Thu thập dữ liệu thị trường" để kiểm tra:
1. **Tab "Nguồn dữ liệu"** - xem trạng thái kết nối
2. **Tab "Real-time"** - kiểm tra dữ liệu live
3. **Tab "Chất lượng"** - phân tích dữ liệu từ Supabase

## Lỗi thường gặp

### "Thiếu CoinMarketCap API Key"
- Thêm `COINMARKETCAP_API_KEY` vào file `.env.local`
- Khởi động lại server với `npm run dev`

### "Supabase client not initialized"
- Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Đảm bảo URL đúng format: `https://xxx.supabase.co`

### "createSafeBinanceClient is not exported"
- Lỗi này đã được sửa trong code
- Khởi động lại server nếu vẫn gặp 