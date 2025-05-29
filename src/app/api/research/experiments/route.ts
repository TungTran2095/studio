import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Function to check if table exists and create if needed
async function ensureExperimentsTableExists() {
  try {
    // Try to query the table first
    const { error: testError } = await supabase
      .from('research_experiments')
      .select('count')
      .limit(1);

    if (testError && testError.code === '42P01') {
      // Table doesn't exist, create it
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
        CREATE POLICY IF NOT EXISTS "Allow all operations on research_experiments" 
        ON research_experiments FOR ALL USING (true);
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Failed to create experiments table:', createError);
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

    // Get all experiments for project
    let query = supabase
      .from('research_experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: experiments, error } = await query;

    if (error) {
      console.error('Error fetching experiments:', error);
      
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
}

export async function POST(request: NextRequest) {
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

    const { data: experiment, error } = await supabase
      .from('research_experiments')
      .insert([experimentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating experiment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      experiment,
      message: 'Experiment created successfully' 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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