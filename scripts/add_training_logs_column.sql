-- Add training_logs column to research_models table
-- Run this in Supabase SQL Editor

ALTER TABLE research_models 
ADD COLUMN IF NOT EXISTS training_logs TEXT;

-- Add comment for documentation
COMMENT ON COLUMN research_models.training_logs IS 'Stores training logs and output for each model training session';

-- Create index for better performance when querying logs
CREATE INDEX IF NOT EXISTS idx_research_models_training_logs 
ON research_models USING gin (to_tsvector('english', training_logs));

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'research_models' 
  AND column_name = 'training_logs'; 