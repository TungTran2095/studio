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

    // Perform real Monte Carlo analysis using actual market data
    const results = await performRealMonteCarloAnalysis(config);

    // Save results to database
    await saveMonteCarloResults(experiment_id, config, results);

    return NextResponse.json({
      success: true,
      results,
      experiment_id
    });

  } catch (error) {
    console.error('Monte Carlo analysis error:', error);
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
        data_points: Object.values(historicalData).reduce((sum, data) => sum + data.length, 0)
      }
    },
    simulation_results: {
      total_simulations: simulationResults.length,
      sample_results: simulationResults.slice(0, 10) // Return first 10 for reference
    }
  };
}

async function fetchHistoricalData(symbols: string[], startDate?: string, endDate?: string) {
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
    
    // Calculate daily returns
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i] - prices[i-1]) / prices[i-1];
      returns.push(dailyReturn);
    }
    
    // Calculate statistics
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Annualize (assuming 1-minute data, 1440 minutes per day, 252 trading days)
    const annualizedReturn = meanReturn * 1440 * 252;
    const annualizedVolatility = volatility * Math.sqrt(1440 * 252);
    
    stats[symbol] = {
      mean_return: annualizedReturn,
      volatility: annualizedVolatility,
      total_returns: returns.length,
      price_range: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        current: prices[prices.length - 1]
      },
      returns_distribution: {
        mean: meanReturn,
        std: volatility,
        skewness: calculateSkewness(returns),
        kurtosis: calculateKurtosis(returns)
      }
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
  const symbols = Object.keys(marketStats);
  
  console.log(`🎲 Running ${nSimulations} Monte Carlo simulations...`);
  
  for (let sim = 0; sim < nSimulations; sim++) {
    let portfolioValue = initialCapital;
    const dailyValues = [portfolioValue];
    
    // Simulate daily returns for the time horizon
    for (let day = 0; day < timeHorizonDays; day++) {
      let dailyReturn = 0;
      
      // Calculate portfolio return based on market statistics
      for (const symbol of symbols) {
        const stats = marketStats[symbol];
        
        // Generate random return based on normal distribution
        const randomReturn = generateNormalRandom(stats.mean_return, stats.volatility);
        dailyReturn += randomReturn / symbols.length; // Equal weight for simplicity
      }
      
      // Update portfolio value
      portfolioValue *= (1 + dailyReturn);
      dailyValues.push(portfolioValue);
    }
    
    // Calculate simulation metrics
    const totalReturn = (portfolioValue - initialCapital) / initialCapital;
    const maxDrawdown = calculateMaxDrawdown(dailyValues);
    const volatility = calculateVolatility(dailyValues);
    const sharpeRatio = (totalReturn - 0.02) / volatility; // Assuming 2% risk-free rate
    
    results.push({
      simulation_id: sim,
      final_value: portfolioValue,
      total_return: totalReturn,
      max_drawdown: maxDrawdown,
      volatility: volatility,
      sharpe_ratio: sharpeRatio,
      equity_curve: dailyValues.slice(0, 50) // Store first 50 points for visualization
    });
    
    // Progress update every 100 simulations
    if ((sim + 1) % 100 === 0) {
      console.log(`📈 Completed ${sim + 1}/${nSimulations} simulations`);
    }
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
  
  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
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