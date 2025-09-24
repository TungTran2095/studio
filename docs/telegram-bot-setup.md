# Hướng dẫn thiết lập Bot Telegram cho Tổng giám đốc

## 1. Tạo Bot Telegram

1. Mở Telegram và tìm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên bot: `WorkLog CEO Assistant`
4. Đặt username: `worklog_ceo_bot` (hoặc tên khác)
5. Lưu lại **Bot Token** (dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 2. Cấu hình n8n

### 2.1. Tạo Credentials

Trong n8n, tạo các credentials sau:

#### Supabase API
- **Name**: `Supabase API`
- **URL**: URL Supabase của bạn
- **Service Role Key**: Service role key từ Supabase

#### OpenAI API
- **Name**: `OpenAI API`
- **API Key**: API key từ OpenAI

#### Telegram Bot API
- **Name**: `Telegram Bot API`
- **Access Token**: Bot token từ BotFather

### 2.2. Import Workflow

1. Mở n8n
2. Vào **Workflows** → **Import from File**
3. Chọn file `n8n-telegram-bot-workflow.json`
4. Cấu hình lại credentials cho các node

## 3. Cấu hình Database

### 3.1. Thêm cột `processed_for_rag` vào bảng `worklogs`

```sql
ALTER TABLE public.worklogs 
ADD COLUMN processed_for_rag BOOLEAN DEFAULT NULL;
```

### 3.2. Tạo index cho tìm kiếm nhanh

```sql
CREATE INDEX IF NOT EXISTS idx_worklogs_file_url 
ON public.worklogs (file_url) 
WHERE file_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_worklogs_processed 
ON public.worklogs (processed_for_rag) 
WHERE processed_for_rag IS NULL;
```

## 4. Các lệnh Bot hỗ trợ

### `/start`
- Hiển thị menu chính và hướng dẫn sử dụng

### `/stats`
- Xem thống kê công việc 7 ngày qua
- Số báo cáo, số nhân viên hoạt động, tài liệu đã tải lên

### `/search [từ khóa]`
- Tìm kiếm tài liệu theo từ khóa
- Sử dụng AI để tìm nội dung phù hợp nhất
- Ví dụ: `/search báo cáo tài chính`

### `/user [tên nhân viên]`
- Xem công việc của nhân viên cụ thể
- (Cần thêm vào workflow)

### `/summary`
- Tóm tắt công việc tuần này
- (Cần thêm vào workflow)

## 5. Cách hoạt động

### 5.1. Xử lý tài liệu tự động
1. **Cron Trigger**: Chạy mỗi 5 phút
2. **Lấy worklogs chưa xử lý**: Tìm các báo cáo có `file_url` nhưng chưa có `processed_for_rag`
3. **Tải file**: Download file từ URL
4. **Trích xuất text**: PDF/DOCX → text
5. **Chunk text**: Chia nhỏ thành các đoạn 1000 ký tự
6. **Tạo embedding**: Sử dụng OpenAI text-embedding-3-small
7. **Lưu vào vector DB**: Lưu vào bảng `documents`
8. **Đánh dấu đã xử lý**: Cập nhật `processed_for_rag = true`

### 5.2. Tìm kiếm thông minh
1. **Nhận lệnh tìm kiếm** từ Telegram
2. **Embed query**: Chuyển câu hỏi thành vector
3. **Tìm kiếm vector**: Tìm 5 tài liệu phù hợp nhất
4. **Trả về kết quả**: Format và gửi qua Telegram

## 6. Tối ưu hóa

### 6.1. Xử lý file lớn
- Thêm node kiểm tra kích thước file
- Chia nhỏ file lớn thành nhiều phần
- Sử dụng queue để xử lý tuần tự

### 6.2. Bảo mật
- Chỉ Tổng giám đốc mới có thể sử dụng bot
- Thêm whitelist chat ID
- Mã hóa thông tin nhạy cảm

### 6.3. Hiệu suất
- Cache kết quả tìm kiếm
- Sử dụng Redis cho session
- Tối ưu query database

## 7. Troubleshooting

### 7.1. Bot không phản hồi
- Kiểm tra Bot Token
- Kiểm tra webhook URL (nếu dùng webhook)
- Xem logs trong n8n

### 7.2. Không tìm thấy tài liệu
- Kiểm tra bảng `documents` có dữ liệu không
- Kiểm tra embedding có được tạo đúng không
- Kiểm tra query vector search

### 7.3. Lỗi xử lý file
- Kiểm tra file URL có accessible không
- Kiểm tra mime type
- Thêm error handling cho các loại file không hỗ trợ

## 8. Mở rộng tính năng

### 8.1. Thêm lệnh mới
- `/user [email]` - Xem công việc của nhân viên
- `/summary` - Tóm tắt AI
- `/export` - Xuất báo cáo Excel
- `/alerts` - Cảnh báo công việc chậm

### 8.2. Tích hợp AI
- Sử dụng GPT-4 để tóm tắt
- Phân tích sentiment
- Dự đoán xu hướng công việc

### 8.3. Dashboard web
- Tạo giao diện web cho Tổng giám đốc
- Biểu đồ thống kê realtime
- Quản lý nhân viên

## 9. Monitoring

### 9.1. Logs quan trọng
- Số lượng file được xử lý
- Thời gian xử lý trung bình
- Lỗi xử lý file
- Số lượng tìm kiếm

### 9.2. Metrics
- Uptime bot
- Response time
- User engagement
- File processing success rate

