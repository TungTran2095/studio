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
      console.log(`Backtest process exited with code ${code}`);

      let finalStatus = code === 0 ? 'completed' : 'failed';
      let results = null;

      if (code === 0 && scriptOutput) {
        try {
          // Cố gắng tìm và parse JSON từ output
          const lines = scriptOutput.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          results = JSON.parse(lastLine);
          console.log('Parsed backtest results:', results);
        } catch (e) {
          console.error('Failed to parse backtest results from stdout:', e);
          finalStatus = 'failed';
          scriptError += '\nError: Failed to parse results JSON from script output.';
        }
      }

      // Cập nhật trạng thái và kết quả experiment
      const updatePayload: { status: string; results?: any, error?: string } = {
        status: finalStatus,
      };

      if (results) {
        updatePayload.results = results;
      }

      if (finalStatus === 'failed' && scriptError) {
        updatePayload.error = scriptError;
      }
      
      const { error } = await supabase
        .from('research_experiments')
        .update(updatePayload)
        .eq('id', experimentId);

      if (error) {
        console.error('Error updating experiment status and results:', error);
      } else {
        console.log(`✅ Experiment ${experimentId} updated with status: ${finalStatus}`);
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