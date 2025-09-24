# Hướng dẫn cấu hình WorkLog App

## Vấn đề hiện tại: "Database error saving new user"

Lỗi này xảy ra vì thiếu cấu hình environment variables cho Supabase.

## Các bước khắc phục:

### 1. Tạo file .env.local trong thư mục gốc

Tạo file `.env.local` với nội dung sau:

```env
# Supabase variables (from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_SECRET_KEY

# Google Gemini API Key (for AI features)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 2. Lấy thông tin từ Supabase

1. Đăng nhập vào [supabase.com](https://supabase.com)
2. Chọn project của bạn
3. Vào **Project Settings** > **API**
4. Copy các giá trị:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

### 3. Lấy Gemini API Key

1. Vào [Google AI Studio](https://makersuite.google.com/)
2. Tạo API key mới
3. Copy key vào `GEMINI_API_KEY`

### 4. Tạo database table

Trong Supabase SQL Editor, chạy script sau:

```sql
CREATE TABLE worklogs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    start_time TIME,
    end_time TIME,
    file_name TEXT,
    file_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 5. Tạo storage bucket

1. Vào **Storage** trong Supabase
2. Tạo bucket mới tên `attachments`
3. Đặt bucket là **public**
4. Tạo policy cho phép upload:
   - **Policy Name:** `Allow server uploads`
   - **Allowed operations:** `INSERT`
   - **Target roles:** `anon` và `authenticated`
   - **WITH CHECK expression:** `true`

### 6. Cấu hình Authentication

1. Vào **Authentication** > **Providers**
2. Để test nhanh: Tắt **Confirm email**
3. Để production: Bật **Confirm email**

### 7. Chạy ứng dụng

```bash
npm run dev
```

Truy cập http://localhost:9002 để test ứng dụng.

