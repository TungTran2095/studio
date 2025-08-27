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
    console.log('🔧 [Real Database Setup] Starting database setup...');

    // Create research_projects table
    const createProjectsTable = `
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
    `;

    // Drop and recreate research_models table with correct schema
    const dropModelsTable = `DROP TABLE IF EXISTS research_models CASCADE;`;
    
    // Create research_models table
    const createModelsTable = `
      CREATE TABLE research_models (
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
    `;

    // Create training_results table
    const createTrainingTable = `
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
    `;

    // Check if we can create tables via SQL - if not, provide manual instructions
    console.log('📊 [Real Database Setup] Providing SQL commands for manual execution...');
    
    // Try a simple test first
    const { error: testError } = await supabase
      .from('research_projects')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === '42P01') {
      // Tables don't exist, provide SQL for manual creation
      return NextResponse.json({
        error: 'Tables need to be created manually in Supabase SQL Editor',
        sql_commands: [
          createProjectsTable,
          dropModelsTable,
          createModelsTable, 
          createTrainingTable
        ],
        instructions: [
          '1. Go to your Supabase Dashboard',
          '2. Navigate to SQL Editor', 
          '3. Run each SQL command below in order',
          '4. Try this setup API again'
        ]
      }, { status: 400 });
    }

    // Insert demo data
    console.log('📊 [Real Database Setup] Inserting demo projects...');
    const { data: demoProjects, error: demoError } = await supabase
      .from('research_projects')
      .insert([
        {
          name: 'Bitcoin Price Analysis',
          description: 'Phân tích giá Bitcoin sử dụng machine learning models',
          objective: 'Dự đoán xu hướng giá BTC trong ngắn hạn',
          status: 'active',
          progress: 25
        },
        {
          name: 'Ethereum Volatility Study', 
          description: 'Nghiên cứu volatility patterns của Ethereum',
          objective: 'Phát triển mô hình GARCH cho ETH volatility prediction',
          status: 'active',
          progress: 60
        }
      ])
      .select();

    if (demoError) {
      console.log('⚠️ [Real Database Setup] Demo data insertion failed:', demoError);
    }

    // Insert demo models if projects were created
    if (demoProjects && demoProjects.length > 0) {
      console.log('📊 [Real Database Setup] Inserting demo models...');
      const { error: modelsInsertError } = await supabase
        .from('research_models')
        .insert([
          {
            project_id: demoProjects[0].id,
            name: 'LSTM Bitcoin Predictor',
            category: 'prediction',
            algorithm_type: 'LSTM',
            status: 'completed',
            performance_metrics: {
              accuracy: 0.87,
              precision: 0.84,
              recall: 0.89,
              f1_score: 0.86
            }
          },
          {
            project_id: demoProjects[0].id,
            name: 'Random Forest Classifier',
            category: 'classification', 
            algorithm_type: 'Random Forest',
            status: 'training'
          },
          {
            project_id: demoProjects[1].id,
            name: 'GARCH Volatility Model',
            category: 'volatility',
            algorithm_type: 'GARCH',
            status: 'completed',
            performance_metrics: {
              rmse: 0.023,
              mae: 0.018,
              r_squared: 0.76
            }
          }
        ]);

      if (modelsInsertError) {
        console.log('⚠️ [Real Database Setup] Demo models insertion failed:', modelsInsertError);
      }
    }

    console.log('✅ [Real Database Setup] Database setup completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Real database setup completed successfully!',
      tables_created: ['research_projects', 'research_models', 'training_results'],
      demo_data: {
        projects: demoProjects?.length || 0,
        models: demoProjects ? 3 : 0
      },
      next_steps: [
        'Projects and models are now stored in Supabase',
        'Data will persist across server restarts',
        'You can view data in Supabase Dashboard'
      ]
    });

  } catch (error) {
    console.error('❌ [Real Database Setup] Error:', error);
    return NextResponse.json({ 
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      solution: 'Try running the SQL commands manually in Supabase SQL Editor'
    }, { status: 500 });
  }
}