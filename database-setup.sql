-- Research Module Database Setup for Urus Studio
-- Copy và paste toàn bộ script này vào Supabase SQL Editor

-- 1. Create research_projects table
CREATE TABLE IF NOT EXISTS research_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create research_models table
CREATE TABLE IF NOT EXISTS research_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'prediction',
  algorithm_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  performance_metrics JSONB,
  model_params JSONB,
  hyperparameters JSONB,
  training_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create training_results table
CREATE TABLE IF NOT EXISTS training_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES research_models(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL,
  training_data_size INTEGER,
  test_data_size INTEGER,
  performance_metrics JSONB,
  model_params JSONB,
  training_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert demo projects
INSERT INTO research_projects (name, description, objective, status, progress) VALUES
(
  'Bitcoin Price Analysis',
  'Phân tích giá Bitcoin sử dụng machine learning models',
  'Dự đoán xu hướng giá BTC trong ngắn hạn với độ chính xác cao',
  'active',
  25
),
(
  'Ethereum Volatility Study',
  'Nghiên cứu volatility patterns của Ethereum',
  'Phát triển mô hình GARCH cho ETH volatility prediction',
  'active',
  60
),
(
  'Portfolio Optimization Research',
  'Nghiên cứu tối ưu hóa danh mục đầu tư crypto',
  'Xây dựng chiến lược phân bổ vốn tự động',
  'draft',
  10
);

-- 5. Insert demo models (sử dụng project IDs từ projects vừa tạo)
INSERT INTO research_models (project_id, name, category, algorithm_type, status, performance_metrics) 
SELECT 
  p.id,
  model_data.name,
  model_data.category,
  model_data.algorithm_type,
  model_data.status,
  model_data.performance_metrics
FROM research_projects p,
(VALUES 
  ('LSTM Bitcoin Predictor', 'prediction', 'LSTM', 'completed', '{"accuracy": 0.87, "precision": 0.84, "recall": 0.89, "f1_score": 0.86}'::jsonb),
  ('Random Forest Classifier', 'classification', 'Random Forest', 'training', null),
  ('Volume Analysis Model', 'analysis', 'Linear Regression', 'draft', null)
) AS model_data(name, category, algorithm_type, status, performance_metrics)
WHERE p.name = 'Bitcoin Price Analysis'

UNION ALL

SELECT 
  p.id,
  model_data.name,
  model_data.category,
  model_data.algorithm_type,
  model_data.status,
  model_data.performance_metrics
FROM research_projects p,
(VALUES 
  ('GARCH Volatility Model', 'volatility', 'GARCH', 'completed', '{"rmse": 0.023, "mae": 0.018, "r_squared": 0.76}'::jsonb),
  ('SVM Trend Classifier', 'classification', 'SVM', 'draft', null)
) AS model_data(name, category, algorithm_type, status, performance_metrics)
WHERE p.name = 'Ethereum Volatility Study'

UNION ALL

SELECT 
  p.id,
  model_data.name,
  model_data.category,
  model_data.algorithm_type,
  model_data.status,
  model_data.performance_metrics
FROM research_projects p,
(VALUES 
  ('Risk Parity Model', 'optimization', 'Mathematical Optimization', 'draft', null)
) AS model_data(name, category, algorithm_type, status, performance_metrics)
WHERE p.name = 'Portfolio Optimization Research';

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_models_project_id ON research_models(project_id);
CREATE INDEX IF NOT EXISTS idx_research_models_status ON research_models(status);
CREATE INDEX IF NOT EXISTS idx_training_results_model_id ON training_results(model_id);
CREATE INDEX IF NOT EXISTS idx_research_projects_status ON research_projects(status);

-- 7. Enable Row Level Security (RLS) - Optional for security
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_results ENABLE ROW LEVEL SECURITY;

-- 8. Create policies to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on research_projects" ON research_projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on research_models" ON research_models FOR ALL USING (true);
CREATE POLICY "Allow all operations on training_results" ON training_results FOR ALL USING (true);

-- 9. Verify setup
SELECT 
  'research_projects' as table_name, 
  count(*) as record_count 
FROM research_projects
UNION ALL
SELECT 
  'research_models' as table_name, 
  count(*) as record_count 
FROM research_models
UNION ALL
SELECT 
  'training_results' as table_name, 
  count(*) as record_count 
FROM training_results;

-- Success message
SELECT 'Database setup completed successfully! 🎉' as status; 