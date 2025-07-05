-- Migration để đảm bảo các cột cần thiết tồn tại trong bảng trading_bots
-- Thêm cột total_trades nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'total_trades') THEN
        ALTER TABLE trading_bots ADD COLUMN total_trades INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Thêm cột total_profit nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'total_profit') THEN
        ALTER TABLE trading_bots ADD COLUMN total_profit DECIMAL(20,8) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Thêm cột win_rate nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'win_rate') THEN
        ALTER TABLE trading_bots ADD COLUMN win_rate DECIMAL(5,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Thêm cột last_run_at nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'last_run_at') THEN
        ALTER TABLE trading_bots ADD COLUMN last_run_at TIMESTAMPTZ;
    END IF;
END $$;

-- Thêm cột last_error nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'last_error') THEN
        ALTER TABLE trading_bots ADD COLUMN last_error TEXT;
    END IF;
END $$;

-- Cập nhật schema cache
NOTIFY pgrst, 'reload schema'; 