-- =========================================
-- ADD TRADES COLUMN TO RESEARCH_EXPERIMENTS
-- =========================================

-- Thêm column trades để lưu trữ dữ liệu trades
ALTER TABLE research_experiments 
ADD COLUMN IF NOT EXISTS trades JSONB DEFAULT NULL;

-- Thêm comment để giải thích column
COMMENT ON COLUMN research_experiments.trades IS 'Lưu trữ dữ liệu trades từ backtest (entry/exit, PnL, fees, etc.)';

-- Tạo index cho column trades để tối ưu query
CREATE INDEX IF NOT EXISTS idx_research_experiments_trades 
ON research_experiments USING GIN (trades);

-- Success message
SELECT 'Trades column added to research_experiments table successfully! 📈' as status;

