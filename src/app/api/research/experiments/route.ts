import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientWithTimeout, executeWithTimeout, SUPABASE_TIMEOUT_CONFIG } from '@/lib/supabase/timeout-config';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Function to check if table exists and create if needed
async function ensureExperimentsTableExists() {
  try {
    if (!supabase) {
      console.error('Supabase client not available');
      return false;
    }
    
    // Try to query the table first
    const { error: testError } = await supabase
      .from('research_experiments')
      .select('count')
      .limit(1);

    if (testError) {
      console.log('Table check error:', testError);
      
      // Table doesn't exist or permission error
      const createTableSQL = `
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

        CREATE INDEX IF NOT EXISTS idx_research_experiments_project_id ON research_experiments(project_id);
        CREATE INDEX IF NOT EXISTS idx_research_experiments_status ON research_experiments(status);
        CREATE INDEX IF NOT EXISTS idx_research_experiments_type ON research_experiments(type);

        ALTER TABLE research_experiments ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if any
        DROP POLICY IF EXISTS "Allow all operations on research_experiments" ON research_experiments;
        
        -- Create new policy with proper permissions
        CREATE POLICY "Allow all operations on research_experiments" 
        ON research_experiments 
        FOR ALL 
        USING (true)
        WITH CHECK (true);
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Failed to create experiments table:', createError);
        return false;
      }

      // Verify table was created
      const { error: verifyError } = await supabase
        .from('research_experiments')
        .select('count')
        .limit(1);

      if (verifyError) {
        console.error('Failed to verify table creation:', verifyError);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking/creating experiments table:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
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
      // Ensure table exists
      const tableExists = await ensureExperimentsTableExists();
      if (!tableExists) {
        return NextResponse.json({ 
          error: 'Database table not available. Please run database setup first.',
          setup_required: true 
        }, { status: 503 });
      }

      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get('project_id');
      const experimentId = searchParams.get('id');

      if (experimentId) {
        // Get specific experiment
        const { data: experiment, error } = await supabase
          .from('research_experiments')
          .select('*')
          .eq('id', experimentId)
          .single();

        if (error) {
          console.error('Error fetching experiment:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ experiment });
      }

      // Get all experiments for project with timeout handling
      const queryFn = async () => {
        let query = supabase
          .from('research_experiments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(SUPABASE_TIMEOUT_CONFIG.DEFAULT_LIMIT);

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        return await query;
      };

      const { data: experiments, error } = await executeWithTimeout(
        queryFn,
        SUPABASE_TIMEOUT_CONFIG.COMPLEX_QUERY_TIMEOUT
      );

      if (error) {
        console.error('Error fetching experiments:', error);
        
        // Check if it's a timeout error
        if (error.code === '57014') {
          return NextResponse.json({ 
            error: 'Database query timeout. Please try again or contact support.',
            timeout: true,
            details: 'Query took too long to execute. This might be due to large dataset or database performance issues.',
            experiments: []
          }, { status: 504 });
        }
        
        // Check if it's a table not found error
        if (error.code === '42P01') {
          return NextResponse.json({ 
            error: 'Experiments table not found. Please run database setup.',
            setup_required: true,
            experiments: []
          }, { status: 404 });
        }
        
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ experiments: experiments || [] });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json({ 
        error: 'Internal server error',
        experiments: []
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      experiments: []
    }, { status: 500 });
  }
}

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
      // Ensure table exists
      const tableExists = await ensureExperimentsTableExists();
      if (!tableExists) {
        return NextResponse.json({ 
          error: 'Database table not available. Please run database setup first.',
          setup_required: true 
        }, { status: 503 });
      }

      const body = await request.json();
      const { project_id, name, type, description, config } = body;

      if (!project_id || !name || !type) {
        return NextResponse.json(
          { error: 'Missing required fields: project_id, name, type' },
          { status: 400 }
        );
      }

      // Validate experiment type
      const validTypes = ['backtest', 'hypothesis_test', 'optimization', 'monte_carlo'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid experiment type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }

      const experimentData = {
        project_id,
        name: name.trim(),
        type,
        description: description || '',
        config: config || {},
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating experiment with data:', experimentData);

      const { data: experiment, error } = await supabase
        .from('research_experiments')
        .insert([experimentData])
        .select()
        .single();

      if (error) {
        console.error('Error creating experiment:', error);
        
        // Check for specific error types
        if (error.code === '23505') { // Unique violation
          return NextResponse.json({ 
            error: 'An experiment with this name already exists' 
          }, { status: 400 });
        }
        
        if (error.code === '23503') { // Foreign key violation
          return NextResponse.json({ 
            error: 'Invalid project_id. Project does not exist' 
          }, { status: 400 });
        }

        return NextResponse.json({ 
          error: error.message || 'Failed to create experiment' 
        }, { status: 500 });
      }

      if (!experiment) {
        return NextResponse.json({ 
          error: 'Failed to create experiment - no data returned' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        experiment,
        message: 'Experiment created successfully' 
      });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('id');
    const body = await request.json();

    if (!experimentId) {
      return NextResponse.json({ error: 'Experiment ID is required' }, { status: 400 });
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
    }

    const { data: experiment, error } = await supabase
      .from('research_experiments')
      .update(updateData)
      .eq('id', experimentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating experiment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      experiment,
      message: 'Experiment updated successfully' 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('id');

    if (!experimentId) {
      return NextResponse.json({ error: 'Experiment ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
    }

    const { error } = await supabase
      .from('research_experiments')
      .delete()
      .eq('id', experimentId);

    if (error) {
      console.error('Error deleting experiment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Experiment deleted successfully' 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 