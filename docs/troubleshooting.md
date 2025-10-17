# Troubleshooting Guide

## 🚨 **Lỗi thường gặp và cách sửa**

### 1. **Lỗi Port đã được sử dụng (EADDRINUSE)**

#### **Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use :::9002
```

#### **Nguyên nhân:**
- Có process khác đang sử dụng port 9002
- Dev server cũ chưa được tắt hoàn toàn

#### **Cách sửa:**

**Cách 1: Sử dụng script tự động**
```powershell
# Chạy script restart
.\restart-dev.ps1
```

**Cách 2: Sửa thủ công**
```powershell
# 1. Kill tất cả Node.js processes
taskkill /IM node.exe /F

# 2. Xóa cache Next.js
Remove-Item -Recurse -Force .next

# 3. Chạy lại dev server
npm run dev
```

**Cách 3: Sử dụng port khác**
```powershell
# Chạy trên port khác
npm run dev -- -p 3000
```

### 2. **Lỗi Build Manifest (ENOENT)**

#### **Triệu chứng:**
```
Error: ENOENT: no such file or directory, open '.../_buildManifest.js.tmp...'
```

#### **Nguyên nhân:**
- Cache Next.js bị corrupt
- Build process bị gián đoạn

#### **Cách sửa:**
```powershell
# 1. Xóa cache
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# 2. Reinstall dependencies (nếu cần)
npm install

# 3. Build lại
npm run build
```

### 3. **Lỗi Database "relation does not exist"**

#### **Triệu chứng:**
```
Error: Error fetching work logs: {}
ERROR: relation "worklogs" does not exist
```

#### **Nguyên nhân:**
- Bảng database chưa được tạo
- Chưa chạy script setup

#### **Cách sửa:**
```sql
-- Chạy script setup hoàn chỉnh trong Supabase SQL Editor
-- File: docs/complete-setup.sql
```

### 4. **Lỗi RLS Policy**

#### **Triệu chứng:**
```
ERROR: only WITH CHECK expression allowed for INSERT
```

#### **Nguyên nhân:**
- RLS policy syntax không đúng
- Circular dependency trong policies

#### **Cách sửa:**
```sql
-- Sử dụng script đã sửa
-- File: docs/admin-setup-simple.sql
```

### 5. **Lỗi Admin không hiển thị navigation**

#### **Triệu chứng:**
- Đăng nhập thành công nhưng không thấy menu admin
- Navigation vẫn hiển thị như user thường

#### **Nguyên nhân:**
- User chưa được cấp quyền admin
- Bảng admin_roles chưa có dữ liệu

#### **Cách sửa:**
```sql
-- Cấp quyền admin cho user
insert into public.admin_roles (id, is_admin)
values (
  (select id from auth.users where email = 'your-email@example.com'), 
  true
)
on conflict (id) do update set is_admin = true;
```

## 🛠️ **Scripts hữu ích**

### **Restart Dev Server**
```powershell
# Sử dụng script tự động
.\restart-dev.ps1

# Hoặc thủ công
taskkill /IM node.exe /F
Remove-Item -Recurse -Force .next
npm run dev
```

### **Clean Build**
```powershell
# Xóa tất cả cache và build lại
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache
npm run build
```

### **Check Port Usage**
```powershell
# Kiểm tra port đang được sử dụng
netstat -ano | findstr :9002

# Kill process theo PID
taskkill /PID <PID> /F
```

## 📋 **Checklist khi gặp lỗi**

1. ✅ **Kiểm tra port**: `netstat -ano | findstr :9002`
2. ✅ **Kill processes**: `taskkill /IM node.exe /F`
3. ✅ **Xóa cache**: `Remove-Item -Recurse -Force .next`
4. ✅ **Chạy script setup**: `docs/complete-setup.sql`
5. ✅ **Cấp quyền admin**: SQL insert vào `admin_roles`
6. ✅ **Restart dev server**: `npm run dev`

## 🚀 **Prevention Tips**

- **Luôn sử dụng Ctrl+C** để tắt dev server
- **Chạy script setup** trước khi test
- **Backup database** trước khi thay đổi
- **Monitor console logs** để phát hiện lỗi sớm

## 📞 **Khi nào cần help**

- Lỗi vẫn xảy ra sau khi thử tất cả cách sửa
- Lỗi database phức tạp
- Lỗi build không rõ nguyên nhân
- Cần thêm tính năng mới

**Lưu ý**: Luôn backup trước khi thay đổi database! 🔒



