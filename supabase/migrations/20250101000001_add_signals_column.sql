-- Thêm cột signals vào bảng trading_bots
ALTER TABLE trading_bots 
ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '[]'::jsonb;

-- Tạo index cho cột signals để tối ưu query
CREATE INDEX IF NOT EXISTS idx_trading_bots_signals ON trading_bots USING GIN (signals);

-- Comment cho cột signals
COMMENT ON COLUMN trading_bots.signals IS 'Lưu trữ lịch sử signals của bot dưới dạng JSONB array';
