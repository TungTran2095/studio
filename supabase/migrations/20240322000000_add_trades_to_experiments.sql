-- =========================================
-- ADD TRADES COLUMN TO RESEARCH_EXPERIMENTS
-- =========================================

-- Thêm column trades để lưu trữ dữ liệu giao dịch
ALTER TABLE research_experiments 
ADD COLUMN IF NOT EXISTS trades JSONB DEFAULT NULL;

-- Thêm comment để giải thích column
COMMENT ON COLUMN research_experiments.trades IS 'Lưu trữ dữ liệu giao dịch chi tiết từ backtest';

-- Tạo index cho column trades để tối ưu query
CREATE INDEX IF NOT EXISTS idx_research_experiments_trades 
ON research_experiments USING GIN (trades);

-- Success message
SELECT 'Trades column added to research_experiments table successfully! 📈' as status;

