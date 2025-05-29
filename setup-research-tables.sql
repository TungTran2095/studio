-- =========================================
-- SETUP RESEARCH TABLES FOR YINSEN PROJECT
-- =========================================

-- 1. Tạo bảng Research Projects
CREATE TABLE IF NOT EXISTS research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  objective TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tạo bảng Research Models
CREATE TABLE IF NOT EXISTS research_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  model_type VARCHAR(100) NOT NULL,
  algorithm VARCHAR(100),
  parameters JSONB,
  performance_metrics JSONB,
  training_config JSONB,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'training', 'completed', 'failed', 'deployed')),
  accuracy DECIMAL(5,4),
  loss DECIMAL(10,6),
  training_time INTEGER, -- seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tạo bảng Backtests
CREATE TABLE IF NOT EXISTS research_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  model_id UUID REFERENCES research_models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  strategy_config JSONB NOT NULL,
  backtest_config JSONB NOT NULL,
  performance_metrics JSONB,
  results JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tạo bảng Training Jobs
CREATE TABLE IF NOT EXISTS research_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES research_models(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  config JSONB NOT NULL,
  logs TEXT,
  metrics JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_research_projects_status ON research_projects(status);
CREATE INDEX IF NOT EXISTS idx_research_projects_created_at ON research_projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_models_project_id ON research_models(project_id);
CREATE INDEX IF NOT EXISTS idx_research_models_status ON research_models(status);
CREATE INDEX IF NOT EXISTS idx_research_models_created_at ON research_models(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_backtests_project_id ON research_backtests(project_id);
CREATE INDEX IF NOT EXISTS idx_research_backtests_model_id ON research_backtests(model_id);
CREATE INDEX IF NOT EXISTS idx_research_backtests_status ON research_backtests(status);

CREATE INDEX IF NOT EXISTS idx_research_training_jobs_model_id ON research_training_jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_research_training_jobs_status ON research_training_jobs(status);

-- 6. Insert Demo Data (Optional)
INSERT INTO research_projects (id, name, description, objective, status, progress) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Yinsen AI Trading Strategy', 'Nghiên cứu và phát triển strategy giao dịch crypto sử dụng AI', 'Tạo ra một hệ thống giao dịch tự động hiệu quả với AI', 'active', 25),
('550e8400-e29b-41d4-a716-446655440002', 'Bitcoin Price Prediction', 'Dự đoán giá Bitcoin sử dụng machine learning', 'Xây dựng model dự đoán giá BTC với độ chính xác cao', 'active', 60),
('550e8400-e29b-41d4-a716-446655440003', 'Ethereum Market Analysis', 'Phân tích thị trường Ethereum và DeFi', 'Hiểu rõ động thái thị trường ETH và các token DeFi', 'active', 40)
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Demo Models
INSERT INTO research_models (id, project_id, name, description, model_type, algorithm, status, performance_metrics) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'LSTM Price Predictor', 'Long Short-Term Memory model để dự đoán giá crypto', 'deep_learning', 'LSTM', 'completed', '{"accuracy": 0.8756, "mse": 0.0234, "mae": 0.1123}'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Random Forest Classifier', 'Random Forest để phân loại tín hiệu buy/sell', 'machine_learning', 'RandomForest', 'training', '{"accuracy": 0.7234, "precision": 0.6891, "recall": 0.7456}'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'GARCH Volatility Model', 'GARCH model để dự đoán volatility', 'statistical', 'GARCH', 'completed', '{"log_likelihood": -1234.56, "aic": 2478.12, "bic": 2495.78}')
ON CONFLICT (id) DO NOTHING;

-- 8. Insert Demo Backtests
INSERT INTO research_backtests (id, project_id, model_id, name, description, strategy_config, backtest_config, performance_metrics, status) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'LSTM Strategy Backtest', 'Backtest strategy dựa trên LSTM predictions', '{"entry_threshold": 0.6, "exit_threshold": 0.4, "stop_loss": 0.02, "take_profit": 0.05}', '{"start_date": "2023-01-01", "end_date": "2023-12-31", "initial_capital": 100000, "commission": 0.001}', '{"total_return": 0.2876, "sharpe_ratio": 1.45, "max_drawdown": -0.1234, "win_rate": 0.67, "total_trades": 156}', 'completed'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', 'GARCH Volatility Strategy', 'Strategy dựa trên volatility predictions', '{"vol_threshold": 0.02, "entry_signal": "high_vol", "position_size": 0.1}', '{"start_date": "2023-06-01", "end_date": "2023-12-31", "initial_capital": 50000, "commission": 0.0015}', '{"total_return": 0.1567, "sharpe_ratio": 1.12, "max_drawdown": -0.0876, "win_rate": 0.72, "total_trades": 89}', 'completed')
ON CONFLICT (id) DO NOTHING;

-- 9. Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_research_projects_updated_at BEFORE UPDATE ON research_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_research_models_updated_at BEFORE UPDATE ON research_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_research_backtests_updated_at BEFORE UPDATE ON research_backtests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Enable Row Level Security (RLS)
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_training_jobs ENABLE ROW LEVEL SECURITY;

-- 11. Create policies (allow all for now - adjust based on your auth needs)
CREATE POLICY "Allow all operations on research_projects" ON research_projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on research_models" ON research_models FOR ALL USING (true);
CREATE POLICY "Allow all operations on research_backtests" ON research_backtests FOR ALL USING (true);
CREATE POLICY "Allow all operations on research_training_jobs" ON research_training_jobs FOR ALL USING (true);

-- =========================================
-- SETUP COMPLETED ✅
-- =========================================

SELECT 'Research tables setup completed successfully! 🎉' as status; 