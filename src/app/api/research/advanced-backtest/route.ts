import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      experiment_id, 
      config,
      use_sample_config = false 
    } = body;

    // Validate required parameters
    if (!experiment_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: experiment_id' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Advanced Backtest API...', {
      experiment_id,
      strategy_type: config?.strategy?.type,
      use_sample_config
    });

    // Run advanced backtest script
    const pythonScript = path.join(process.cwd(), 'scripts', 'backtest_strategies', 'advanced_backtest_runner.py');
    
    const args = [
      pythonScript,
      '--experiment_id', experiment_id,
      '--config', JSON.stringify(config)
    ];

    if (use_sample_config) {
      args.push('--sample');
    }

    const pythonProcess = spawn('python', args, {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8'
      }
    });
    
    let scriptOutput = '';
    let scriptError = '';
    let results: any = null;

    // Handle stdout
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Advanced Backtest output: ${output}`);
      scriptOutput += output;
      
      // Try to parse JSON results from output
      try {
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
            const parsed = JSON.parse(line.trim());
            if (parsed && !parsed.error) {
              results = parsed;
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    // Handle stderr
    pythonProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error(`Advanced Backtest error: ${errorOutput}`);
      scriptError += errorOutput;
    });

    // Wait for process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });

    // If we couldn't parse results from stdout, try to extract from script output
    if (!results) {
      try {
        // Look for JSON in the output
        const jsonMatch = scriptOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          results = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse results from script output:', e);
      }
    }

    if (!results) {
      return NextResponse.json(
        { 
          error: 'Failed to get results from advanced backtest',
          script_output: scriptOutput,
          script_error: scriptError
        },
        { status: 500 }
      );
    }

    // Check if there was an error in the results
    if (results.error) {
      return NextResponse.json(
        { error: results.error },
        { status: 500 }
      );
    }

    console.log('✅ Advanced Backtest completed successfully');

    return NextResponse.json({
      success: true,
      experiment_id,
      results,
      message: 'Advanced backtest completed successfully'
    });

  } catch (error) {
    console.error('Advanced Backtest API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return sample advanced configuration
    const sampleConfig = {
      "trading": {
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "startDate": "2023-01-01",
        "endDate": "2023-12-31",
        "initialCapital": 10000
      },
      "strategy": {
        "type": "advanced_rsi",
        "parameters": {
          "period": 14,
          "overbought": 70,
          "oversold": 30
        }
      },
      "walk_forward": {
        "train_period_days": 252,
        "test_period_days": 63,
        "step_size_days": 21
      },
      "monte_carlo": {
        "n_simulations": 1000,
        "confidence_level": 0.95,
        "time_horizon_days": 252
      },
      "transaction_costs": {
        "commission_rate": 0.001,
        "minimum_commission": 1.0,
        "maker_fee": 0.0005,
        "taker_fee": 0.001
      },
      "slippage": {
        "base_slippage": 0.0001,
        "volume_impact": 0.0002,
        "volatility_impact": 0.5
      },
      "enhanced_features": {
        "position_sizing": "kelly",
        "multi_timeframe": true,
        "dynamic_levels": true,
        "divergence_detection": true,
        "trend_confirmation": true,
        "volatility_adjustment": true
      }
    };

    return NextResponse.json({
      sample_config: sampleConfig,
      available_strategies: [
        'advanced_rsi',
        'enhanced_strategy',
        'ma_crossover',
        'rsi',
        'macd',
        'bollinger_bands',
        'breakout'
      ],
      features: {
        'walk_forward_analysis': 'Chia dữ liệu thành nhiều period training/testing',
        'monte_carlo_simulation': 'Mô phỏng nhiều scenarios để đánh giá rủi ro',
        'transaction_costs': 'Modeling phí giao dịch thực tế',
        'slippage_modeling': 'Mô phỏng slippage thị trường',
        'position_sizing': 'Kelly Criterion, Risk Parity',
        'multi_timeframe': 'Phân tích đa khung thời gian',
        'dynamic_levels': 'Mức overbought/oversold động',
        'divergence_detection': 'Phát hiện divergence RSI',
        'trend_confirmation': 'Xác nhận xu hướng',
        'volatility_adjustment': 'Điều chỉnh theo biến động'
      }
    });

  } catch (error) {
    console.error('Advanced Backtest GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 