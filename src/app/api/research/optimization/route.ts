import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const jobId = searchParams.get('id');

    if (jobId) {
      // Get specific optimization job
      const { data: job, error } = await supabase
        .from('optimization_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching optimization job:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ job });
    }

    // Get all optimization jobs for project
    let query = supabase
      .from('optimization_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Error fetching optimization jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error('❌ [Optimization API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      const body = await request.json();
      console.log('🚀 [Optimization API] POST - Creating optimization job:', body);

      const jobData = {
        project_id: body.project_id,
        model_id: body.model_id,
        name: body.name,
        description: body.description || '',
        method: body.method,
        parameter_space: body.parameter_space,
        objective: body.objective,
        max_iterations: body.max_iterations || 100,
        current_iteration: 0,
        best_params: {},
        best_score: null,
        optimization_results: [],
        status: 'pending',
        progress: 0,
        estimated_time_remaining: null,
        created_at: new Date().toISOString(),
        completed_at: null,
        user_id: null // Will be set when auth is implemented
      };

      const { data: job, error } = await supabase
        .from('optimization_jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) {
        console.error('❌ [Optimization API] Database error:', error);
        
        // If table doesn't exist, provide helpful message
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('⚠️ [Optimization API] optimization_jobs table not found');
          return NextResponse.json(
            { error: 'Optimization jobs table not found. Please set up database tables first.' },
            { status: 503 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to create optimization job', details: error.message },
          { status: 500 }
        );
      }

      console.log('✅ [Optimization API] Job created successfully:', job.id);

      // Start optimization simulation in background
      simulateOptimization(job.id, body.method, body.parameter_space, body.max_iterations);

      return NextResponse.json({ job });

    } catch (error) {
      console.error('❌ [Optimization API] Unexpected error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [Optimization API] Outer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Background optimization simulation
async function simulateOptimization(
  jobId: string, 
  method: string, 
  parameterSpace: any, 
  maxIterations: number
) {
  try {
    if (!supabase) {
      console.error('Supabase client not available for optimization simulation');
      return;
    }

    console.log(`🔧 [Optimization Simulation] Starting ${method} for job ${jobId}`);
    
    // Update status to running
    await supabase
      .from('optimization_jobs')
      .update({ 
        status: 'running',
        progress: 0
      })
      .eq('id', jobId);

    let bestScore = -Infinity;
    let bestParams = {};
    const results = [];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Generate random parameters
      const params = generateRandomParams(parameterSpace);
      
      // Evaluate objective function
      const score = evaluateObjectiveFunction(params, method);
      
      // Update best if better
      if (score > bestScore) {
        bestScore = score;
        bestParams = params;
      }
      
      // Store result
      results.push({
        iteration,
        params,
        score,
        timestamp: new Date().toISOString()
      });
      
      // Update progress
      const progress = Math.round((iteration + 1) / maxIterations * 100);
      await supabase
        .from('optimization_jobs')
        .update({ 
          progress,
          current_iteration: iteration + 1,
          best_params: bestParams,
          best_score: bestScore,
          optimization_results: results
        })
        .eq('id', jobId);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark as completed
    await supabase
      .from('optimization_jobs')
      .update({ 
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ [Optimization Simulation] Completed ${method} for job ${jobId}`);

  } catch (error) {
    console.error('❌ [Optimization Simulation] Error:', error);
    
    // Mark as failed
    if (supabase) {
      await supabase
        .from('optimization_jobs')
        .update({ 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', jobId);
    }
  }
}

function generateRandomParams(parameterSpace: any): any {
  const params: any = {};
  
  for (const [param, config] of Object.entries(parameterSpace)) {
    const configObj = config as any;
    if (configObj.type === 'float') {
      params[param] = Math.random() * (configObj.max - configObj.min) + configObj.min;
    } else if (configObj.type === 'integer') {
      params[param] = Math.floor(Math.random() * (configObj.max - configObj.min + 1)) + configObj.min;
    } else if (configObj.type === 'categorical') {
      params[param] = configObj.values[Math.floor(Math.random() * configObj.values.length)];
    }
  }
  
  return params;
}

function evaluateObjectiveFunction(params: any, method: string): number {
  // Mock objective function - in real implementation, this would train a model
  let score = 0;
  
  // Simulate different optimization methods
  switch (method) {
    case 'random_search':
      score = Math.random() * 100;
      break;
    case 'grid_search':
      score = 50 + Math.random() * 30;
      break;
    case 'bayesian_optimization':
      score = 70 + Math.random() * 20;
      break;
    default:
      score = Math.random() * 100;
  }
  
  // Add some noise based on parameters
  Object.values(params).forEach((value: any) => {
    score += (value % 10) * 0.1;
  });
  
  return Math.round(score * 100) / 100;
} 