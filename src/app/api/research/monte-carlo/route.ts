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

    const body = await request.json();
    const { experimentId, config } = body;

    console.log('🎲 [Monte Carlo] Starting analysis:', {
      experimentId,
      config: config ? 'provided' : 'not provided'
    });

    try {
      // Perform Monte Carlo analysis
      const results = await performRealMonteCarloAnalysis(config);
      
      // Save results to database
      await saveMonteCarloResults(experimentId, config, results);

      return NextResponse.json({
        success: true,
        message: 'Monte Carlo analysis completed successfully',
        results
      });
    } catch (error) {
      console.error('❌ [Monte Carlo] Analysis error:', error);
      return NextResponse.json(
        { error: 'Monte Carlo analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [Monte Carlo] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function performRealMonteCarloAnalysis(config: any) {
  console.log('🔄 Starting real Monte Carlo analysis with config:', config);
  
  const {
    n_simulations = 1000,
    confidence_level = 0.95,
    time_horizon_days = 252,
    symbols = ['BTC', 'ETH'],
    start_date,
    end_date,
    initial_capital = 10000
  } = config;

  // Fetch real historical data from Supabase
  const historicalData = await fetchHistoricalData(symbols, start_date, end_date);
  
  if (!historicalData || Object.keys(historicalData).length === 0) {
    throw new Error('No historical data available for Monte Carlo analysis');
  }

  console.log(`📊 Fetched ${Object.keys(historicalData).length} symbols with historical data`);

  // Calculate real returns and volatility from historical data
  const marketStats = calculateMarketStatistics(historicalData);
  
  // Run Monte Carlo simulations using real market parameters
  const simulationResults = await runMonteCarloSimulations(
    marketStats,
    n_simulations,
    time_horizon_days,
    initial_capital
  );

  // Calculate risk metrics from simulation results
  const riskMetrics = calculateRiskMetrics(simulationResults, confidence_level);

  return {
    ...riskMetrics,
    market_statistics: marketStats,
    simulation_parameters: {
      n_simulations,
      confidence_level,
      time_horizon_days,
      symbols,
      initial_capital,
      data_period: {
        start_date,
        end_date,
        data_points: Object.values(historicalData).reduce((sum: number, data) => sum + (data as any[]).length, 0)
      }
    },
    simulation_results: {
      total_simulations: simulationResults.length,
      sample_results: simulationResults.slice(0, 10) // Return first 10 for reference
    }
  };
}

async function fetchHistoricalData(symbols: string[], startDate?: string, endDate?: string) {
  if (!supabase) {
    console.error('Supabase client not available for fetching historical data');
    return {};
  }

  const historicalData: any = {};
  
  for (const symbol of symbols) {
    try {
      let query = supabase
        .from(`ohlcv_${symbol.toLowerCase()}_usdt_1m`)
        .select('close_price, open_time')
        .order('open_time', { ascending: true });

      if (startDate) {
        query = query.gte('open_time', startDate);
      }
      if (endDate) {
        query = query.lte('open_time', endDate);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        historicalData[symbol] = (data as any[]).map(row => ({
          price: parseFloat(row.close_price),
          timestamp: row.open_time
        }));
        console.log(`✅ Fetched ${data.length} data points for ${symbol}`);
      }
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }
  
  return historicalData;
}

function calculateMarketStatistics(historicalData: any) {
  const stats: any = {};
  
  for (const [symbol, data] of Object.entries(historicalData)) {
    const prices = (data as any[]).map(d => d.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    
    stats[symbol] = {
      mean_return: mean,
      volatility: std,
      skewness: calculateSkewness(returns),
      kurtosis: calculateKurtosis(returns),
      data_points: prices.length
    };
  }
  
  return stats;
}

function calculateSkewness(returns: number[]): number {
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  
  const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 3), 0) / returns.length;
  return skewness;
}

function calculateKurtosis(returns: number[]): number {
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  
  const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 4), 0) / returns.length;
  return kurtosis;
}

async function runMonteCarloSimulations(
  marketStats: any,
  nSimulations: number,
  timeHorizonDays: number,
  initialCapital: number
) {
  const results = [];
  
  for (let sim = 0; sim < nSimulations; sim++) {
    let capital = initialCapital;
    const dailyValues = [capital];
    
    for (let day = 1; day <= timeHorizonDays; day++) {
      // Generate daily return using market statistics
      const symbols = Object.keys(marketStats);
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const stats = marketStats[randomSymbol];
      
      // Generate random return using normal distribution
      const dailyReturn = generateNormalRandom(stats.mean_return, stats.volatility);
      
      capital *= (1 + dailyReturn);
      dailyValues.push(capital);
    }
    
    const finalValue = dailyValues[dailyValues.length - 1];
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    const maxDrawdown = calculateMaxDrawdown(dailyValues);
    
    results.push({
      simulation_id: sim,
      final_value: finalValue,
      total_return: totalReturn,
      max_drawdown: maxDrawdown,
      daily_values: dailyValues
    });
  }
  
  return results;
}

function generateNormalRandom(mean: number, std: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z0;
}

function calculateMaxDrawdown(values: number[]): number {
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
    } else {
      const drawdown = (peak - values[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  return maxDrawdown;
}

function calculateVolatility(values: number[]): number {
  const returns = [];
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i-1]) / values[i-1]);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function calculateRiskMetrics(simulationResults: any[], confidenceLevel: number) {
  const returns = simulationResults.map(r => r.total_return);
  const finalValues = simulationResults.map(r => r.final_value);
  const maxDrawdowns = simulationResults.map(r => r.max_drawdown);
  
  // Sort for percentile calculations
  returns.sort((a, b) => a - b);
  finalValues.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);
  
  const n = returns.length;
  const varIndex = Math.floor((1 - confidenceLevel) * n);
  const esIndex = Math.floor((1 - confidenceLevel) * n * 0.5); // Expected shortfall
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / n;
  const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / n);
  
  const valueAtRisk = -returns[varIndex];
  const expectedShortfall = -returns.slice(0, esIndex).reduce((sum, r) => sum + r, 0) / esIndex;
  
  const probabilityOfLoss = returns.filter(r => r < 0).length / n;
  const probabilityOfProfit = 1 - probabilityOfLoss;
  
  return {
    probability_of_profit: Math.round(probabilityOfProfit * 1000) / 10,
    value_at_risk: Math.round(valueAtRisk * 1000) / 10,
    expected_sharpe_ratio: Math.round(((meanReturn - 0.02) / stdReturn) * 100) / 100,
    confidence_intervals: {
      ci_90: [
        Math.round((meanReturn - 1.645 * stdReturn) * 1000) / 10,
        Math.round((meanReturn + 1.645 * stdReturn) * 1000) / 10
      ],
      ci_95: [
        Math.round((meanReturn - 1.96 * stdReturn) * 1000) / 10,
        Math.round((meanReturn + 1.96 * stdReturn) * 1000) / 10
      ],
      ci_99: [
        Math.round((meanReturn - 2.576 * stdReturn) * 1000) / 10,
        Math.round((meanReturn + 2.576 * stdReturn) * 1000) / 10
      ]
    },
    tail_risk_metrics: {
      expected_shortfall: Math.round(expectedShortfall * 1000) / 10,
      maximum_drawdown: Math.round(Math.max(...maxDrawdowns) * 1000) / 10,
      worst_case_return: Math.round(Math.min(...returns) * 1000) / 10,
      best_case_return: Math.round(Math.max(...returns) * 1000) / 10
    },
    distribution_metrics: {
      mean_return: Math.round(meanReturn * 1000) / 10,
      std_return: Math.round(stdReturn * 1000) / 10,
      median_return: Math.round(returns[Math.floor(n/2)] * 1000) / 10,
      percentiles: {
        p5: Math.round(returns[Math.floor(0.05 * n)] * 1000) / 10,
        p25: Math.round(returns[Math.floor(0.25 * n)] * 1000) / 10,
        p50: Math.round(returns[Math.floor(0.50 * n)] * 1000) / 10,
        p75: Math.round(returns[Math.floor(0.75 * n)] * 1000) / 10,
        p95: Math.round(returns[Math.floor(0.95 * n)] * 1000) / 10
      }
    }
  };
}

async function saveMonteCarloResults(experimentId: string, config: any, results: any) {
  try {
    if (!supabase) {
      console.error('Supabase client not available for saving results');
      return;
    }

    const { data, error } = await supabase
      .from('research_experiments')
      .insert({
        experiment_id: experimentId,
        experiment_type: 'monte_carlo_analysis',
        config: config,
        results: results,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving Monte Carlo results:', error);
    } else {
      console.log('✅ Monte Carlo results saved to database');
    }
  } catch (error) {
    console.error('Error saving to database:', error);
  }
} 