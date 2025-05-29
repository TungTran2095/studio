-- =========================================
-- CREATE RESEARCH_EXPERIMENTS TABLE
-- =========================================

-- Tạo bảng research_experiments
CREATE TABLE IF NOT EXISTS research_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('backtest', 'hypothesis_test', 'optimization', 'monte_carlo')),
  description TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  results JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_research_experiments_project_id ON research_experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_research_experiments_status ON research_experiments(status);
CREATE INDEX IF NOT EXISTS idx_research_experiments_type ON research_experiments(type);
CREATE INDEX IF NOT EXISTS idx_research_experiments_created_at ON research_experiments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE research_experiments ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho RLS (cho phép tất cả operations)
CREATE POLICY "Allow all operations on research_experiments" 
ON research_experiments FOR ALL USING (true);

-- Tạo trigger để auto-update updated_at
CREATE OR REPLACE FUNCTION update_research_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_research_experiments_updated_at 
BEFORE UPDATE ON research_experiments 
FOR EACH ROW EXECUTE FUNCTION update_research_experiments_updated_at();

-- Insert demo data
INSERT INTO research_experiments (project_id, name, type, description, config, status, progress, results) 
SELECT 
  p.id,
  'Demo Backtest Strategy',
  'backtest',
  'Demo backtest cho Bitcoin strategy',
  '{"start_date": "2023-01-01", "end_date": "2024-01-01", "initial_capital": 10000, "commission": 0.001}'::jsonb,
  'completed',
  100,
  '{"total_return": 23.5, "sharpe_ratio": 1.6, "max_drawdown": -8.4, "win_rate": 67.3}'::jsonb
FROM research_projects p 
WHERE p.name LIKE '%Bitcoin%' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verify table creation
SELECT 
  'research_experiments' as table_name, 
  count(*) as record_count 
FROM research_experiments;

-- Success message
SELECT 'Research experiments table created successfully! 🧪' as status; 