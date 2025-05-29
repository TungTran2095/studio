-- Research & Model Development Database Schema

-- Research Projects
CREATE TABLE research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
);

-- Models
CREATE TABLE research_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('statistical', 'machine_learning', 'financial_math')) NOT NULL,
  algorithm_type TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  hyperparameters JSONB DEFAULT '{}',
  feature_config JSONB DEFAULT '{}',
  training_config JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('draft', 'training', 'completed', 'failed')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  model_file_path TEXT, -- Path to saved model file
  training_time_seconds INTEGER,
  data_size INTEGER
);

-- Model Training Results
CREATE TABLE model_training_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES research_models(id) ON DELETE CASCADE,
  performance_metrics JSONB NOT NULL, -- accuracy, precision, recall, etc.
  feature_importance JSONB DEFAULT '{}',
  validation_results JSONB DEFAULT '{}',
  training_logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  training_duration INTEGER, -- in seconds
  dataset_info JSONB DEFAULT '{}'
);

-- Hypothesis Tests
CREATE TABLE hypothesis_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT NOT NULL,
  null_hypothesis TEXT NOT NULL,
  alternative_hypothesis TEXT NOT NULL,
  test_type TEXT CHECK (test_type IN ('correlation', 't_test', 'anova', 'chi_square', 'granger_causality')) NOT NULL,
  variables JSONB NOT NULL,
  test_config JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id)
);

-- Backtests
CREATE TABLE backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES research_models(id) ON DELETE CASCADE,
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy_config JSONB NOT NULL,
  backtest_config JSONB NOT NULL, -- period, initial_capital, etc.
  risk_management JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  trades JSONB DEFAULT '[]',
  equity_curve JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id)
);

-- Optimization Jobs
CREATE TABLE optimization_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES research_models(id) ON DELETE CASCADE,
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT CHECK (method IN ('grid_search', 'random_search', 'bayesian_optimization', 'genetic_algorithm')) NOT NULL,
  parameter_space JSONB NOT NULL,
  objective TEXT NOT NULL,
  max_iterations INTEGER DEFAULT 100,
  current_iteration INTEGER DEFAULT 0,
  best_params JSONB DEFAULT '{}',
  best_score NUMERIC,
  optimization_results JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_time_remaining INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id)
);

-- Model Library (shared models)
CREATE TABLE model_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES research_models(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  performance_metrics JSONB NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  model_file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Data Cache (for backtesting and training)
CREATE TABLE market_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, timeframe, timestamp)
);

-- Technical Indicators Cache
CREATE TABLE technical_indicators_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  indicator_name TEXT NOT NULL,
  indicator_value NUMERIC,
  indicator_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, timeframe, timestamp, indicator_name)
);

-- Indexes for performance
CREATE INDEX idx_research_projects_user_id ON research_projects(user_id);
CREATE INDEX idx_research_projects_status ON research_projects(status);
CREATE INDEX idx_research_models_project_id ON research_models(project_id);
CREATE INDEX idx_research_models_status ON research_models(status);
CREATE INDEX idx_hypothesis_tests_project_id ON hypothesis_tests(project_id);
CREATE INDEX idx_backtests_model_id ON backtests(model_id);
CREATE INDEX idx_backtests_status ON backtests(status);
CREATE INDEX idx_optimization_jobs_model_id ON optimization_jobs(model_id);
CREATE INDEX idx_optimization_jobs_status ON optimization_jobs(status);
CREATE INDEX idx_market_data_cache_symbol_timeframe ON market_data_cache(symbol, timeframe, timestamp);
CREATE INDEX idx_technical_indicators_cache_lookup ON technical_indicators_cache(symbol, timeframe, timestamp, indicator_name);

-- Row Level Security
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE hypothesis_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own research projects" ON research_projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own models" ON research_models
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their model results" ON model_training_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM research_models rm 
      WHERE rm.id = model_training_results.model_id 
      AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own hypothesis tests" ON hypothesis_tests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own backtests" ON backtests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own optimization jobs" ON optimization_jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public models in library" ON model_library
  FOR SELECT USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY "Users can manage their own library models" ON model_library
  FOR ALL USING (auth.uid() = author_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_research_projects_updated_at BEFORE UPDATE ON research_projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_models_updated_at BEFORE UPDATE ON research_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_library_updated_at BEFORE UPDATE ON model_library 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 