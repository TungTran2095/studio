import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { code, algorithm, name } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Python code is required' },
        { status: 400 }
      );
    }

    console.log('🐍 [Execute Script] Starting Python script execution...');
    console.log('📝 [Execute Script] Algorithm:', algorithm);
    console.log('📛 [Execute Script] Name:', name);

    // Create unique script file
    const scriptId = uuidv4();
    const scriptPath = join(process.cwd(), 'temp', `script_${scriptId}.py`);
    
    // Ensure temp directory exists
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Write script to file
      writeFileSync(scriptPath, code, 'utf8');
      console.log('📁 [Execute Script] Script saved to:', scriptPath);

      // Execute Python script
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      console.log('🐍 [Execute Script] Using Python executable:', pythonPath);

      const result = await executeScript(pythonPath, scriptPath);
      
      // Cleanup temp file
      if (existsSync(scriptPath)) {
        unlinkSync(scriptPath);
      }

      return NextResponse.json({
        success: true,
        message: 'Script executed successfully',
        result,
        scriptId
      });

    } catch (error) {
      // Cleanup on error
      if (existsSync(scriptPath)) {
        unlinkSync(scriptPath);
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ [Execute Script] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute script: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Execute Python script and capture output
function executeScript(pythonPath: string, scriptPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('🚀 [Execute Script] Spawning Python process...');
    
    const pythonProcess = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: process.env.PYTHONPATH || ''
      }
    });

    let stdout = '';
    let stderr = '';
    let isCompleted = false;

    // Capture stdout
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;
      console.log('📤 [Python Output]:', output.trim());
    });

    // Capture stderr
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      stderr += output;
      console.log('⚠️ [Python Error]:', output.trim());
    });

    // Handle process completion
    pythonProcess.on('close', (code: number | null) => {
      if (isCompleted) return;
      isCompleted = true;

      console.log(`🏁 [Execute Script] Process finished with code: ${code}`);
      
      if (code === 0) {
        // Success
        let result: any = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code
        };

        // Try to parse JSON output if present
        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          if (lastLine.startsWith('{') && lastLine.endsWith('}')) {
            result.parsed = JSON.parse(lastLine);
          }
        } catch (e) {
          // Not JSON output, that's fine
        }

        resolve(result);
      } else {
        // Error
        reject(new Error(`Script execution failed with code ${code}. Error: ${stderr}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error: Error) => {
      if (isCompleted) return;
      isCompleted = true;
      
      console.error('💥 [Execute Script] Process error:', error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    // Set timeout (5 minutes)
    setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        pythonProcess.kill('SIGTERM');
        reject(new Error('Script execution timed out (5 minutes)'));
      }
    }, 5 * 60 * 1000);
  });
}

// Handle GET request for script status/info
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'python-info') {
    // Return Python environment info
    try {
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const info = await getPythonInfo(pythonPath);
      
      return NextResponse.json({
        pythonPath,
        info,
        tempDir: join(process.cwd(), 'temp')
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get Python info: ' + (error as Error).message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}

// Get Python version and installed packages
function getPythonInfo(pythonPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonPath, ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    pythonProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({
          version: output.trim(),
          executable: pythonPath,
          status: 'available'
        });
      } else {
        reject(new Error(`Python not available: ${output}`));
      }
    });

    pythonProcess.on('error', (error: Error) => {
      reject(new Error(`Python executable not found: ${error.message}`));
    });
  });
} 