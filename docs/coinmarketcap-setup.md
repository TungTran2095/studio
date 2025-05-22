# Thiết lập CoinMarketCap API cho Yinsen

## Tổng quan
Yinsen sử dụng dữ liệu thị trường từ CoinMarketCap để cung cấp thông tin thị trường chính xác trong trò chuyện. Việc tích hợp này giúp Yinsen trả lời các câu hỏi về giá, biến động thị trường, và xu hướng với dữ liệu thực tế thay vì thông tin tổng quát.

## Cách đăng ký API key CoinMarketCap

1. Truy cập [CoinMarketCap Developer Portal](https://coinmarketcap.com/api/) và nhấp vào "Get Your Free API Key Now"
2. Đăng ký tài khoản mới nếu bạn chưa có
3. Sau khi đăng nhập, truy cập [Dashboard](https://pro.coinmarketcap.com/account)
4. Sao chép API key của bạn (gói miễn phí có giới hạn 10.000 request/tháng)

## Cấu hình Yinsen với CoinMarketCap API

1. Tạo hoặc mở file `.env` trong thư mục gốc của dự án
2. Thêm biến môi trường sau:
   ```
   COINMARKETCAP_API_KEY=your_api_key_here
   ```
3. Lưu file và khởi động lại ứng dụng

## Chức năng sử dụng dữ liệu thị trường

Sau khi thiết lập, Yinsen sẽ:

1. **Tự động lấy dữ liệu thị trường** khi người dùng hỏi về giá cả, xu hướng, hoặc tình hình thị trường
2. **Hiển thị giá thực tế** của các loại tiền điện tử thay vì thông tin chung chung
3. **Cung cấp thông tin chi tiết** về biến động 24h, vốn hóa thị trường, và khối lượng giao dịch
4. **Phân tích xu hướng thị trường** với dữ liệu cập nhật

## Dữ liệu dự phòng

Nếu không thiết lập API key hoặc hết lượt request, Yinsen sẽ sử dụng dữ liệu dự phòng (mock data) với các giá trị hợp lý để đảm bảo chức năng vẫn hoạt động. Tuy nhiên, dữ liệu này sẽ không phản ánh thị trường thực tế.

## Giới hạn của CoinMarketCap API (Gói miễn phí)

- 10.000 request/tháng
- Cập nhật giá trễ 5 phút
- Giới hạn 333 request/ngày
- Chỉ có dữ liệu lịch sử 1 ngày 