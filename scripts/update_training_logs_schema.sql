-- Update training_logs schema to support better logging
-- Run this in Supabase SQL Editor

-- Add training_logs column as JSONB if it doesn't exist
ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS training_logs JSONB DEFAULT '[]'::jsonb;

-- Add training_time column to track training duration in seconds
ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS training_time INTEGER DEFAULT 0;

-- Add training_started_at timestamp (missing column causing 404)
ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS training_started_at TIMESTAMPTZ DEFAULT NULL;

-- Add training_completed_at timestamp
ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS training_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add accuracy and loss columns for model metrics
ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,4) DEFAULT NULL;

ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS loss DECIMAL(10,6) DEFAULT NULL;

-- Add performance_metrics JSONB column for detailed training results
ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}'::jsonb;

-- Update existing NULL training_logs to empty JSONB array
UPDATE research_models 
SET training_logs = '[]'::jsonb 
WHERE training_logs IS NULL;

-- Update existing NULL performance_metrics to empty JSONB object
UPDATE research_models 
SET performance_metrics = '{}'::jsonb 
WHERE performance_metrics IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_models_accuracy ON research_models(accuracy);
CREATE INDEX IF NOT EXISTS idx_research_models_loss ON research_models(loss);
CREATE INDEX IF NOT EXISTS idx_research_models_training_time ON research_models(training_time);
CREATE INDEX IF NOT EXISTS idx_research_models_training_started_at ON research_models(training_started_at);
CREATE INDEX IF NOT EXISTS idx_research_models_training_completed_at ON research_models(training_completed_at);
CREATE INDEX IF NOT EXISTS idx_research_models_performance_metrics ON research_models USING gin (performance_metrics);

-- Verify the updates
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'research_models' 
  AND column_name IN ('training_logs', 'training_time', 'accuracy', 'loss', 'training_started_at', 'training_completed_at', 'performance_metrics')
ORDER BY column_name; 