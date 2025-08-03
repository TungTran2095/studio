# Monte Carlo Simulation System - Hệ thống Giả lập Monte Carlo

## Tổng quan

Hệ thống Monte Carlo mới được thiết kế để phân tích rủi ro và dự đoán hiệu suất của các chiến lược giao dịch dựa trên dữ liệu backtest thực tế. Hệ thống bao gồm hai component chính:

1. **MonteCarloProfitSimulation** - Phân tích phân phối lợi nhuận
2. **MonteCarloEquityCurve** - Phân tích đường cong vốn

## Các tính năng chính

### 1. MonteCarloProfitSimulation

#### Tham số đầu vào:
- **totalTrades**: Số lượng giao dịch từ backtest
- **winRate**: Tỷ lệ thắng (%) 
- **avgWinNet**: Tỷ lệ lãi net trung bình (%)
- **avgLossNet**: Tỷ lệ lỗ net trung bình (%)
- **initialCapital**: Vốn ban đầu (mặc định: $10,000)
- **simulations**: Số lượng simulation (mặc định: 1,000)

#### Tính năng:
- **Phân phối lợi nhuận**: Histogram cho tổng lợi nhuận (%), tổng lợi nhuận ($), max drawdown (%)
- **Thống kê chi tiết**: Trung bình, trung vị, độ lệch chuẩn, các phân vị (P1, P5, P10, P25, P50, P75, P90, P95, P99)
- **Phân tích rủi ro**: Xác suất lãi/lỗ, kịch bản tốt nhất/xấu nhất
- **So sánh với backtest**: Đường thẳng đỏ so sánh kết quả thực tế
- **Export dữ liệu**: Xuất kết quả ra file CSV

### 2. MonteCarloEquityCurve

#### Tính năng:
- **Đường cong vốn**: Hiển thị các đường percentile (P10, P25, P50, P75, P90)
- **Hiển thị tất cả paths**: Tùy chọn hiển thị tất cả 50 simulation paths đầu tiên
- **So sánh với backtest**: Đường đứt nét đỏ cho kết quả backtest thực tế
- **Tùy chọn percentile**: Bật/tắt các đường percentile khác nhau
- **Export dữ liệu**: Xuất equity curve ra file CSV

## Cách hoạt động

### Thuật toán Monte Carlo:

1. **Khởi tạo**: Vốn ban đầu = $10,000
2. **Mô phỏng từng trade**:
   - Xác định win/loss dựa trên win rate
   - Tính lãi/lỗ dựa trên avg win/loss net + randomness (±5%)
   - Cập nhật vốn và tính max drawdown
3. **Lặp lại 1,000 lần** để có phân phối kết quả

### Cải tiến so với phiên bản cũ:

1. **Dữ liệu thực tế**: Sử dụng các tham số từ backtest thực tế
2. **Randomness thực tế**: Thêm độ biến động ±5% cho mô phỏng chân thực hơn
3. **Phân tích đa chiều**: Tổng lợi nhuận (%), tổng lợi nhuận ($), max drawdown
4. **Visualization tốt hơn**: Histogram với màu sắc phân biệt, tooltip chi tiết
5. **Equity curve analysis**: Phân tích đường cong vốn theo thời gian
6. **Export functionality**: Xuất dữ liệu để phân tích sâu hơn

## Cách sử dụng

### Trong giao diện:

1. **Chạy backtest** và xem kết quả
2. **Monte Carlo simulation** sẽ tự động chạy với 1,000 simulations
3. **Chọn metric** để xem: Tổng lợi nhuận (%), Tổng lợi nhuận ($), Max Drawdown (%)
4. **Xem equity curve** để phân tích đường cong vốn
5. **Export dữ liệu** để phân tích sâu hơn

### Tham số quan trọng:

- **Win Rate**: Tỷ lệ giao dịch thắng từ backtest
- **Avg Win Net**: Tỷ lệ lãi net trung bình (%)
- **Avg Loss Net**: Tỷ lệ lỗ net trung bình (%)
- **Total Trades**: Số lượng giao dịch đã thực hiện

## Ý nghĩa của các chỉ số

### Phân vị (Percentiles):
- **P1**: Kịch bản xấu nhất 1%
- **P5**: Kịch bản xấu nhất 5%
- **P25**: Kịch bản xấu nhất 25%
- **P50**: Kịch bản trung bình (median)
- **P75**: Kịch bản tốt nhất 25%
- **P90**: Kịch bản tốt nhất 10%
- **P95**: Kịch bản tốt nhất 5%
- **P99**: Kịch bản tốt nhất 1%

### Phân tích rủi ro:
- **Xác suất lãi**: % simulations có lợi nhuận > 0
- **Xác suất lỗ**: % simulations có lợi nhuận < 0
- **Kịch bản tốt nhất**: Lợi nhuận cao nhất trong 1,000 simulations
- **Kịch bản xấu nhất**: Lợi nhuận thấp nhất trong 1,000 simulations

## Lưu ý quan trọng

1. **Dữ liệu đầu vào**: Cần có đầy đủ thông tin từ backtest (total_trades, win_rate, avg_win_net, avg_loss_net)
2. **Độ chính xác**: Kết quả phụ thuộc vào chất lượng dữ liệu backtest
3. **Giả định**: Mô phỏng giả định các trade độc lập và phân phối đều
4. **Rủi ro**: Monte Carlo chỉ là công cụ phân tích, không đảm bảo kết quả thực tế

## Cải tiến tương lai

1. **Correlation analysis**: Phân tích tương quan giữa các trade
2. **Market regime**: Phân tích theo điều kiện thị trường khác nhau
3. **Position sizing**: Mô phỏng với position sizing động
4. **Risk management**: Tích hợp stop-loss, take-profit vào mô phỏng
5. **Multi-asset**: Mô phỏng portfolio đa tài sản 