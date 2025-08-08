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

    
  try {
    console.log('🔧 [Optimization API] GET - Fetching optimization jobs...');
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('optimization_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('❌ [Optimization API] Database error:', error);
      
      // If table doesn't exist, return empty array instead of error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.log('⚠️ [Optimization API] optimization_jobs table not found, returning empty array');
        return NextResponse.json({ jobs: [] });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch optimization jobs', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [Optimization API] Retrieved ${jobs?.length || 0} jobs from database`);
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
}

// Background optimization simulation
async function simulateOptimization(
  jobId: string, 
  method: string, 
  parameterSpace: any, 
  maxIterations: number
) {
  try {
    console.log(`🔧 [Optimization Simulation] Starting ${method} for job ${jobId}`);
    
    // Update status to running
    await supabase
      .from('optimization_jobs')
      .update({ 
        status: 'running',
        estimated_time_remaining: maxIterations * 0.5 // Rough estimate: 30 seconds per iteration
      })
      .eq('id', jobId);

    let bestScore = method.includes('minimize') ? Infinity : -Infinity;
    let bestParams = {};
    const results = [];

    for (let i = 1; i <= maxIterations; i++) {
      // Generate random parameters within the parameter space
      const currentParams = generateRandomParams(parameterSpace);
      
      // Simulate objective function evaluation
      const score = evaluateObjectiveFunction(currentParams, method);
      
      // Update best score if improved
      const isImprovement = method.includes('minimize') ? 
        score < bestScore : score > bestScore;
      
      if (isImprovement) {
        bestScore = score;
        bestParams = currentParams;
      }

      results.push({
        iteration: i,
        parameters: currentParams,
        score: score,
        timestamp: new Date().toISOString()
      });

      const progress = Math.round((i / maxIterations) * 100);
      const estimatedTimeRemaining = Math.round((maxIterations - i) * 0.5);

      // Update progress every 5 iterations or at the end
      if (i % 5 === 0 || i === maxIterations) {
        await supabase
          .from('optimization_jobs')
          .update({
            current_iteration: i,
            progress: progress,
            best_score: bestScore,
            best_params: bestParams,
            optimization_results: results.slice(-10), // Keep last 10 results
            estimated_time_remaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : null
          })
          .eq('id', jobId);

        console.log(`🔧 [Optimization ${jobId}] Iteration ${i}/${maxIterations}, Best Score: ${bestScore.toFixed(4)}`);
      }

      // Simulate processing time (0.1-1 second per iteration)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 900));
    }

    // Mark as completed
    await supabase
      .from('optimization_jobs')
      .update({
        status: 'completed',
        progress: 100,
        current_iteration: maxIterations,
        best_score: bestScore,
        best_params: bestParams,
        optimization_results: results.slice(-20), // Keep last 20 results
        estimated_time_remaining: null,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ [Optimization ${jobId}] Completed! Best Score: ${bestScore.toFixed(4)}`);

  } catch (error) {
    console.error('❌ [Optimization Simulation] Error:', error);
    
    // Mark as failed
    await supabase
      .from('optimization_jobs')
      .update({
        status: 'failed',
        estimated_time_remaining: null
      })
      .eq('id', jobId);
  }
}

function generateRandomParams(parameterSpace: any): any {
  const params: any = {};
  
  for (const [key, config] of Object.entries(parameterSpace)) {
    const [min, max, type] = config as [number, number, string];
    
    switch (type) {
      case 'int':
        params[key] = Math.floor(Math.random() * (max - min + 1)) + min;
        break;
      case 'log-uniform':
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        params[key] = Math.exp(Math.random() * (logMax - logMin) + logMin);
        break;
      case 'uniform':
      default:
        params[key] = Math.random() * (max - min) + min;
        break;
    }
  }
  
  return params;
}

function evaluateObjectiveFunction(params: any, method: string): number {
  // Simulate realistic objective function based on method
  let baseScore = 0;
  
  // Add some complexity based on parameters
  const paramValues = Object.values(params) as number[];
  const paramSum = paramValues.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
  const paramProduct = paramValues.reduce((prod, val) => prod * (typeof val === 'number' ? Math.abs(val) : 1), 1);
  
  if (method.includes('sharpe')) {
    // Sharpe ratio: typically 0.5 to 3.0, higher is better
    baseScore = 0.5 + Math.sin(paramSum * 0.1) * 0.8 + Math.cos(paramProduct * 0.001) * 0.7;
    baseScore += Math.random() * 0.2 - 0.1; // Add noise
  } else if (method.includes('drawdown')) {
    // Drawdown: typically -1% to -30%, lower (more negative) is worse
    baseScore = -0.05 - Math.abs(Math.sin(paramSum * 0.05)) * 0.25;
    baseScore += Math.random() * 0.02 - 0.01; // Add noise
  } else if (method.includes('return')) {
    // Return: typically 5% to 50%, higher is better
    baseScore = 0.05 + Math.sin(paramSum * 0.08) * 0.2 + Math.cos(paramProduct * 0.0001) * 0.15;
    baseScore += Math.random() * 0.05 - 0.025; // Add noise
  } else if (method.includes('volatility')) {
    // Volatility: typically 5% to 40%, lower is better for minimization
    baseScore = 0.1 + Math.abs(Math.sin(paramSum * 0.06)) * 0.3;
    baseScore += Math.random() * 0.02 - 0.01; // Add noise
  } else {
    // Default score
    baseScore = Math.sin(paramSum * 0.1) * Math.cos(paramProduct * 0.001);
    baseScore += Math.random() * 0.1 - 0.05; // Add noise
  }
  
  return baseScore;
} 