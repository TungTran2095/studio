# Cập Nhật Logic Giao Dịch Backtest

## Thay Đổi Chính

Đã cập nhật logic giao dịch trong hệ thống backtest từ **"mua khi có signal và bán ngay sau timeframe kế tiếp"** thành **"mua khi có signal mua và bán khi có signal bán"**.

## Chi Tiết Thay Đổi

### Logic Cũ
- Khi có signal mua → Mở vị thế mua
- Sau timeframe kế tiếp → Tự động đóng vị thế (bán)

### Logic Mới
- Khi có signal mua → Mở vị thế mua
- Khi có signal bán → Đóng vị thế mua

## Files Đã Cập Nhật

### 1. `scripts/backtest_strategies/base_strategy.py` (CHÍNH)
- **Ưu tiên signal trước stop loss/take profit**: Kiểm tra signal exit trước khi kiểm tra stop loss/take profit
- **Logic mới**: 
  - `signal == 1` → Mở vị thế mua
  - `signal == -1` → Đóng vị thế mua
  - Stop loss và take profit vẫn hoạt động bình thường

### 2. `scripts/backtest_strategies/ma_crossover_strategy.py`
- **Sửa logic tạo signal**: Chỉ tạo signal khi có crossover thực sự
- **Trước**: Signal liên tục (1 hoặc -1) khi MA thay đổi
- **Sau**: Signal chỉ khi fast MA cắt lên/xuống slow MA

### 3. `scripts/backtest_strategies/rsi_strategy.py`
- **Sửa logic tạo signal**: Chỉ tạo signal khi có sự thay đổi trạng thái
- **Trước**: Signal liên tục khi RSI < oversold hoặc > overbought
- **Sau**: Signal chỉ khi RSI vượt qua ngưỡng oversold/overbought

### 4. `scripts/backtest_strategies/macd_strategy.py`
- **Đã đúng**: Logic tạo signal khi có crossover đã chính xác
- Không cần thay đổi gì

### 5. `test_backtest_logic.py` (MỚI)
- File test để kiểm tra logic mới
- Tạo dữ liệu mẫu và test tất cả strategies
- Hiển thị kết quả chi tiết

## Lợi Ích Của Thay Đổi

1. **Logic Giao Dịch Thực Tế Hơn**: Phản ánh đúng cách giao dịch thực tế
2. **Kiểm Soát Tốt Hơn**: Trader có thể kiểm soát thời điểm vào và ra lệnh
3. **Tối Ưu Hóa Lợi Nhuận**: Có thể giữ vị thế lâu hơn để tối đa hóa lợi nhuận
4. **Giảm Thiểu Giao Dịch Không Cần Thiết**: Không tự động đóng vị thế sau timeframe

## Cách Sử Dụng

Logic mới sẽ tự động được áp dụng cho tất cả các backtest mới. Không cần thay đổi cấu hình gì thêm.

## Lưu Ý

- Các backtest cũ vẫn giữ nguyên kết quả
- Logic mới chỉ áp dụng cho các backtest mới được tạo
- Có thể cần điều chỉnh các chiến lược để tối ưu hóa với logic mới 