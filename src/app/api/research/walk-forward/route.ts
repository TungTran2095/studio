import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WalkForwardService } from '@/lib/trading/walk-forward-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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
    await saveWalkForwardResults(experiment_id, config, results);

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

async function saveWalkForwardResults(experimentId: string, config: any, results: any) {
  try {
    const { data, error } = await supabase
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