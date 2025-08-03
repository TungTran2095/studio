import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Perform walk-forward analysis
    const results = await performWalkForwardAnalysis(config);

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

async function performWalkForwardAnalysis(config: any) {
  console.log('🔄 Starting walk-forward analysis with config:', config);
  
  const {
    total_period = 252 * 2,
    in_sample_period = 252,
    out_sample_period = 63,
    step_size = 21,
    optimization_method = 'genetic_algorithm',
    rebalance_frequency = 'monthly',
    strategy_params = {},
    symbols = ['BTC', 'ETH']
  } = config;

  // Generate periods for walk-forward analysis
  const periods = generateWalkForwardPeriods(
    total_period,
    in_sample_period,
    out_sample_period,
    step_size
  );

  console.log(`📊 Generated ${periods.length} periods for walk-forward analysis`);

  // Run analysis for each period
  const results = [];
  
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    console.log(`🔄 Processing period ${i + 1}/${periods.length}: ${period.start_date} - ${period.end_date}`);
    
    try {
      // Fetch historical data for in-sample period
      const inSampleData = await fetchHistoricalData(
        symbols,
        period.start_date,
        period.in_sample_end_date
      );

      // Fetch historical data for out-sample period
      const outSampleData = await fetchHistoricalData(
        symbols,
        period.in_sample_end_date,
        period.end_date
      );

      if (inSampleData && outSampleData) {
        // Optimize parameters on in-sample data
        const optimizedParams = await optimizeParameters(
          inSampleData,
          strategy_params,
          optimization_method
        );

        // Test on out-sample data
        const outSampleResults = await testStrategy(
          outSampleData,
          optimizedParams
        );

        // Calculate parameter drift (compare with previous period)
        const parameterDrift: number = i > 0 ? calculateParameterDrift(
          optimizedParams,
          results[i - 1].optimized_params
        ) : 0;

        // Calculate stability score
        const stability = Math.max(0, 1 - parameterDrift);

        results.push({
          period_id: period.id,
          start_date: period.start_date,
          end_date: period.end_date,
          in_sample_start: period.start_date,
          in_sample_end: period.in_sample_end_date,
          out_sample_start: period.in_sample_end_date,
          out_sample_end: period.end_date,
          optimized_params: optimizedParams,
          in_sample_metrics: {
            total_return: calculateTotalReturn(inSampleData),
            sharpe_ratio: calculateSharpeRatio(inSampleData),
            max_drawdown: calculateMaxDrawdown(inSampleData),
            volatility: calculateVolatility(inSampleData)
          },
          out_sample_metrics: {
            total_return: outSampleResults.total_return,
            sharpe_ratio: outSampleResults.sharpe_ratio,
            max_drawdown: outSampleResults.max_drawdown,
            volatility: outSampleResults.volatility,
            win_rate: outSampleResults.win_rate,
            profit_factor: outSampleResults.profit_factor
          },
          parameter_drift: parameterDrift,
          stability: stability,
          status: 'completed'
        });
      }
    } catch (error) {
      console.error(`Error processing period ${i + 1}:`, error);
      results.push({
        period_id: period.id,
        start_date: period.start_date,
        end_date: period.end_date,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Calculate overall analysis metrics
  const overallMetrics = calculateOverallMetrics(results);

  return {
    periods: results,
    overall_metrics: overallMetrics,
    analysis_config: {
      total_period,
      in_sample_period,
      out_sample_period,
      step_size,
      optimization_method,
      rebalance_frequency,
      total_periods: periods.length
    }
  };
}

function generateWalkForwardPeriods(
  totalPeriod: number,
  inSamplePeriod: number,
  outSamplePeriod: number,
  stepSize: number
) {
  const periods = [];
  const startDate = new Date('2023-01-01');
  
  let currentStart = new Date(startDate);
  let periodId = 1;
  
  while (currentStart.getTime() < startDate.getTime() + (totalPeriod * 24 * 60 * 60 * 1000)) {
    const inSampleEnd = new Date(currentStart.getTime() + (inSamplePeriod * 24 * 60 * 60 * 1000));
    const outSampleEnd = new Date(inSampleEnd.getTime() + (outSamplePeriod * 24 * 60 * 60 * 1000));
    
    periods.push({
      id: `period-${periodId}`,
      start_date: currentStart.toISOString().split('T')[0],
      in_sample_end_date: inSampleEnd.toISOString().split('T')[0],
      end_date: outSampleEnd.toISOString().split('T')[0]
    });
    
    currentStart = new Date(currentStart.getTime() + (stepSize * 24 * 60 * 60 * 1000));
    periodId++;
  }
  
  return periods;
}

async function fetchHistoricalData(symbols: string[], startDate: string, endDate: string) {
  const historicalData: any = {};
  
  for (const symbol of symbols) {
    try {
      const { data, error } = await supabase
        .from(`ohlcv_${symbol.toLowerCase()}_usdt_1m`)
        .select('close_price, open_time')
        .gte('open_time', startDate)
        .lte('open_time', endDate)
        .order('open_time', { ascending: true });

      if (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        historicalData[symbol] = (data as any[]).map(row => ({
          price: parseFloat(row.close_price),
          timestamp: row.open_time
        }));
      }
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }

  return historicalData;
}

async function optimizeParameters(
  historicalData: any,
  baseParams: any,
  method: string
) {
  // Simulate parameter optimization
  const optimizedParams = { ...baseParams };
  
  // Add some randomness to simulate optimization
  Object.keys(optimizedParams).forEach(key => {
    if (typeof optimizedParams[key] === 'number') {
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      optimizedParams[key] = optimizedParams[key] * (1 + variation);
    }
  });
  
  return optimizedParams;
}

async function testStrategy(historicalData: any, params: any) {
  // Simulate strategy testing
  const totalReturn = (Math.random() * 40 - 10); // -10% to +30%
  const sharpeRatio = Math.random() * 2 + 0.5;
  const maxDrawdown = -(Math.random() * 20 + 5);
  const volatility = Math.random() * 15 + 10;
  const winRate = Math.random() * 40 + 50;
  const profitFactor = Math.random() * 2 + 0.8;
  
  return {
    total_return: totalReturn,
    sharpe_ratio: sharpeRatio,
    max_drawdown: maxDrawdown,
    volatility: volatility,
    win_rate: winRate,
    profit_factor: profitFactor
  };
}

function calculateParameterDrift(currentParams: any, previousParams: any): number {
  if (!previousParams) return 0;
  
  let totalDrift = 0;
  let paramCount = 0;
  
  Object.keys(currentParams).forEach(key => {
    if (typeof currentParams[key] === 'number' && typeof previousParams[key] === 'number') {
      const drift = Math.abs(currentParams[key] - previousParams[key]) / Math.abs(previousParams[key]);
      totalDrift += drift;
      paramCount++;
    }
  });
  
  return paramCount > 0 ? totalDrift / paramCount : 0;
}

function calculateTotalReturn(data: any): number {
  // Simulate total return calculation
  return (Math.random() * 40 - 10);
}

function calculateSharpeRatio(data: any): number {
  // Simulate Sharpe ratio calculation
  return Math.random() * 2 + 0.5;
}

function calculateMaxDrawdown(data: any): number {
  // Simulate max drawdown calculation
  return -(Math.random() * 20 + 5);
}

function calculateVolatility(data: any): number {
  // Simulate volatility calculation
  return Math.random() * 15 + 10;
}

function calculateOverallMetrics(results: any[]) {
  const completedResults = results.filter(r => r.status === 'completed');
  
  if (completedResults.length === 0) {
    return {
      total_periods: 0,
      completed_periods: 0,
      average_in_sample_return: 0,
      average_out_sample_return: 0,
      average_stability: 0,
      consistency_score: 0,
      overfitting_risk: 0,
      recommendation: 'no_data'
    };
  }

  const avgInSampleReturn = completedResults.reduce((sum, r) => 
    sum + r.in_sample_metrics.total_return, 0) / completedResults.length;
  
  const avgOutSampleReturn = completedResults.reduce((sum, r) => 
    sum + r.out_sample_metrics.total_return, 0) / completedResults.length;
  
  const avgStability = completedResults.reduce((sum, r) => 
    sum + r.stability, 0) / completedResults.length;
  
  // Calculate consistency score
  const returnConsistency = Math.abs(avgInSampleReturn - avgOutSampleReturn) / Math.abs(avgInSampleReturn);
  const consistencyScore = Math.max(0, 1 - returnConsistency);
  
  // Calculate overfitting risk
  const overfittingRisk = returnConsistency;
  
  // Generate recommendation
  let recommendation = 'poor';
  if (avgStability > 0.8 && avgOutSampleReturn > 10 && consistencyScore > 0.8) {
    recommendation = 'excellent';
  } else if (avgStability > 0.6 && avgOutSampleReturn > 5 && consistencyScore > 0.6) {
    recommendation = 'good';
  } else if (avgStability > 0.4 && avgOutSampleReturn > 0 && consistencyScore > 0.4) {
    recommendation = 'fair';
  }

  return {
    total_periods: results.length,
    completed_periods: completedResults.length,
    average_in_sample_return: avgInSampleReturn,
    average_out_sample_return: avgOutSampleReturn,
    average_stability: avgStability,
    consistency_score: consistencyScore,
    overfitting_risk: overfittingRisk,
    recommendation: recommendation
  };
}

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