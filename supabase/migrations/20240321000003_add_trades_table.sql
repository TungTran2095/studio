-- =========================================
-- ADD TRADES TABLE
-- =========================================

-- Tạo bảng trades để lưu trữ lịch sử giao dịch
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES trading_bots(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('market', 'limit')),
  quantity DECIMAL(20,8) NOT NULL,
  entry_price DECIMAL(20,8) NOT NULL,
  exit_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8) NOT NULL,
  take_profit DECIMAL(20,8) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  pnl DECIMAL(20,8),
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_trades_bot_id ON trades(bot_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON trades(open_time);

-- Thêm RLS policies
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trades of their bots"
  ON trades FOR SELECT
  USING (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert trades for their bots"
  ON trades FOR INSERT
  WITH CHECK (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update trades of their bots"
  ON trades FOR UPDATE
  USING (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

-- Success message
SELECT 'Trades table created successfully! 💰' as status; 