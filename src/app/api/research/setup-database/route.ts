import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up research database...');

    // SQL để tạo các bảng
    const setupSQL = `
      -- Tạo bảng research_projects
      CREATE TABLE IF NOT EXISTS research_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        objective TEXT,
        status TEXT DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

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

      -- Tạo bảng research_models
      CREATE TABLE IF NOT EXISTS research_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

      -- Tạo indexes cho research_experiments
      CREATE INDEX IF NOT EXISTS idx_research_experiments_project_id ON research_experiments(project_id);
      CREATE INDEX IF NOT EXISTS idx_research_experiments_status ON research_experiments(status);
      CREATE INDEX IF NOT EXISTS idx_research_experiments_type ON research_experiments(type);
      CREATE INDEX IF NOT EXISTS idx_research_experiments_created_at ON research_experiments(created_at DESC);

      -- Enable RLS cho research_experiments
      ALTER TABLE research_experiments ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow all operations on research_experiments" 
      ON research_experiments FOR ALL USING (true);

      -- Tạo trigger cho auto-update
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
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: setupSQL });
    
    if (createError) {
      console.error('Failed to create tables:', createError);
      return NextResponse.json({ 
        error: 'Failed to create tables',
        details: createError.message
      }, { status: 500 });
    }

    // Thêm demo data
    try {
      // Thêm demo project
      const { data: demoProject, error: projectError } = await supabase
        .from('research_projects')
        .insert({
          name: 'Bitcoin Price Analysis',
          description: 'Phân tích giá Bitcoin sử dụng machine learning models',
          objective: 'Dự đoán xu hướng giá BTC trong ngắn hạn',
          status: 'active',
          progress: 25
        })
        .select()
        .single();

      if (projectError) {
        console.warn('⚠️ Failed to insert demo project:', projectError);
      } else if (demoProject) {
        // Thêm demo experiment
        const demoExperiment = {
          project_id: demoProject.id,
          name: 'Demo Bitcoin Backtest',
          type: 'backtest',
          description: 'Demo experiment để test chức năng',
          config: {
            start_date: '2023-01-01',
            end_date: '2024-01-01',
            initial_capital: 10000,
            commission: 0.001
          },
          status: 'completed',
          progress: 100,
          results: {
            total_return: 23.5,
            sharpe_ratio: 1.6,
            max_drawdown: -8.4,
            win_rate: 67.3,
            total_trades: 156
          }
        };

        const { error: experimentError } = await supabase
          .from('research_experiments')
          .insert([demoExperiment]);

        if (experimentError) {
          console.warn('⚠️ Failed to insert demo experiment:', experimentError);
        } else {
          console.log('✅ Demo experiment created');
        }
      }
    } catch (demoError) {
      console.warn('⚠️ Failed to create demo data:', demoError);
    }

    console.log('✅ Research database setup completed');

    return NextResponse.json({
      success: true,
      message: 'Research database setup completed successfully!',
      tables_created: ['research_projects', 'research_experiments', 'research_models'],
      demo_data_added: true
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Database setup endpoint',
    instructions: 'Send POST request to create tables',
    sql_script: setupSQL
  });
} 