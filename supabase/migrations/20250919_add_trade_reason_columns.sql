-- Add reason/signal columns to trades for UI display
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_reason TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_reason TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS buy_signal TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sell_signal TEXT;

-- Optional index to filter by exit_reason faster
CREATE INDEX IF NOT EXISTS idx_trades_exit_reason ON trades(exit_reason);

