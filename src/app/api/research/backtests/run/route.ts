import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

// Khởi tạo Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
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
    ]);
    
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
        try {
          // Lọc ra các dòng JSON hợp lệ
          const jsonLines = lines.filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
          if (jsonLines.length >= 2) {
            tradesObj = JSON.parse(jsonLines[0]);
            summaryObj = JSON.parse(jsonLines[1]);
          } else if (jsonLines.length === 1) {
            const obj = JSON.parse(jsonLines[0]);
            if (obj.trades) tradesObj = obj;
            else summaryObj = obj;
          }
        } catch (e) {
          console.error('Lỗi parse output từ script:', e);
        }

        // Update cả hai cột nếu có dữ liệu
        const updateData: Record<string, any> = {};
        if (tradesObj && tradesObj.trades) updateData.trades = tradesObj.trades;
        if (summaryObj) updateData.results = summaryObj;
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
            summary: summaryObj
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