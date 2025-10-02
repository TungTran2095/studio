-- Create api_calls table to store server-side API monitoring logs
CREATE TABLE IF NOT EXISTS api_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  normalized_url TEXT,
  pathname TEXT,
  status INT,
  duration_ms INT,
  response_size BIGINT,
  category TEXT,
  service TEXT,
  endpoint_name TEXT,
  used_weight_1m INT,
  order_count_10s INT,
  order_count_1m INT,
  source TEXT DEFAULT 'server'
);

CREATE INDEX IF NOT EXISTS idx_api_calls_timestamp ON api_calls(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_calls_service ON api_calls(service);
CREATE INDEX IF NOT EXISTS idx_api_calls_category ON api_calls(category);
CREATE INDEX IF NOT EXISTS idx_api_calls_normalized_url ON api_calls(normalized_url);


