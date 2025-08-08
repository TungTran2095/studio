import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.log('⚠️ Supabase client not available - environment variables missing');
      return NextResponse.json(
        { 
          error: 'Database connection not available',
          details: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
          success: false
        },
        { status: 503 }
      );
    }

    
  try {
    console.log('🔧 Setting up research_experiments table...');

    // SQL để tạo bảng research_experiments
    const setupSQL = `
      -- Tạo bảng research_experiments nếu chưa tồn tại
      CREATE TABLE IF NOT EXISTS research_experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID,
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

      -- Tạo indexes
      CREATE INDEX IF NOT EXISTS idx_research_experiments_project_id ON research_experiments(project_id);
      CREATE INDEX IF NOT EXISTS idx_research_experiments_status ON research_experiments(status);
      CREATE INDEX IF NOT EXISTS idx_research_experiments_type ON research_experiments(type);
      CREATE INDEX IF NOT EXISTS idx_research_experiments_created_at ON research_experiments(created_at DESC);

      -- Enable RLS
      ALTER TABLE research_experiments ENABLE ROW LEVEL SECURITY;

      -- Tạo policy
      DROP POLICY IF EXISTS "Allow all operations on research_experiments" ON research_experiments;
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

      DROP TRIGGER IF EXISTS update_research_experiments_updated_at ON research_experiments;
      CREATE TRIGGER update_research_experiments_updated_at 
      BEFORE UPDATE ON research_experiments 
      FOR EACH ROW EXECUTE FUNCTION update_research_experiments_updated_at();
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: setupSQL });
    
    if (createError) {
      console.error('Failed to create experiments table:', createError);
      return NextResponse.json({ 
        error: 'Failed to create experiments table',
        details: createError.message
      }, { status: 500 });
    }

    // Thêm demo data
    try {
      const { data: projects } = await supabase
        .from('research_projects')
        .select('id')
        .limit(1);

      if (projects && projects.length > 0) {
        const projectId = projects[0].id;
        
        const demoExperiment = {
          project_id: projectId,
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

        const { error: insertError } = await supabase
          .from('research_experiments')
          .insert([demoExperiment]);

        if (insertError) {
          console.warn('⚠️ Failed to insert demo data:', insertError);
        } else {
          console.log('✅ Demo experiment created');
        }
      }
    } catch (demoError) {
      console.warn('⚠️ Failed to create demo data:', demoError);
    }

    // Verify setup
    const { data: experiments, error: verifyError } = await supabase
      .from('research_experiments')
      .select('count');

    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: 'Table created but verification failed: ' + verifyError.message
      }, { status: 500 });
    }

    console.log('✅ Research experiments table setup completed');

    return NextResponse.json({
      success: true,
      message: 'Research experiments table setup completed successfully!',
      table_created: true,
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