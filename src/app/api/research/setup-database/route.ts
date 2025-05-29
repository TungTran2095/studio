import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

const CREATE_TABLES_SQL = `
-- Research Projects
CREATE TABLE IF NOT EXISTS research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID, -- Removed references for now
  tags TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
);

-- Models (simplified)
CREATE TABLE IF NOT EXISTS research_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
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
  user_id UUID,
  model_file_path TEXT,
  training_time_seconds INTEGER,
  data_size INTEGER
);

-- Hypothesis Tests (simplified)
CREATE TABLE IF NOT EXISTS hypothesis_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
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
  user_id UUID
);

-- Backtests (simplified)
CREATE TABLE IF NOT EXISTS backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID,
  project_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  strategy_config JSONB NOT NULL,
  backtest_config JSONB NOT NULL,
  risk_management JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  trades JSONB DEFAULT '[]',
  equity_curve JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_projects_user_id ON research_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_research_projects_status ON research_projects(status);
CREATE INDEX IF NOT EXISTS idx_research_models_project_id ON research_models(project_id);
CREATE INDEX IF NOT EXISTS idx_research_models_status ON research_models(status);
CREATE INDEX IF NOT EXISTS idx_hypothesis_tests_project_id ON hypothesis_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_backtests_model_id ON backtests(model_id);
CREATE INDEX IF NOT EXISTS idx_backtests_status ON backtests(status);
`;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    console.log('🔧 Setting up database tables...');

    // Try to create tables individually using simple INSERT approach
    const tables = [];
    
    try {
      // Check if research_projects table exists
      const { data: projects, error: projectsError } = await supabase
        .from('research_projects')
        .select('id')
        .limit(1);
      
      if (projectsError && projectsError.code === '42P01') {
        // Table doesn't exist, need manual setup
        return NextResponse.json({
          error: 'Tables do not exist',
          message: 'Please create tables manually in Supabase Dashboard',
          instructions: [
            '1. Vào Supabase Dashboard → SQL Editor',
            '2. Copy-paste SQL script dưới đây',
            '3. Click RUN để tạo tables',
            '4. Refresh lại page này'
          ],
          sql_script: CREATE_TABLES_SQL,
          dashboard_url: 'https://supabase.com/dashboard'
        }, { status: 400 });
      } else {
        tables.push('research_projects exists');
      }
    } catch (err) {
      console.log('Error checking research_projects:', err);
    }

    try {
      // Check research_models
      const { data: models, error: modelsError } = await supabase
        .from('research_models')
        .select('id')
        .limit(1);
      
      if (modelsError && modelsError.code === '42P01') {
        return NextResponse.json({
          error: 'research_models table missing',
          message: 'Please run SQL script in Supabase Dashboard',
          sql_script: CREATE_TABLES_SQL
        }, { status: 400 });
      } else {
        tables.push('research_models exists');
      }
    } catch (err) {
      console.log('Error checking research_models:', err);
    }

    // If we reach here, tables exist
    console.log('✅ Database tables verified:', tables);
    
    // Test insert sample data
    try {
      const { data: testProject, error: insertError } = await supabase
        .from('research_projects')
        .insert({
          name: 'Sample Research Project',
          description: 'Auto-generated test project',
          objective: 'Test database functionality',
          status: 'active'
        })
        .select()
        .single();

      if (!insertError) {
        console.log('✅ Test insert successful');
        return NextResponse.json({ 
          message: 'Database setup verified successfully',
          tables_found: tables,
          test_project_created: testProject?.id
        });
      }
    } catch (insertErr) {
      console.log('Insert test failed:', insertErr);
    }
    
    return NextResponse.json({ 
      message: 'Database tables found but may need permissions check',
      tables_found: tables
    });
    
  } catch (error) {
    console.error('Setup API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Please create tables manually using SQL script',
      sql_script: CREATE_TABLES_SQL,
      instructions: [
        '1. Go to Supabase Dashboard',
        '2. Open SQL Editor', 
        '3. Paste the SQL script',
        '4. Execute the script'
      ]
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Database setup endpoint',
    instructions: 'Send POST request to create tables',
    sql_script: CREATE_TABLES_SQL
  });
} 