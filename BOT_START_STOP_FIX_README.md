# Sửa Lỗi Nút Start/Stop Bot

## Vấn đề
Nút start/stop bot không hoạt động, trạng thái không được cập nhật từ "stopped" sang "running" hoặc ngược lại trong Supabase.

## Nguyên nhân
1. **Thiếu RLS policy cho UPDATE operations** - Bảng `trading_bots` chỉ có policies cho SELECT, INSERT, DELETE nhưng không có cho UPDATE
2. **Inconsistency trong API endpoints** - Frontend gọi sai endpoint khi start bot
3. **BotManager và BotExecutor sử dụng supabase client thông thường** - Không thể bypass RLS để cập nhật status

## Giải pháp đã áp dụng

### 1. Thêm RLS Policy cho UPDATE operations
Tạo file migration: `supabase/migrations/20241201_add_update_policy.sql`
```sql
-- Thêm RLS policy cho UPDATE operations trên bảng trading_bots
-- Policy này cho phép user cập nhật bot của chính họ

CREATE POLICY "Enable update for users based on user_id" ON "public"."trading_bots"
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Nếu bạn muốn cho phép admin hoặc service role cập nhật tất cả bot
-- (để BotManager có thể hoạt động), hãy thêm policy này:
CREATE POLICY "Enable update for service role" ON "public"."trading_bots"
FOR UPDATE USING (auth.role() = 'service_role');
```

### 2. Sửa Inconsistency trong API endpoints
**File:** `src/components/research/tabs/project-bots.tsx`
- Sửa `handleToggleBot` để sử dụng cùng endpoint `/api/trading/bot` với method PUT cho cả start và stop
- Trước: start bot gọi `/api/trading/bot/start` (POST), stop bot gọi `/api/trading/bot` (PUT)
- Sau: cả start và stop đều gọi `/api/trading/bot` (PUT) với action khác nhau

### 3. Sửa BotManager để sử dụng supabaseAdmin
**File:** `src/lib/trading/bot-manager.ts`
- Thêm supabaseAdmin client để bypass RLS
- Sửa tất cả methods sử dụng `supabase` thành `this.supabaseAdmin`
- Đảm bảo BotManager có thể cập nhật status của tất cả bot

### 4. Sửa BotExecutor để sử dụng supabaseAdmin
**File:** `src/lib/trading/bot-executor.ts`
- Thêm supabaseAdmin client để bypass RLS
- Sửa tất cả methods sử dụng `supabase` thành `this.supabaseAdmin`
- Đảm bảo BotExecutor có thể cập nhật status và stats

## Cách áp dụng

### Bước 1: Áp dụng RLS Policy
1. Vào Supabase Dashboard
2. Vào SQL Editor
3. Chạy migration file `20241201_add_update_policy.sql`

### Bước 2: Restart ứng dụng
```bash
npm run dev
# hoặc
yarn dev
```

### Bước 3: Test
1. Vào trang Trading Bots
2. Thử ấn nút Start/Stop
3. Kiểm tra xem status có thay đổi không

## Test Script
Sử dụng script `test_bot_start_stop.js` để test trực tiếp database:
```bash
node test_bot_start_stop.js
```

## Kiểm tra
- Nút Start/Stop phải hoạt động
- Status phải thay đổi từ "stopped" sang "running" và ngược lại
- Không có lỗi RLS policy trong console
- BotManager và BotExecutor có thể cập nhật status

## Lưu ý
- Đảm bảo environment variables `SUPABASE_SERVICE_ROLE_KEY` đã được set
- Service role key có quyền bypass tất cả RLS policies
- Chỉ sử dụng service role key trong backend, không expose ra frontend


