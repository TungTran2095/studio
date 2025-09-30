# Hướng Dẫn Setup Signals cho Trading Bots

## 1. Thêm Cột Signals vào Database

Bạn cần thêm cột `signals` vào bảng `trading_bots` trong Supabase:

### Cách 1: Qua Supabase Dashboard
1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Chạy lệnh sau:

```sql
-- Thêm cột signals vào bảng trading_bots
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '[]'::jsonb;

-- Tạo index cho cột signals để tối ưu query
CREATE INDEX IF NOT EXISTS idx_trading_bots_signals ON trading_bots USING GIN (signals);

-- Comment cho cột signals
COMMENT ON COLUMN trading_bots.signals IS 'Lưu trữ lịch sử signals của bot dưới dạng JSONB array';
```

### Cách 2: Qua Supabase CLI
```bash
supabase db reset
# hoặc
supabase migration up
```

## 2. Cấu Trúc Dữ Liệu Signals

Cột `signals` sẽ lưu trữ array các signal objects với cấu trúc:

```json
[
  {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "signal": "buy",
    "price": 50000.00,
    "strategy": "ichimoku",
    "parameters": {
      "tenkanPeriod": 9,
      "kijunPeriod": 26,
      "senkouSpanBPeriod": 52
    },
    "action": "BUY",
    "details": {
      "tenkanSen": 50100.00,
      "kijunSen": 49900.00,
      "senkouSpanA": 50000.00,
      "senkouSpanB": 49800.00,
      "chikouSpan": 50200.00,
      "currentPrice": 50000.00,
      "cloudTop": 50000.00,
      "cloudBottom": 49800.00,
      "priceAboveCloud": true,
      "priceBelowCloud": false,
      "tenkanAboveKijun": true,
      "tenkanBelowKijun": false
    }
  }
]
```

## 3. Tính Năng Đã Implement

### Bot Executor
- ✅ Tự động lưu signals khi có tín hiệu mua/bán
- ✅ Lưu chi tiết strategy-specific (Ichimoku, MA Crossover, RSI, Bollinger Bands)
- ✅ Giới hạn 100 signals gần nhất để tránh database quá lớn
- ✅ Timestamp và giá tại thời điểm signal

### Modal Chi tiết Trading Bot
- ✅ Tab "Signal History" mới
- ✅ Bảng hiển thị lịch sử signals
- ✅ Nút "Làm mới" để reload signals
- ✅ Modal chi tiết signal với thông tin đầy đủ

### API Endpoint
- ✅ `/api/trading/bot/signals?botId={botId}` để lấy signals
- ✅ Trả về JSON với signals array và count

### Signal Detail Modal
- ✅ Hiển thị chi tiết theo từng strategy type
- ✅ UI đẹp với badges và formatting
- ✅ Responsive design

## 4. Cách Sử Dụng

1. **Thêm cột signals** vào database (theo hướng dẫn trên)
2. **Restart bot** để áp dụng code mới
3. **Mở modal Chi tiết Trading Bot** và chuyển sang tab "Signal History"
4. **Click "Xem"** để xem chi tiết signal

## 5. Test

Sau khi thêm cột signals, chạy:

```bash
node test-signals.js
```

Để kiểm tra xem signals có được lưu vào database không.

## 6. Lưu Ý

- Signals chỉ được lưu khi bot thực sự tạo ra tín hiệu mua/bán
- Mỗi bot chỉ lưu tối đa 100 signals gần nhất
- Signals được sắp xếp theo thời gian (mới nhất trước)
- Chi tiết signals khác nhau tùy theo strategy type
