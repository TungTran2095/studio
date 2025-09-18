import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

// Khởi tạo Supabase client
// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

interface PatchBacktestConfig {
  experimentId: string;
  config: {
    // Flat structure (legacy)
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    symbol?: string;
    timeframe?: string;
    initialCapital?: number;
    positionSize?: number;
    stopLoss?: number;
    takeProfit?: number;
    strategyType?: string;
    // Strategy parameters
    fastPeriod?: number;
    slowPeriod?: number;
    rsiPeriod?: number;
    overbought?: number;
    oversold?: number;
    fastEMA?: number;
    slowEMA?: number;
    signalPeriod?: number;
    period?: number;
    stdDev?: number;
    bbPeriod?: number;
    bbStdDev?: number;
    multiplier?: number;
    channelPeriod?: number;
    maker_fee?: number;
    taker_fee?: number;
    patchDays?: number;
    
    // Nested structure (new)
    trading?: {
      symbol: string;
      timeframe: string;
      startDate: string;
      endDate: string;
      initialCapital: number;
      positionSize: number;
    };
    riskManagement?: {
      stopLoss: number;
      takeProfit: number;
      maxPositions?: number;
      maxDrawdown?: number;
      trailingStop?: boolean;
      trailingStopDistance?: number;
      prioritizeStoploss?: boolean;
      useTakeProfit?: boolean;
    };
    strategy?: {
      type: string;
      parameters?: {
        fastPeriod?: number;
        slowPeriod?: number;
        rsiPeriod?: number;
        overbought?: number;
        oversold?: number;
        fastEMA?: number;
        slowEMA?: number;
        signalPeriod?: number;
        period?: number;
        stdDev?: number;
        channelPeriod?: number;
        multiplier?: number;
      };
    };
    transaction_costs?: {
      maker_fee: number;
      taker_fee: number;
    };
    usePatchBacktest?: boolean;
  };
}

interface PatchResult {
  patchId: number;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  trades: any[];
  metrics: {
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

export async function POST(req: Request): Promise<Response> {
  let experimentId: string = '';
  
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

    const { experimentId: expId, config }: PatchBacktestConfig = await req.json();
    experimentId = expId;
    
    console.log('🚀 Starting patch-based backtest with Python strategy:', {
      experimentId,
      strategy: config.strategy?.type || config.strategyType,
      patchDays: config.patchDays || 30
    });

    // Xử lý cấu trúc config - có thể nested hoặc flat
    let processedConfig = config;
    
    // Nếu config có cấu trúc nested (từ frontend mới)
    if (config.trading) {
      processedConfig = {
        ...config,
        symbol: config.trading.symbol,
        startDate: config.trading.startDate,
        endDate: config.trading.endDate,
        timeframe: config.trading.timeframe,
        initialCapital: config.trading.initialCapital,
        positionSize: config.trading.positionSize,
        stopLoss: config.riskManagement?.stopLoss,
        takeProfit: config.riskManagement?.takeProfit,
        strategyType: config.strategy?.type,
        // Strategy parameters
        fastPeriod: config.strategy?.parameters?.fastPeriod,
        slowPeriod: config.strategy?.parameters?.slowPeriod,
        rsiPeriod: config.strategy?.parameters?.rsiPeriod || config.strategy?.parameters?.period,
        overbought: config.strategy?.parameters?.overbought,
        oversold: config.strategy?.parameters?.oversold,
        fastEMA: config.strategy?.parameters?.fastEMA,
        slowEMA: config.strategy?.parameters?.slowEMA,
        signalPeriod: config.strategy?.parameters?.signalPeriod,
        bbPeriod: config.strategy?.parameters?.period,
        bbStdDev: config.strategy?.parameters?.stdDev,
        channelPeriod: config.strategy?.parameters?.channelPeriod,
        multiplier: config.strategy?.parameters?.multiplier,
        maker_fee: config.transaction_costs?.maker_fee || 0.1,
        taker_fee: config.transaction_costs?.taker_fee || 0.1,
        patchDays: config.patchDays || 30
      };
    }
    
    console.log('🔧 Processed config for Python script:', {
      symbol: processedConfig.symbol,
      startDate: processedConfig.startDate,
      endDate: processedConfig.endDate,
      strategyType: processedConfig.strategyType,
      initialCapital: processedConfig.initialCapital,
      patchDays: processedConfig.patchDays
    });

    // Validation
    if (!processedConfig.startDate || !processedConfig.endDate) {
      return NextResponse.json(
        { error: 'startDate và endDate là bắt buộc', details: 'Missing required dates' },
        { status: 400 }
      );
    }

    if (!processedConfig.initialCapital || processedConfig.initialCapital <= 0) {
      processedConfig.initialCapital = 10000; // Default capital
    }

    // Cập nhật trạng thái experiment thành 'running'
    const { error: updateError } = await supabase
      .from('research_experiments')
      .update({ status: 'running' })
      .eq('id', experimentId);

    if (updateError) {
      console.error('❌ Error updating experiment status:', updateError);
      // Continue anyway, don't fail the entire process
    }

    // Gọi Python script cho patch backtest
    const pythonScript = path.join(process.cwd(), 'scripts', 'backtest_strategies', 'patch_backtest_runner.py');
    
    return new Promise<Response>((resolve) => {
      const pythonProcess = spawn('python', [
        pythonScript,
        '--experiment_id', experimentId,
        '--config', JSON.stringify(processedConfig),
        '--supabase_url', process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        '--supabase_key', process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      ], {
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
        const output = data.toString('utf8');
        scriptOutput += output;
      });

      // Handle stderr
      pythonProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString('utf8');
        console.error(`Patch Backtest Python error: ${errorOutput}`);
        scriptError += errorOutput;
      });

      // Handle process completion
      pythonProcess.on('close', async (code) => {
        console.log(`Patch Backtest Python script exited with code: ${code}`);
        
        // Small delay to ensure all data is received
        await new Promise(resolve => setTimeout(resolve, 100));

        // Parse JSON from complete output
        try {
          if (scriptOutput.trim()) {
            // Clean up the output - remove any non-JSON content
            let jsonContent = scriptOutput.trim();
            
            // Find the start and end of JSON object
            const jsonStart = jsonContent.indexOf('{');
            const jsonEnd = jsonContent.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
              
              try {
                const parsed = JSON.parse(jsonContent);
                if (parsed && parsed.success !== undefined) {
                  results = parsed;
                }
              } catch (cleanParseError) {
                // Fallback to original method
                try {
                  const fallbackParsed = JSON.parse(jsonContent);
                  if (fallbackParsed && fallbackParsed.success !== undefined) {
                    results = fallbackParsed;
                  }
                } catch (fullParseError) {
                  console.error('Failed to parse JSON output. Error:', (fullParseError as Error).message);
                  console.error('Script output length:', scriptOutput.length);
                  console.error('Script output sample:', scriptOutput.substring(0, 200) + '...');
                }
              }
            } else {
              console.error('Could not find valid JSON boundaries in output');
              console.error('Script output length:', scriptOutput.length);
              console.error('Script output sample:', scriptOutput.substring(0, 200) + '...');
            }
          } else {
            console.error('Script output is empty');
          }
        } catch (e) {
          console.error('Error parsing JSON from script output:', e);
        }

        try {
          if (code === 0 && results && results.success) {
            console.log('🎯 Patch-based backtest completed successfully:', {
              totalPatches: results.patches?.length || 0,
              finalCapital: results.results?.finalCapital,
              totalReturn: results.results?.totalReturn,
              totalTrades: results.results?.totalTrades
            });

            // Debug: Log dữ liệu từ Python script
            console.log('🔍 Debug Python script output:');
            console.log('  - results.trades type:', typeof results.trades);
            console.log('  - results.trades is array:', Array.isArray(results.trades));
            console.log('  - results.trades length:', results.trades?.length || 0);
            console.log('  - results.indicators type:', typeof results.indicators);
            console.log('  - results.indicators keys:', results.indicators ? Object.keys(results.indicators) : 'No data');

            // Lưu kết quả vào database
            await savePatchBacktestResults(
              experimentId,
              results.results,
              results.patches || [],
              results.trades || [], // Sửa từ allTrades thành trades
              results.indicators || {}
            );

            resolve(NextResponse.json({
              success: true,
              message: 'Patch-based backtest completed successfully',
              results: results.results,
              patches: results.patches,
              totalPatches: results.patches?.length || 0
            }));
          } else {
            console.error('❌ Patch backtest failed:', {
              exitCode: code,
              scriptError,
              results
            });

            // Cập nhật trạng thái lỗi
            await supabase
              .from('research_experiments')
              .update({
                status: 'failed',
                error: scriptError || 'Python script failed',
                completed_at: new Date().toISOString()
              })
              .eq('id', experimentId);

            resolve(NextResponse.json(
              { 
                error: 'Patch backtest failed', 
                details: scriptError || 'Python script execution failed',
                exitCode: code
              },
              { status: 500 }
            ));
          }
        } catch (error) {
          console.error('❌ Error processing patch backtest results:', error);
          
          // Cập nhật trạng thái lỗi
          await supabase
            .from('research_experiments')
            .update({
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('id', experimentId);

          resolve(NextResponse.json(
            { error: 'Failed to process backtest results', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          ));
        }
      });

      // Handle process errors
      pythonProcess.on('error', async (error) => {
        console.error('❌ Python process error:', error);
        
        // Cập nhật trạng thái lỗi
        await supabase
          .from('research_experiments')
          .update({
            status: 'failed',
            error: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', experimentId);

        resolve(NextResponse.json(
          { error: 'Failed to start Python process', details: error.message },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error('❌ Patch backtest error:', error);
    
    // Cập nhật trạng thái lỗi nếu có experimentId
    if (experimentId && supabase) {
      await supabase
        .from('research_experiments')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', experimentId);
    }

    return NextResponse.json(
      { error: 'Patch backtest failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function savePatchBacktestResults(experimentId: string, totalResults: any, patches: PatchResult[], allTrades: any[], indicators: any) {
  try {
    if (!supabase) {
      console.error('❌ Supabase client not available for saving results');
      return;
    }

    // Debug: Log dữ liệu trades
    console.log('🔍 Debug trades data:');
    console.log('  - allTrades type:', typeof allTrades);
    console.log('  - allTrades is array:', Array.isArray(allTrades));
    console.log('  - allTrades length:', allTrades?.length || 0);
    console.log('  - allTrades sample:', allTrades?.slice(0, 2) || 'No data');

    // Debug: Log dữ liệu indicators
    console.log('🔍 Debug indicators data:');
    console.log('  - indicators type:', typeof indicators);
    console.log('  - indicators keys:', indicators ? Object.keys(indicators) : 'No data');

    // Tạo cấu trúc results phẳng như yêu cầu với cả camelCase và snake_case
    const performanceMetrics = {
      avgWin: totalResults.avgWin || totalResults.avg_win,
      avgLoss: totalResults.avgLoss || totalResults.avg_loss,
      avg_win: totalResults.avgWin || totalResults.avg_win,
      winRate: totalResults.winRate || totalResults.win_rate,
      avg_loss: totalResults.avgLoss || totalResults.avg_loss,
      win_rate: totalResults.winRate || totalResults.win_rate,
      maxDrawdown: totalResults.maxDrawdown || totalResults.max_drawdown,
      patch_based: true,
      patch_count: patches.length,
      sharpeRatio: totalResults.sharpeRatio || totalResults.sharpe_ratio,
      totalReturn: totalResults.totalReturn || totalResults.total_return,
      totalTrades: totalResults.totalTrades || totalResults.total_trades,
      completed_at: new Date().toISOString(),
      finalCapital: totalResults.finalCapital || totalResults.final_capital,
      max_drawdown: totalResults.maxDrawdown || totalResults.max_drawdown,
      sharpe_ratio: totalResults.sharpeRatio || totalResults.sharpe_ratio,
      total_return: totalResults.totalReturn || totalResults.total_return,
      total_trades: totalResults.totalTrades || totalResults.total_trades,
      final_capital: totalResults.finalCapital || totalResults.final_capital,
      initialCapital: totalResults.initialCapital
    };

    // Chuẩn bị dữ liệu update
    const updateData: {
      status: string;
      results: any;
      completed_at: string;
      trades?: any[];
      indicators?: any;
    } = {
      status: 'completed',
      results: performanceMetrics,
      completed_at: new Date().toISOString()
    };

    // Chỉ thêm trades nếu có dữ liệu
    if (allTrades && Array.isArray(allTrades) && allTrades.length > 0) {
      updateData.trades = allTrades;
      console.log('✅ Adding trades data to update');
    } else {
      console.log('⚠️ No trades data to save');
    }

    // Chỉ thêm indicators nếu có dữ liệu
    if (indicators && Object.keys(indicators).length > 0) {
      updateData.indicators = indicators;
      console.log('✅ Adding indicators data to update');
    } else {
      console.log('⚠️ No indicators data to save');
    }

    console.log('🔍 Final update data:', {
      status: updateData.status,
      hasTrades: !!updateData.trades,
      hasIndicators: !!updateData.indicators,
      hasResults: !!updateData.results
    });

    const { error } = await supabase
      .from('research_experiments')
      .update(updateData)
      .eq('id', experimentId);

    if (error) {
      console.error('❌ Error saving patch backtest results:', error);
    } else {
      console.log('✅ Patch backtest results saved successfully');
    }
  } catch (error) {
    console.error('❌ Error in savePatchBacktestResults:', error);
  }
}