import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WalkForwardService } from '@/lib/trading/walk-forward-service';

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
    const body = await request.json();
    const { experiment_id, config } = body;

    // Validate input
    if (!experiment_id || !config) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize Walk Forward Service
    const walkForwardService = new WalkForwardService();

    // Perform real walk-forward analysis
    const results = await walkForwardService.runWalkForwardAnalysis({
      totalPeriod: config.total_period || 252 * 2,
      inSamplePeriod: config.in_sample_period || 252,
      outSamplePeriod: config.out_sample_period || 63,
      stepSize: config.step_size || 21,
      optimizationMethod: config.optimization_method || 'grid_search',
      paramRanges: {
        fastPeriod: config.param_ranges?.fast_period || [5, 20, 5],
        slowPeriod: config.param_ranges?.slow_period || [20, 100, 10],
        stopLoss: config.param_ranges?.stop_loss || [0.02, 0.10, 0.02],
        takeProfit: config.param_ranges?.take_profit || [0.05, 0.20, 0.05]
      }
    });

    // Save results to database
    const db: SupabaseClient = supabase as SupabaseClient;
    await saveWalkForwardResults(db, experiment_id, config, results);

    return NextResponse.json({
      success: true,
      results,
      experiment_id
    });

  } catch (error) {
    console.error('Walk-Forward analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This function has been replaced by WalkForwardService

// All mock functions have been replaced by WalkForwardService

async function saveWalkForwardResults(client: SupabaseClient, experimentId: string, config: any, results: any) {
  try {
    const { data, error } = await client
      .from('research_experiments')
      .insert({
        experiment_id: experimentId,
        experiment_type: 'walk_forward_analysis',
        config: config,
        results: results,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving walk-forward results:', error);
    } else {
      console.log('✅ Walk-forward results saved to database');
    }
  } catch (error) {
    console.error('Error saving to database:', error);
  }
} 