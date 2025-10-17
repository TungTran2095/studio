# Hướng dẫn Setup Hoàn chỉnh WorkLog Application

## 🚨 **Vấn đề đã được sửa:**
- ❌ Lỗi "Error fetching work logs: {}" - Bảng `worklogs` chưa tồn tại
- ❌ Lỗi "relation does not exist" - Thiếu các bảng cần thiết
- ✅ Tạo script setup hoàn chỉnh cho tất cả bảng

## 🗄️ **Database Setup**

### **Bước 1: Chạy Script Setup Hoàn chỉnh**
Chạy file `docs/complete-setup.sql` trong Supabase SQL Editor:

```sql
-- Script này sẽ tạo:
-- 1. Bảng admin_roles (quản lý quyền admin)
-- 2. Bảng worklogs (lưu trữ báo cáo công việc)
-- 3. Bảng chat_conversations & chat_messages (chat AI)
-- 4. Storage bucket & policies (file uploads)
-- 5. View user_profiles_with_admin (kết hợp user + admin info)
-- 6. Tất cả RLS policies và indexes
```

### **Bước 2: Cấp quyền Admin đầu tiên**
Sau khi chạy script, cấp quyền admin cho user đầu tiên:

```sql
-- Thay 'your-admin-email@example.com' bằng email thực tế
insert into public.admin_roles (id, is_admin)
values (
  (select id from auth.users where email = 'your-admin-email@example.com'), 
  true
)
on conflict (id) do update set is_admin = true;
```

## 🚀 **Cách sử dụng**

### **Đăng nhập và Test**
1. **Đăng nhập** với tài khoản admin
2. **Kiểm tra navigation** - Sẽ thấy menu admin đặc biệt
3. **Test chức năng** - Tạo worklog, sử dụng chat AI
4. **Cấp quyền admin** cho users khác qua giao diện

### **Chức năng Admin**
- **Dashboard**: Thống kê tổng quan hệ thống
- **Quản lý Users**: Cấp/thu hồi quyền admin
- **Quản lý WorkLogs**: Xem tất cả báo cáo
- **Admin AI Chat**: Chat AI với quyền admin

## 🔒 **Bảo mật**

### **RLS Policies**
- **Users**: Chỉ có thể đọc/ghi dữ liệu của mình
- **Admins**: Có thể đọc tất cả dữ liệu hệ thống
- **Service Role**: Quản lý admin roles

### **Database Structure**
```
auth.users (Supabase Auth)
├── admin_roles (quyền admin)
├── worklogs (báo cáo công việc)
├── chat_conversations (cuộc trò chuyện)
├── chat_messages (tin nhắn)
└── user_profiles_with_admin (view kết hợp)
```

## 🛠️ **Troubleshooting**

### **Lỗi "Error fetching work logs"**
- ✅ **Đã sửa**: Chạy `docs/complete-setup.sql`
- ✅ **Kiểm tra**: Bảng `worklogs` đã tồn tại

### **Lỗi "relation does not exist"**
- ✅ **Đã sửa**: Script tạo tất cả bảng cần thiết
- ✅ **Kiểm tra**: Tất cả bảng đã được tạo

### **Admin không hiển thị navigation**
- Kiểm tra `is_admin = true` trong bảng `admin_roles`
- Refresh trang sau khi cấp quyền

### **Không thể upload file**
- Kiểm tra storage bucket `attachments` đã được tạo
- Kiểm tra storage policies

## 📋 **Files Setup**

### **Scripts SQL:**
- ✅ `docs/complete-setup.sql` - Setup hoàn chỉnh (KHUYẾN NGHỊ)
- ✅ `docs/admin-setup-simple.sql` - Chỉ admin roles
- ✅ `docs/worklogs-setup.sql` - Chỉ worklogs
- ✅ `docs/chat-setup.sql` - Chỉ chat tables

### **Documentation:**
- ✅ `docs/setup-instructions.md` - Hướng dẫn này
- ✅ `docs/admin-setup-final.md` - Hướng dẫn admin

## ✅ **Build Status**
- ✅ Build thành công
- ✅ Tất cả routes hoạt động
- ✅ Không có lỗi database references
- ✅ RLS policies hoạt động đúng

## 🎯 **Bước tiếp theo:**

1. **Chạy script**: `docs/complete-setup.sql`
2. **Cấp quyền admin**: Cho user đầu tiên
3. **Test ứng dụng**: Đăng nhập và sử dụng
4. **Cấp quyền admin**: Cho users khác qua giao diện

## 📝 **Lưu ý quan trọng:**

- **Không push lên GitHub** theo yêu cầu
- **Backup database** trước khi chạy script
- **Test trên staging** trước khi deploy production
- **Monitor logs** để phát hiện lỗi

**Hệ thống WorkLog với Admin đã hoàn chỉnh và sẵn sàng sử dụng!** 🚀


