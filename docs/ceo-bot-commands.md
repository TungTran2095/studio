# Bot Telegram Commands cho Tổng giám đốc

## Lệnh cơ bản

### `/start`
Hiển thị menu chính và hướng dẫn sử dụng

### `/stats`
Xem thống kê công việc 7 ngày qua:
- Tổng số báo cáo
- Số nhân viên hoạt động  
- Tài liệu đã tải lên
- Chi tiết theo ngày

### `/search [từ khóa]`
Tìm kiếm tài liệu thông minh:
- Sử dụng AI vector search
- Tìm nội dung phù hợp nhất
- Hiển thị độ phù hợp %
- Ví dụ: `/search báo cáo tài chính`

## Lệnh nâng cao (cần thêm vào workflow)

### `/user [email]`
Xem công việc của nhân viên cụ thể:
- Danh sách báo cáo gần đây
- Tài liệu đã upload
- Thống kê cá nhân

### `/summary`
Tóm tắt AI công việc tuần này:
- Điểm nổi bật
- Vấn đề cần chú ý
- Khuyến nghị

### `/export [ngày]`
Xuất báo cáo Excel:
- Tất cả công việc trong ngày
- Tài liệu đính kèm
- Gửi file qua Telegram

### `/alerts`
Cảnh báo công việc:
- Nhân viên chưa báo cáo
- Deadline sắp đến
- Vấn đề cần xử lý

## Cách sử dụng

1. **Bắt đầu**: Gửi `/start` để xem menu
2. **Xem thống kê**: Gửi `/stats` để xem tổng quan
3. **Tìm kiếm**: Gửi `/search từ khóa` để tìm tài liệu
4. **Hỗ trợ**: Bot sẽ hướng dẫn chi tiết cho từng lệnh

## Ví dụ sử dụng

```
/start
→ Hiển thị menu chính

/stats  
→ 📊 THỐNG KÊ CÔNG VIỆC 7 NGÀY QUA
   📝 Tổng số báo cáo: 45
   👥 Số nhân viên hoạt động: 12
   📄 Tài liệu đã tải lên: 38

/search báo cáo tài chính
→ 🔍 KẾT QUẢ TÌM KIẾM
   1. Báo cáo tài chính Q4
   👤 Người thực hiện: nguyen.van.a@company.com
   📅 Ngày: 20/01/2024
   🎯 Độ phù hợp: 95%
```

