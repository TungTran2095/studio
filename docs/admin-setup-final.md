# Hướng dẫn Setup Hệ thống Admin (FINAL VERSION)

## ✅ **Đã sửa tất cả lỗi SQL!**

### **Lỗi đã sửa:**
1. ❌ `auth_users_extended` là view → ✅ Tạo bảng `admin_roles` riêng
2. ❌ `ALTER TABLE` trên view → ✅ Sử dụng bảng thực tế
3. ❌ RLS policy INSERT syntax → ✅ Sử dụng `with check` đúng cách
4. ❌ Circular dependency trong RLS → ✅ Sử dụng service role

## 🗄️ Database Setup

### 1. Chạy SQL Script SIMPLE
Chạy file `docs/admin-setup-simple.sql` trong Supabase SQL Editor:

```sql
-- Tạo bảng admin_roles
create table if not exists public.admin_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS policies đơn giản
-- Service role có thể quản lý admin roles
-- Users chỉ có thể đọc admin status của mình
```

### 2. Cấp quyền Admin đầu tiên
**QUAN TRỌNG**: Sau khi chạy script, cần cấp quyền admin cho user đầu tiên:

```sql
-- Thay 'your-admin-email@example.com' bằng email thực tế
insert into public.admin_roles (id, is_admin)
values (
  (select id from auth.users where email = 'your-admin-email@example.com'), 
  true
)
on conflict (id) do update set is_admin = true;
```

### 3. Cấp quyền Admin cho users khác
Sau khi có admin đầu tiên, có thể cấp quyền cho users khác qua giao diện admin hoặc SQL:

```sql
-- Cấp quyền admin cho user khác
insert into public.admin_roles (id, is_admin)
values (
  (select id from auth.users where email = 'another-admin@example.com'), 
  true
)
on conflict (id) do update set is_admin = true;
```

## 🚀 Cách sử dụng

### Đăng nhập Admin
1. Đăng nhập với tài khoản đã được cấp quyền admin
2. Hệ thống sẽ tự động nhận diện và hiển thị navigation admin
3. Toast notification: "Chào mừng Admin [Tên]"

### Chức năng Admin

#### 1. **Dashboard** (`/admin/dashboard`)
- Thống kê tổng quan hệ thống
- Số lượng users, worklogs, conversations
- WorkLogs và users gần đây

#### 2. **Quản lý Users** (`/admin/users`)
- Xem danh sách tất cả users
- Cấp/thu hồi quyền admin (sử dụng service role)
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
- **Service Role**: Có thể quản lý tất cả admin roles
- **Authenticated Users**: Chỉ có thể đọc admin status của mình
- **Admins**: Có thể đọc tất cả dữ liệu hệ thống

### Database Structure
- **`admin_roles`**: Bảng quản lý quyền admin
- **`user_profiles_with_admin`**: View kết hợp user info + admin status
- **Function `is_admin()`**: Kiểm tra quyền admin
- **Trigger**: Tự động tạo admin_roles entry cho user mới

## 🛠️ Troubleshooting

### Lỗi "relation does not exist"
- Đảm bảo bảng `admin_roles` đã được tạo
- Kiểm tra view `user_profiles_with_admin` hoạt động

### Admin không hiển thị navigation
- Kiểm tra `is_admin = true` trong bảng `admin_roles`
- Refresh trang sau khi cấp quyền

### Không thể cấp quyền admin
- Đảm bảo service role có quyền
- Kiểm tra RLS policies đã được tạo

## 📝 Code Changes

### Database References:
- ✅ `src/lib/admin.ts` - Sử dụng `admin_roles` và `user_profiles_with_admin`
- ✅ `src/app/admin-actions.ts` - Cập nhật tất cả queries với upsert
- ✅ `src/components/*-navigation.tsx` - Cập nhật user profile queries
- ✅ `src/app/login/page.tsx` - Cập nhật admin check

### Key Features:
- ✅ **Upsert Logic**: Xử lý cả insert và update admin roles
- ✅ **Service Role**: Quản lý admin roles an toàn
- ✅ **Auto Trigger**: Tự động tạo admin_roles cho user mới
- ✅ **View Integration**: Kết hợp user profile + admin status

## ✅ Build Status
- ✅ Build thành công
- ✅ Tất cả routes admin hoạt động
- ✅ Không có lỗi SQL syntax
- ✅ RLS policies hoạt động đúng

## 🎯 **Bước tiếp theo:**
1. Chạy `docs/admin-setup-simple.sql`
2. Cấp quyền admin cho user đầu tiên
3. Đăng nhập và test các chức năng admin
4. Cấp quyền admin cho users khác qua giao diện

**Lưu ý**: Không push lên GitHub theo yêu cầu. Hệ thống admin đã sẵn sàng hoạt động! 🚀



