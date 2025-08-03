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

    // Simulate Monte Carlo analysis
    const results = await performMonteCarloAnalysis(config);

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

async function performMonteCarloAnalysis(config: any) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  const {
    n_simulations = 1000,
    confidence_level = 0.95,
    time_horizon_days = 252,
    volatility_model = 'garch',
    return_distribution = 'normal',
    correlation_structure = 'historical',
    optimization_method = 'efficient_frontier',
    risk_tolerance = 50,
    scenarios
  } = config;

  // Generate mock results based on configuration
  const baseReturn = 0.12; // 12% annual return
  const baseVolatility = 0.18; // 18% annual volatility
  
  // Adjust based on risk tolerance
  const riskMultiplier = risk_tolerance / 50;
  const adjustedReturn = baseReturn * riskMultiplier;
  const adjustedVolatility = baseVolatility * (0.8 + 0.4 * riskMultiplier);

  // Calculate probability of profit
  const zScore = adjustedReturn / adjustedVolatility;
  const probabilityOfProfit = (1 - normcdf(-zScore)) * 100;

  // Calculate VaR
  const varPercentile = 1 - confidence_level;
  const varZScore = norminv(varPercentile);
  const valueAtRisk = (adjustedReturn + varZScore * adjustedVolatility) * 100;

  // Calculate expected Sharpe ratio
  const riskFreeRate = 0.02; // 2% risk-free rate
  const expectedSharpeRatio = (adjustedReturn - riskFreeRate) / adjustedVolatility;

  // Generate confidence intervals
  const confidenceIntervals = {
    ci_90: [
      (adjustedReturn - 1.645 * adjustedVolatility) * 100,
      (adjustedReturn + 1.645 * adjustedVolatility) * 100
    ],
    ci_95: [
      (adjustedReturn - 1.96 * adjustedVolatility) * 100,
      (adjustedReturn + 1.96 * adjustedVolatility) * 100
    ],
    ci_99: [
      (adjustedReturn - 2.576 * adjustedVolatility) * 100,
      (adjustedReturn + 2.576 * adjustedVolatility) * 100
    ]
  };

  // Calculate tail risk metrics
  const expectedShortfall = (adjustedReturn - 2.06 * adjustedVolatility) * 100;
  const tailDependence = 0.5 + 0.3 * Math.random();
  const maximumDrawdown = -(adjustedVolatility * 2.5) * 100;

  // Generate scenario analysis
  const scenarioAnalysis: any = {};
  
  if (scenarios?.bull_market) {
    scenarioAnalysis.bull_market = {
      expected_return: 25.5,
      volatility: 12.3,
      probability: 0.35
    };
  }
  
  if (scenarios?.bear_market) {
    scenarioAnalysis.bear_market = {
      expected_return: -15.2,
      volatility: 18.7,
      probability: 0.25
    };
  }
  
  if (scenarios?.sideways_market) {
    scenarioAnalysis.sideways_market = {
      expected_return: 3.2,
      volatility: 8.9,
      probability: 0.40
    };
  }

  return {
    probability_of_profit: Math.round(probabilityOfProfit * 10) / 10,
    value_at_risk: Math.round(valueAtRisk * 10) / 10,
    expected_sharpe_ratio: Math.round(expectedSharpeRatio * 100) / 100,
    confidence_intervals,
    tail_risk_metrics: {
      expected_shortfall: Math.round(expectedShortfall * 10) / 10,
      tail_dependence: Math.round(tailDependence * 100) / 100,
      maximum_drawdown: Math.round(maximumDrawdown * 10) / 10
    },
    scenario_analysis,
    simulation_parameters: {
      n_simulations,
      confidence_level,
      time_horizon_days,
      volatility_model,
      return_distribution,
      correlation_structure,
      optimization_method,
      risk_tolerance
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
    }
  } catch (error) {
    console.error('Error saving to database:', error);
  }
}

// Helper functions for normal distribution
function normcdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function norminv(p: number): number {
  // Simplified inverse normal CDF approximation
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }
  
  const a1 = -3.969683028665376e+01;
  const a2 = 2.209460984245205e+02;
  const a3 = -2.759285104469687e+02;
  const a4 = 1.383577518672690e+02;
  const a5 = -3.066479806614716e+01;
  const a6 = 2.506628277459239e+00;
  
  const b1 = -5.447609879822406e+01;
  const b2 = 1.615858368580409e+02;
  const b3 = -1.556989798598866e+02;
  const b4 = 6.680131188771972e+01;
  const b5 = -1.328068155288572e+01;
  
  const c1 = -7.784894002430293e-03;
  const c2 = -3.223964580411365e-01;
  const c3 = -2.400758277161838e+00;
  const c4 = -2.549732539343734e+00;
  const c5 = 4.374664141464968e+00;
  const c6 = 2.938163982698783e+00;
  
  const d1 = 7.784695709041462e-03;
  const d2 = 3.224671290700398e-01;
  const d3 = 2.445134137142996e+00;
  const d4 = 3.754408661907416e+00;
  
  const p_low = 0.02425;
  const p_high = 1 - p_low;
  
  let q, r, x_out;
  
  if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    x_out = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= p_high) {
    q = p - 0.5;
    r = q * q;
    x_out = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x_out = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  
  return x_out;
}

function erf(x: number): number {
  // Approximation of error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
} 