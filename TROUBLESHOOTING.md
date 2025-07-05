# Hướng dẫn khắc phục vấn đề Component Giao dịch

## Vấn đề: Component "Giao dịch" bị đơ khi ấn order

### Nguyên nhân có thể:

1. **Port bị chiếm**: Port 9002 đang được sử dụng bởi process khác
2. **Lỗi validation**: Form validation không đúng
3. **Timeout**: Request đến Binance API bị timeout
4. **Lỗi kết nối**: Không thể kết nối đến Binance API
5. **Lỗi credentials**: API key/secret không đúng

### Cách khắc phục:

#### 1. Giải phóng port 9002

**Cách 1: Sử dụng script tự động**
```bash
# Chạy script cleanup
powershell -ExecutionPolicy Bypass -File "scripts\cleanup-ports.ps1" -Port 9002

# Hoặc sử dụng script start-dev.bat
start-dev.bat
```

**Cách 2: Thủ công**
```bash
# Kiểm tra process đang sử dụng port 9002
netstat -ano | findstr :9002

# Kill process (thay PID bằng PID thực tế)
taskkill /PID <PID> /F
```

#### 2. Kiểm tra API credentials

1. Vào panel "Tài khoản Binance"
2. Kiểm tra API key và secret có đúng không
3. Đảm bảo API key có quyền giao dịch
4. Kiểm tra IP có được whitelist không

#### 3. Sử dụng Debug Component

1. Mở component "Giao dịch"
2. Nhấn nút "🐛 Debug" ở góc dưới bên phải
3. Kiểm tra các log để xem lỗi cụ thể
4. Sử dụng nút "Test" để kiểm tra kết nối

#### 4. Kiểm tra Console

1. Mở Developer Tools (F12)
2. Vào tab Console
3. Tìm các log bắt đầu với `[TradingPanel]` hoặc `[placeOrder]`
4. Báo cáo lỗi cụ thể nếu có

### Các lỗi thường gặp:

#### Lỗi -1021: Timestamp error
```
Server timestamp lỗi. Đã tự động điều chỉnh, vui lòng thử lại.
```
**Giải pháp**: Hệ thống sẽ tự động điều chỉnh timestamp. Thử lại sau 1-2 phút.

#### Lỗi -2010: Insufficient funds
```
Số dư không đủ.
```
**Giả pháp**: Kiểm tra số dư trong tài khoản Binance.

#### Lỗi -2015: Invalid API key
```
API key không đúng, không có quyền truy cập, hoặc IP không được phép.
```
**Giải pháp**: 
- Kiểm tra API key và secret
- Đảm bảo IP hiện tại được whitelist
- Kiểm tra quyền của API key

#### Lỗi -1013: Filter failure
```
Lỗi filter (ví dụ: độ chính xác giá/số lượng)
```
**Giải pháp**: 
- Kiểm tra số lượng tối thiểu (0.000001 BTC)
- Kiểm tra độ chính xác của giá và số lượng

### Cải thiện đã thực hiện:

1. **Timeout protection**: Thêm timeout 30 giây để tránh bị đơ vô thời hạn
2. **Better error handling**: Xử lý lỗi chi tiết hơn với thông báo tiếng Việt
3. **Form validation**: Cải thiện validation với thông báo rõ ràng
4. **Debug component**: Thêm component debug để theo dõi lỗi
5. **Connection test**: Thêm chức năng test kết nối

### Scripts hữu ích:

- `start-dev.bat`: Khởi động server với cleanup port tự động
- `scripts/cleanup-ports.ps1`: Script cleanup port
- `TradingDebug`: Component debug trong giao diện

### Liên hệ hỗ trợ:

Nếu vấn đề vẫn tiếp tục, vui lòng:
1. Chụp màn hình lỗi
2. Copy log từ console
3. Gửi thông tin API key (che đi 4 ký tự đầu và cuối)
4. Mô tả bước thực hiện gây ra lỗi 