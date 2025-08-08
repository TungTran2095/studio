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

export async function POST(req: Request) {
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

    
  let experimentId: string = '';
  
  try {
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
      .from('research_experiments')
      .update({ status: 'running' })
      .eq('id', experimentId);

    if (updateError) {
      console.error('❌ Error updating experiment status:', updateError);
      // Continue anyway, don't fail the entire process
    }

    // Gọi Python script cho patch backtest
    const pythonScript = path.join(process.cwd(), 'scripts', 'backtest_strategies', 'patch_backtest_runner.py');
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [
        pythonScript,
        '--experiment_id', experimentId,
        '--config', JSON.stringify(processedConfig),
        '--supabase_url', process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        '--supabase_key', process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      ]);

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
} catch (cleanParseError) {
                // Fallback to original method
                try {
                  if (parsed && parsed.success !== undefined) {
                    results = parsed;
} catch (fullParseError) {
                  console.error('Failed to parse JSON output. Error:', (fullParseError as Error).message);
                  console.error('Script output length:', scriptOutput.length);
                  console.error('Script output sample:', scriptOutput.substring(0, 200) + '...');
}
            } else {
              console.error('Could not find valid JSON boundaries in output');
              console.error('Script output length:', scriptOutput.length);
              console.error('Script output sample:', scriptOutput.substring(0, 200) + '...');
} else {
            console.error('Script output is empty');
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

            // Lưu kết quả vào database
            await savePatchBacktestResults(
              experimentId, 
              results.results, 
              results.patches || [], 
              results.trades || [], // All trades từ Python script
              results.indicators || {} // All indicators từ Python script
            );

            // Cập nhật trạng thái experiment thành 'completed'
            await supabase
              .from('research_experiments')
              .update({ status: 'completed' })
              .eq('id', experimentId);

            resolve(NextResponse.json({
              success: true,
              results: results.results,
              patches: results.patches,
              message: `Patch-based backtest completed with ${results.patches?.length || 0} patches using Python strategy engine`
            }));

          } else {
            console.error('❌ Patch backtest failed:', { code, results, scriptError });
            
            // Cập nhật trạng thái experiment thành 'failed'
            await supabase
              .from('research_experiments')
              .update({ status: 'failed' })
              .eq('id', experimentId);

            resolve(NextResponse.json(
              { 
                error: 'Patch backtest failed', 
                details: results?.error || scriptError || `Exit code: ${code}`,
                pythonOutput: scriptOutput 
              },
              { status: 500 }
            ));
} catch (dbError) {
          console.error('❌ Database error in patch backtest:', dbError);
          resolve(NextResponse.json(
            { error: 'Database error after patch backtest', details: (dbError as Error).message },
            { status: 500 }
          ));
});

      // Handle process errors
      pythonProcess.on('error', async (error) => {
        console.error('❌ Error spawning patch backtest Python process:', error);
        
        await supabase
          .from('research_experiments')
          .update({ status: 'failed' })
          .eq('id', experimentId);

        resolve(NextResponse.json(
          { error: 'Failed to run patch backtest Python script', details: error.message },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error('❌ Patch backtest error:', error);
    
    // Cập nhật trạng thái experiment thành 'failed'
    try {
      await supabase
        .from('research_experiments')
        .update({ status: 'failed' })
        .eq('id', experimentId);
    } catch (dbError) {
      console.error('❌ Failed to update experiment status:', dbError);
    }

    return NextResponse.json(
      { error: 'Failed to run patch-based backtest', details: (error as Error).message },
      { status: 500 }
    );
}

async function savePatchBacktestResults(experimentId: string, totalResults: any, patches: PatchResult[], allTrades: any[], indicators: any) {
  try {
    // Cập nhật experiment với kết quả patch-based backtest
      .from('research_experiments')
      .update({
        status: 'completed',
        results: {
          ...totalResults,
          patch_based: true,
          patch_count: patches.length,
          final_capital: totalResults.finalCapital,
          total_return: totalResults.totalReturn,
          win_rate: totalResults.winRate,
          total_trades: totalResults.totalTrades,
          avg_win: totalResults.avgWin,
          avg_loss: totalResults.avgLoss,
          max_drawdown: totalResults.maxDrawdown,
          sharpe_ratio: totalResults.sharpeRatio,
          completed_at: new Date().toISOString()
        },
        trades: allTrades, // Lưu trades vào cột trades
        indicators: indicators // Lưu indicators vào cột indicators
      })
      .eq('id', experimentId);

    if (error) {
      console.error('Error saving patch backtest results:', error);
    } else {
      console.log('✅ Patch backtest results saved to database');
      console.log(`📊 Saved ${allTrades.length} trades and indicators data`);
} catch (error) {
    console.error('Error saving results:', error);
}
}