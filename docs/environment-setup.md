# Environment Variables Setup

## 🚨 **Vấn đề: Thiếu file .env**

Lỗi "Error fetching work logs: {}" xảy ra vì **thiếu file .env** chứa thông tin kết nối database.

## 📋 **Cách tạo file .env**

### **Bước 1: Tạo file .env**
Tạo file `.env` trong thư mục gốc của project với nội dung:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### **Bước 2: Lấy thông tin từ Supabase**

1. **Đăng nhập Supabase Dashboard**
2. **Chọn project** của bạn
3. **Vào Settings > API**
4. **Copy các giá trị:**
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

### **Bước 3: Lấy OpenAI API Key**

1. **Đăng nhập OpenAI Platform**
2. **Vào API Keys**
3. **Tạo API key mới**
4. **Copy key** → `OPENAI_API_KEY`

## 🔧 **Ví dụ file .env hoàn chỉnh**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
```

## ✅ **Kiểm tra setup**

Sau khi tạo file .env:

1. **Restart dev server:**
   ```powershell
   # Kill existing server
   taskkill /IM node.exe /F
   
   # Start new server
   npm run dev
   ```

2. **Test kết nối:**
   ```powershell
   # Chạy test script
   node test-db-connection.js
   ```

3. **Kiểm tra browser:**
   - Mở http://localhost:9002
   - Đăng nhập và test tạo worklog

## 🚨 **Lưu ý bảo mật**

- ✅ **File .env** đã được thêm vào .gitignore
- ✅ **Không commit** file .env lên GitHub
- ✅ **Chỉ chia sẻ** với team members cần thiết
- ✅ **Rotate keys** định kỳ

## 🛠️ **Troubleshooting**

### **Lỗi "Missing environment variables"**
- Kiểm tra file .env có tồn tại không
- Kiểm tra tên biến có đúng không
- Restart dev server sau khi tạo .env

### **Lỗi "Invalid API key"**
- Kiểm tra API key có đúng không
- Kiểm tra key có hết hạn không
- Tạo key mới nếu cần

### **Lỗi "Connection refused"**
- Kiểm tra Supabase URL có đúng không
- Kiểm tra project có active không
- Kiểm tra network connection

## 📝 **Checklist Setup**

- [ ] Tạo file .env
- [ ] Thêm Supabase credentials
- [ ] Thêm OpenAI API key
- [ ] Restart dev server
- [ ] Test kết nối database
- [ ] Test tạo worklog
- [ ] Test admin functions

**Sau khi setup xong, lỗi "Error fetching work logs" sẽ được sửa!** 🎯



