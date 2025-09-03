# ⏱️ Hướng dẫn tăng Statement Timeout

## 🎯 Mục tiêu

Chỉ tăng **statement timeout** từ 30s lên 300s (5 phút) để khắc phục lỗi "canceling statement due to statement timeout" mà **không thay đổi** cấu trúc database hiện tại.

## 🚀 Cách 1: Sử dụng script (Khuyến nghị)

### Bước 1: Chạy script tăng timeout
```bash
node scripts/increase-timeout.js
```

**Kết quả mong đợi:**
```
⏱️ Đang tăng statement timeout...

1️⃣ Kiểm tra timeout hiện tại...
✅ Timeout hiện tại: 30s

2️⃣ Tăng statement timeout...
✅ Statement timeout đã được tăng lên 300s (5 phút)

3️⃣ Xác nhận timeout mới...
✅ Timeout mới: 300s

🎉 Hoàn thành!
💡 Statement timeout đã được tăng lên 300s
💡 Bây giờ các query phức tạp sẽ có thêm thời gian để hoàn thành
```

## 🔧 Cách 2: Thủ công trong Supabase Dashboard

### Bước 1: Mở Supabase Dashboard
1. Truy cập [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** (biểu tượng `</>` ở sidebar)

### Bước 2: Chạy lệnh tăng timeout
Copy và paste lệnh sau vào SQL Editor:

```sql
-- Tăng statement timeout từ 30s lên 300s (5 phút)
ALTER DATABASE postgres SET statement_timeout = '300s';

-- Tăng timeout cho session hiện tại
SET statement_timeout = '300s';

-- Kiểm tra timeout mới
SHOW statement_timeout;
```

### Bước 3: Click "Run" để thực thi

## ✅ Kiểm tra kết quả

### Cách 1: Trong SQL Editor
```sql
SHOW statement_timeout;
```

**Kết quả mong đợi:**
```
statement_timeout
-----------------
300s
```

### Cách 2: Trong script
```bash
node scripts/increase-timeout.js
```

## 🎯 Lợi ích sau khi tăng timeout

1. **Query phức tạp** sẽ có thêm thời gian để hoàn thành
2. **Modal "Tạo Trading Bot mới"** sẽ không bị timeout
3. **Các operation nặng** sẽ có thể hoàn thành thành công
4. **Không còn lỗi** "canceling statement due to statement timeout"

## 🚨 Lưu ý quan trọng

### ⚠️ Cảnh báo
- **Timeout quá cao** có thể làm ứng dụng "treo" nếu có query vô hạn
- **300s (5 phút)** là mức hợp lý cho hầu hết trường hợp
- **Có thể điều chỉnh** xuống 120s (2 phút) nếu cần

### 🔄 Áp dụng
- **Database level**: `ALTER DATABASE` sẽ áp dụng cho tất cả connections mới
- **Session level**: `SET statement_timeout` chỉ áp dụng cho session hiện tại
- **Restart app** có thể cần thiết để áp dụng hoàn toàn

## 🆘 Xử lý lỗi

### Lỗi 1: "permission denied"
```bash
# Kiểm tra SUPABASE_SERVICE_ROLE_KEY trong .env.local
# Đảm bảo có quyền admin
```

### Lỗi 2: "function exec_sql does not exist"
```sql
-- Tạo function exec_sql trong Supabase SQL Editor
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Lỗi 3: Script không hoạt động
```bash
# Sử dụng cách thủ công trong Supabase Dashboard
# Copy lệnh SQL và chạy trực tiếp
```

## 📋 Checklist hoàn thành

- [ ] Chạy `increase-timeout.js` hoặc lệnh SQL thủ công
- [ ] Xác nhận timeout đã tăng lên 300s
- [ ] Test modal "Tạo Trading Bot mới"
- [ ] Kiểm tra không còn lỗi statement timeout

## 🎉 Kết quả cuối cùng

Sau khi hoàn thành, bạn sẽ có:

1. **Statement timeout tăng** từ 30s lên 300s
2. **Database giữ nguyên** cấu trúc hiện tại
3. **Modal tạo bot hoạt động** bình thường
4. **Không còn lỗi** statement timeout

---

**Lưu ý:** Cách này chỉ tăng timeout, không tối ưu hóa performance. Nếu vẫn gặp vấn đề chậm, có thể cần tối ưu hóa indexes và query patterns.











