-- =========================================
-- ADD INDICATORS COLUMN TO RESEARCH_EXPERIMENTS
-- =========================================

-- Thêm column indicators để lưu trữ dữ liệu indicator cho chart
ALTER TABLE research_experiments 
ADD COLUMN IF NOT EXISTS indicators JSONB DEFAULT NULL;

-- Thêm comment để giải thích column
COMMENT ON COLUMN research_experiments.indicators IS 'Lưu trữ dữ liệu indicator cho chart (RSI, MACD, MA, Bollinger Bands, etc.)';

-- Tạo index cho column indicators để tối ưu query
CREATE INDEX IF NOT EXISTS idx_research_experiments_indicators 
ON research_experiments USING GIN (indicators);

-- Success message
SELECT 'Indicators column added to research_experiments table successfully! 📊' as status; 