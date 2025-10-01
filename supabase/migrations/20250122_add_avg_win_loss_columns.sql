-- Migration để thêm các cột avg_win_net và avg_loss_net vào bảng trading_bots

-- Thêm cột avg_win_net nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'avg_win_net') THEN
        ALTER TABLE trading_bots ADD COLUMN avg_win_net DECIMAL(10,4) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Thêm cột avg_loss_net nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trading_bots' AND column_name = 'avg_loss_net') THEN
        ALTER TABLE trading_bots ADD COLUMN avg_loss_net DECIMAL(10,4) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Cập nhật schema cache
NOTIFY pgrst, 'reload schema';















