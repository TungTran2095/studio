# Cải thiện hiển thị Signal trong Danh sách giao dịch

## Tổng quan
Đã cải thiện cột "Signal mua" và "Signal bán" trong bảng "Danh sách giao dịch" của modal "Chi tiết thí nghiệm" để hiển thị chi tiết các chỉ số kỹ thuật tại thời điểm tạo signal.

## So sánh trước và sau

### Trước khi cải thiện:
```
Signal mua: "Tenkan cắt lên Kijun"
Signal bán: "Tenkan cắt xuống Kijun"
```

### Sau khi cải thiện:
```
Signal mua: "Tenkan(45.23) > Kijun(44.87), Giá(45.15) > Cloud(44.20), Chikou(45.30) > Giá"
Signal bán: "Tenkan(46.12) < Kijun(46.45), Giá(46.08) < Cloud(46.80), Chikou(45.95) < Giá"
```

## Chi tiết cải thiện cho từng Strategy

### 1. Ichimoku Cloud
**Trước:**
- Signal mua: "Tenkan cắt lên Kijun"
- Signal bán: "Tenkan cắt xuống Kijun"

**Sau:**
- Signal mua: "Tenkan(45.23) > Kijun(44.87), Giá(45.15) > Cloud(44.20), Chikou(45.30) > Giá"
- Signal bán: "Tenkan(46.12) < Kijun(46.45), Giá(46.08) < Cloud(46.80), Chikou(45.95) < Giá"

**Thông tin hiển thị:**
- Giá trị Tenkan Sen và Kijun Sen
- Vị trí giá so với Cloud (Senkou Span A/B)
- Vị trí Chikou Span so với giá hiện tại

### 2. RSI
**Trước:**
- Signal mua: "RSI < 30 (Quá bán)"
- Signal bán: "RSI > 70 (Quá mua)"

**Sau:**
- Signal mua: "RSI: 28.45 (Quá bán < 30)"
- Signal bán: "RSI: 72.15 (Quá mua > 70)"

**Thông tin hiển thị:**
- Giá trị RSI chính xác tại thời điểm signal
- So sánh với ngưỡng quá mua/quá bán

### 3. MACD
**Trước:**
- Signal mua: "MACD cắt lên Signal"
- Signal bán: "MACD cắt xuống Signal"

**Sau:**
- Signal mua: "MACD(0.0025) > Signal(0.0018), Hist(0.0007)"
- Signal bán: "MACD(0.0015) < Signal(0.0022), Hist(-0.0007)"

**Thông tin hiển thị:**
- Giá trị MACD Line
- Giá trị Signal Line
- Giá trị Histogram (nếu có)

### 4. Bollinger Bands
**Trước:**
- Signal mua: "Giá chạm dải dưới BB"
- Signal bán: "Giá chạm dải trên BB"

**Sau:**
- Signal mua: "Giá(44.85) < BB Lower(44.90), BB Mid(45.50)"
- Signal bán: "Giá(46.25) > BB Upper(46.15), BB Mid(45.50)"

**Thông tin hiển thị:**
- Giá hiện tại
- Giá trị Bollinger Band (Upper/Lower/Middle)
- Vị trí giá so với các dải

### 5. Moving Average Crossover
**Trước:**
- Signal mua: "MA10 cắt lên MA20"
- Signal bán: "MA10 cắt xuống MA20"

**Sau:**
- Signal mua: "MA10(45.30) > MA20(44.95)"
- Signal bán: "MA10(46.10) < MA20(46.25)"

**Thông tin hiển thị:**
- Giá trị MA nhanh và MA chậm
- Chu kỳ của từng MA

### 6. Stochastic
**Trước:**
- Signal mua: "Stoch < 20 (Quá bán)"
- Signal bán: "Stoch > 80 (Quá mua)"

**Sau:**
- Signal mua: "Stoch K(18.5) > D(15.2) & K < 20"
- Signal bán: "Stoch K(82.1) < D(78.9) & K > 80"

**Thông tin hiển thị:**
- Giá trị %K và %D
- Điều kiện cắt nhau và ngưỡng quá mua/quá bán

### 7. ADX (Average Directional Index)
**Trước:**
- Signal mua: "ADX > 25 (Xu hướng mạnh)"
- Signal bán: "ADX < 25 (Xu hướng yếu)"

**Sau:**
- Signal mua: "ADX: 28.5 > 25, +DI(35.2) > -DI(22.8)"
- Signal bán: "ADX: 18.3 < 25, +DI(20.1) < -DI(32.5)"

**Thông tin hiển thị:**
- Giá trị ADX
- Giá trị +DI và -DI
- So sánh với ngưỡng

### 8. Các chỉ số khác
- **Williams %R**: Hiển thị giá trị cụ thể và so sánh với ngưỡng
- **CCI**: Commodity Channel Index với giá trị và ngưỡng
- **MFI**: Money Flow Index với giá trị và ngưỡng
- **Parabolic SAR**: Giá và giá trị SAR
- **Keltner Channel**: Giá và các dải Upper/Middle/Lower
- **VWAP**: Giá so với VWAP

## Lợi ích

### 1. Tính minh bạch
- Người dùng có thể thấy chính xác giá trị các chỉ số tại thời điểm tạo signal
- Hiểu rõ lý do tại sao signal được tạo ra

### 2. Khả năng phân tích
- Có thể phân tích hiệu quả của từng chỉ số
- So sánh các signal với nhau
- Điều chỉnh tham số strategy dựa trên dữ liệu thực tế

### 3. Debugging
- Dễ dàng tìm ra lỗi trong logic strategy
- Xác minh tính chính xác của các chỉ số

### 4. Học hỏi
- Người mới có thể hiểu cách các chỉ số hoạt động
- Thấy được mối quan hệ giữa các chỉ số

## Cách sử dụng

1. Mở modal "Chi tiết thí nghiệm"
2. Cuộn xuống phần "Danh sách giao dịch"
3. Xem cột "Signal mua" và "Signal bán"
4. Phân tích các giá trị chỉ số chi tiết

## Lưu ý kỹ thuật

- Các giá trị chỉ số được lưu trữ trong database với prefix `entry_` và `exit_`
- Fallback về giá trị chung nếu không có giá trị cụ thể
- Hiển thị với độ chính xác phù hợp (2-4 chữ số thập phân)
- Tự động xử lý các trường hợp thiếu dữ liệu

