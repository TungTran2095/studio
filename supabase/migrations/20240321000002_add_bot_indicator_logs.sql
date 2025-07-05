-- =========================================
-- ADD BOT INDICATOR LOGS TABLE
-- =========================================

-- Tạo bảng bot_indicator_logs để lưu trữ logs của các indicator
CREATE TABLE IF NOT EXISTS bot_indicator_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES trading_bots(id) ON DELETE CASCADE,
  indicator TEXT NOT NULL,
  value DECIMAL(20,8) NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_bot_indicator_logs_bot_id ON bot_indicator_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_indicator_logs_time ON bot_indicator_logs(time);
CREATE INDEX IF NOT EXISTS idx_bot_indicator_logs_indicator ON bot_indicator_logs(indicator);

-- Thêm RLS policies
ALTER TABLE bot_indicator_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view indicator logs of their bots"
  ON bot_indicator_logs FOR SELECT
  USING (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert indicator logs for their bots"
  ON bot_indicator_logs FOR INSERT
  WITH CHECK (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

-- Success message
SELECT 'Bot indicator logs table created successfully! 📊' as status; 