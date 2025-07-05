-- Script để sửa bảng trading_bots - chạy trực tiếp trên Supabase SQL Editor

-- Thêm cột total_trades nếu chưa tồn tại
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS total_trades INTEGER NOT NULL DEFAULT 0;

-- Thêm cột total_profit nếu chưa tồn tại  
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS total_profit DECIMAL(20,8) NOT NULL DEFAULT 0;

-- Thêm cột win_rate nếu chưa tồn tại
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Thêm cột last_run_at nếu chưa tồn tại
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Thêm cột last_error nếu chưa tồn tại
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Kiểm tra cấu trúc bảng sau khi sửa
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trading_bots' 
ORDER BY ordinal_position; 