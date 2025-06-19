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

    // Log output từ script (optional)
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Backtest output: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Backtest error: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      console.log(`Backtest process exited with code ${code}`);

      // Cập nhật trạng thái experiment
      const status = code === 0 ? 'completed' : 'failed';
      const { error } = await supabase
        .from('research_experiments')
        .update({ status })
        .eq('id', experimentId);

      if (error) {
        console.error('Error updating experiment status:', error);
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