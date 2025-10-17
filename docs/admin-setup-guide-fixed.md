# Hướng dẫn Setup Hệ thống Admin (FIXED VERSION)

## 🔧 **Vấn đề đã được sửa:**
- `auth_users_extended` là một **view** chứ không phải table, nên không thể thêm cột
- Tạo bảng `admin_roles` riêng để quản lý quyền admin
- Tạo view `user_profiles_with_admin` để kết hợp thông tin user và admin status

## 🗄️ Database Setup

### 1. Chạy SQL Script FIXED
Chạy file `docs/admin-setup-fixed.sql` trong Supabase SQL Editor:

```sql
-- Tạo bảng admin_roles riêng
create table if not exists public.admin_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tạo view kết hợp user profile và admin status
create or replace view public.user_profiles_with_admin as
select 
  aue.*,
  ar.is_admin,
  ar.created_at as admin_role_created_at,
  ar.updated_at as admin_role_updated_at
from public.auth_users_extended aue
left join public.admin_roles ar on aue.id = ar.id;
```

### 2. Cấp quyền Admin cho User
Sau khi chạy script, cấp quyền admin cho user cần thiết:

```sql
-- Cách 1: Cấp quyền admin cho user hiện có
update public.admin_roles 
set is_admin = true 
where id = (select id from auth.users where email = 'admin@yourcompany.com');

-- Cách 2: Tạo entry admin_roles cho user mới (nếu chưa có)
insert into public.admin_roles (id, is_admin)
values ((select id from auth.users where email = 'admin@yourcompany.com'), true)
on conflict (id) do update set is_admin = true;
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
- Function `is_admin()` để kiểm tra quyền từ bảng `admin_roles`

### Database Structure
- **`admin_roles`**: Bảng riêng quản lý quyền admin
- **`user_profiles_with_admin`**: View kết hợp user info + admin status
- **Foreign Keys**: Tất cả references đã được cập nhật

## 🛠️ Troubleshooting

### Lỗi "relation does not exist"
- Đảm bảo bảng `admin_roles` đã được tạo
- Kiểm tra view `user_profiles_with_admin` hoạt động
- Verify RLS policies đã được áp dụng

### Admin không hiển thị navigation
- Kiểm tra `is_admin = true` trong bảng `admin_roles`
- Refresh trang sau khi cấp quyền
- Kiểm tra console log để debug

### Không thể truy cập trang admin
- Đảm bảo RLS policies đã được tạo
- Kiểm tra function `is_admin()` hoạt động
- Test với user có quyền admin

## 📝 Code Changes Made

### Database References Updated:
- `src/lib/admin.ts` - Sử dụng `admin_roles` và `user_profiles_with_admin`
- `src/app/admin-actions.ts` - Cập nhật tất cả queries
- `src/components/*-navigation.tsx` - Cập nhật user profile queries
- `src/app/login/page.tsx` - Cập nhật admin check

### New Database Objects:
- **Table**: `admin_roles` - Quản lý quyền admin
- **View**: `user_profiles_with_admin` - Kết hợp user + admin info
- **Function**: `is_admin()` - Kiểm tra quyền admin
- **Trigger**: `on_auth_user_created_admin` - Tự động tạo admin_roles entry

## ✅ Build Status
- ✅ Build thành công
- ✅ Tất cả routes admin hoạt động
- ✅ Không có lỗi database references
- ✅ Warnings không ảnh hưởng

**Lưu ý**: Không push lên GitHub theo yêu cầu. Tất cả thay đổi đã được lưu local!



