-- Tạo enum cho trạng thái bot
CREATE TYPE trading_bot_status AS ENUM ('idle', 'running', 'stopped', 'error');

-- Tạo bảng trading_bots
CREATE TABLE IF NOT EXISTS trading_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status trading_bot_status NOT NULL DEFAULT 'idle',
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_profit DECIMAL(20,8) NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo bảng trades để lưu lịch sử giao dịch
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

-- Tạo indexes
CREATE INDEX IF NOT EXISTS idx_trading_bots_project_id ON trading_bots(project_id);
CREATE INDEX IF NOT EXISTS idx_trading_bots_experiment_id ON trading_bots(experiment_id);
CREATE INDEX IF NOT EXISTS idx_trading_bots_status ON trading_bots(status);
CREATE INDEX IF NOT EXISTS idx_trades_bot_id ON trades(bot_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trading_bots_updated_at
  BEFORE UPDATE ON trading_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Thêm RLS policies
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy cho trading_bots
CREATE POLICY "Users can view their own bots"
  ON trading_bots FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bots for their projects"
  ON trading_bots FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own bots"
  ON trading_bots FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own bots"
  ON trading_bots FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Policy cho trades
CREATE POLICY "Users can view trades of their bots"
  ON trades FOR SELECT
  USING (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create trades for their bots"
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

CREATE POLICY "Users can delete trades of their bots"
  ON trades FOR DELETE
  USING (
    bot_id IN (
      SELECT id FROM trading_bots WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  ); 