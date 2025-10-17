# Hướng dẫn Setup Hệ thống Admin

## 📋 Tổng quan
Hệ thống admin đã được cập nhật để sử dụng bảng `auth_users_extended` thay vì `profiles`.

## 🗄️ Database Setup

### 1. Chạy SQL Script
Chạy file `docs/admin-setup.sql` trong Supabase SQL Editor:

```sql
-- Thêm cột is_admin vào bảng auth_users_extended
alter table public.auth_users_extended 
add column if not exists is_admin boolean default false;

-- Các RLS policies và functions...
```

### 2. Cấp quyền Admin cho User
Sau khi chạy script, cấp quyền admin cho user cần thiết:

```sql
-- Thay 'user-email@example.com' bằng email thực tế
update public.auth_users_extended 
set is_admin = true 
where email = 'user-email@example.com';
```

## 🚀 Cách sử dụng

### Đăng nhập Admin
1. Đăng nhập với tài khoản đã được cấp quyền admin
2. Hệ thống sẽ tự động nhận diện và hiển thị navigation admin
3. Toast notification sẽ hiển thị "Chào mừng Admin [Tên]"

### Chức năng Admin

#### 1. **Dashboard** (`/admin/dashboard`)
- Thống kê tổng quan hệ thống
- Số lượng users, worklogs, conversations
- WorkLogs và users gần đây

#### 2. **Quản lý Users** (`/admin/users`)
- Xem danh sách tất cả users
- Cấp/thu hồi quyền admin
- Tìm kiếm users theo tên, email, mã NV

#### 3. **Quản lý WorkLogs** (`/admin/worklogs`)
- Xem tất cả worklogs của mọi user
- Thống kê theo danh mục
- Tìm kiếm và lọc worklogs

#### 4. **Admin AI Chat** (`/admin/chat`)
- Xem tất cả cuộc trò chuyện AI
- Truy vấn công việc của tất cả users
- Chat AI với quyền admin

## 🔒 Bảo mật

### RLS Policies
- Chỉ admin mới có thể đọc tất cả dữ liệu
- User thường chỉ có thể đọc dữ liệu của chính mình
- Function `is_admin()` để kiểm tra quyền

### Frontend Protection
- Navigation tự động ẩn/hiện theo quyền
- Các trang admin chỉ accessible bởi admin
- Toast notification phân biệt admin/user

## 🛠️ Troubleshooting

### Lỗi "relation does not exist"
- Đảm bảo bảng `auth_users_extended` đã tồn tại
- Kiểm tra tên bảng trong database

### Admin không hiển thị navigation
- Kiểm tra `is_admin = true` trong database
- Refresh trang sau khi cấp quyền
- Kiểm tra console log để debug

### Không thể truy cập trang admin
- Đảm bảo RLS policies đã được tạo
- Kiểm tra function `is_admin()` hoạt động
- Test với user có quyền admin

## 📝 Notes
- Hệ thống sử dụng `auth_users_extended` thay vì `profiles`
- Tất cả foreign key references đã được cập nhật
- Build thành công với warnings không ảnh hưởng
- Không push lên GitHub theo yêu cầu



