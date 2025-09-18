import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: Request) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.log('⚠️ Supabase client not available - environment variables missing');
      return NextResponse.json(
        { 
          error: 'Database connection not available',
          details: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
          success: false
        },
        { status: 503 }
      );
    }

    const { experimentId, config } = await request.json();

    // Kiểm tra dữ liệu đầu vào
    if (!experimentId || !config) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Cập nhật trạng thái experiment thành 'running'
    const { error: updateError } = await supabase
      .from('research_experiments')
      .update({ status: 'running' })
      .eq('id', experimentId);

    if (updateError) {
      throw updateError;
    }

    // Chạy backtest script trong background
    const pythonScript = path.join(process.cwd(), 'scripts', 'backtest_strategies', 'backtest_runner.py');
    const pythonProcess = spawn('python', [
      pythonScript,
      '--experiment_id', experimentId,
      '--config', JSON.stringify(config)
    ], {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8'
      }
    });
    
    let scriptOutput = '';
    let scriptError = '';

    // Log output từ script (optional)
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Backtest output: ${output}`);
      scriptOutput += output;
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error(`Backtest error: ${errorOutput}`);
      scriptError += errorOutput;
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        // Parse từng dòng output, chỉ lấy dòng là JSON
        const lines = scriptOutput.trim().split('\n');
        let tradesObj = null;
        let summaryObj = null;
        let indicatorsObj = null;
        try {
          // Lọc ra các dòng JSON hợp lệ
          const jsonLines = lines.filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
          if (jsonLines.length >= 3) {
            tradesObj = JSON.parse(jsonLines[0]);
            summaryObj = JSON.parse(jsonLines[1]);
            indicatorsObj = JSON.parse(jsonLines[2]);
          } else if (jsonLines.length === 2) {
            const obj1 = JSON.parse(jsonLines[0]);
            const obj2 = JSON.parse(jsonLines[1]);
            if (obj1.trades) {
              tradesObj = obj1;
              summaryObj = obj2;
            } else if (obj2.trades) {
              tradesObj = obj2;
              summaryObj = obj1;
            } else {
              summaryObj = obj1;
              indicatorsObj = obj2;
            }
          } else if (jsonLines.length === 1) {
            const obj = JSON.parse(jsonLines[0]);
            if (obj.trades) tradesObj = obj;
            else if (obj.indicators) indicatorsObj = obj;
            else summaryObj = obj;
          }
        } catch (e) {
          console.error('Lỗi parse output từ script:', e);
        }

        // Update cả ba cột nếu có dữ liệu
        const updateData: Record<string, any> = {};
        if (tradesObj && tradesObj.trades) updateData.trades = tradesObj.trades;
        if (summaryObj) updateData.results = summaryObj;
        if (indicatorsObj && indicatorsObj.indicators) updateData.indicators = indicatorsObj.indicators;
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();

        await supabase
          .from('research_experiments')
          .update(updateData)
          .eq('id', experimentId);

        return NextResponse.json({
          success: true,
          message: 'Backtest completed successfully',
          results: {
            trades: tradesObj ? tradesObj.trades : null,
            summary: summaryObj,
            indicators: indicatorsObj ? indicatorsObj.indicators : null
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Backtest script failed', details: scriptError },
          { status: 500 }
        );
      }
    });

    return NextResponse.json({
      message: 'Backtest started successfully',
      experimentId
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 