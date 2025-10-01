import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbol: string = (body?.symbol || 'BTCUSDT').toUpperCase();
    const strategy: string = body?.strategy || 'ichimoku';
    const timeframes: string[] = Array.isArray(body?.timeframes) && body.timeframes.length > 0
      ? body.timeframes
      : ['5m', '15m', '30m', '1h'];
    const startDate: string = body?.startDate || '2023-01-01';
    const endDate: string = body?.endDate || new Date().toISOString().slice(0,10);
    const overrides = body?.overrides || {};

    if (strategy !== 'ichimoku') {
      return NextResponse.json({ success: false, error: 'Hiện chỉ hỗ trợ ichimoku cho MTF' }, { status: 400 });
    }

    const pythonScript = path.join(process.cwd(), 'scripts', 'backtest_strategies', 'mtf_backtest_runner.py');

    return await new Promise<Response>((resolve) => {
      const py = spawn('python', [
        pythonScript,
        '--symbol', symbol,
        '--timeframes', timeframes.join(','),
        '--start_date', startDate,
        '--end_date', endDate,
        '--config_overrides', JSON.stringify(overrides)
      ], {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      });

      let stdout = '';
      let stderr = '';
      py.stdout.on('data', (d: Buffer) => stdout += d.toString());
      py.stderr.on('data', (d: Buffer) => stderr += d.toString());
      py.on('close', (code) => {
        if (code === 0) {
          try {
            const json = JSON.parse(stdout.trim().split('\n').pop() || '{}');
            resolve(NextResponse.json(json));
          } catch (e:any) {
            resolve(NextResponse.json({ success:false, error: 'Parse output failed', raw: stdout, stderr }, { status: 500 }));
          }
        } else {
          resolve(NextResponse.json({ success:false, error: 'Python exited with error', stderr }, { status: 500 }));
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
