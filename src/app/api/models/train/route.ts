import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

interface TrainingRequest {
  model_id: string;
  project_id: string;
  algorithm_type: string;
  parameters: any;
  dataset_config: {
    sampleSize: number;
    trainTestSplit: number;
    startDate?: string;
    endDate?: string;
  };
}

// Initialize logs as JSON array with consistent interface
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  details?: any;
}

// Function to extract accuracy and loss from training output
function extractMetricsFromOutput(output: string): { accuracy: number | null, loss: number | null } {
  let accuracy: number | null = null;
  let loss: number | null = null;

  try {
    // Look for R² score first (most common for regression)
    const r2Patterns = [
      /R²[:\s]+([0-9\.]+)/i,
      /R\² Score[:\s]+([0-9\.]+)/i,
      /r2[:\s]+([0-9\.]+)/i,
      /r_squared[:\s]+([0-9\.]+)/i,
      /Test Metrics[^}]*R²[:\s]+([0-9\.]+)/i,
      /Validation Metrics[^}]*R²[:\s]+([0-9\.]+)/i
    ];

    for (const pattern of r2Patterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        accuracy = parseFloat(match[1]);
        break;
      }
    }

    // If no R², look for other accuracy patterns
    if (accuracy === null) {
      const accuracyPatterns = [
        /Accuracy[:\s]+([0-9\.]+)/i,
        /Score[:\s]+([0-9\.]+)/i
      ];

      for (const pattern of accuracyPatterns) {
        const match = output.match(pattern);
        if (match && match[1]) {
          accuracy = parseFloat(match[1]);
          break;
        }
      }
    }

    // Look for loss/error patterns (prioritize test metrics over validation)
    const lossPatterns = [
      /Test Metrics[^}]*RMSE[:\s]+([0-9\.]+)/i,
      /Validation Metrics[^}]*RMSE[:\s]+([0-9\.]+)/i,
      /RMSE[:\s]+([0-9\.]+)/i,
      /Loss[:\s]+([0-9\.]+)/i,
      /MSE[:\s]+([0-9\.]+)/i,
      /MAE[:\s]+([0-9\.]+)/i,
      /Error[:\s]+([0-9\.]+)/i
    ];

    for (const pattern of lossPatterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        loss = parseFloat(match[1]);
        break;
      }
    }

    console.log('📊 Extracted metrics from output:', { accuracy, loss, outputSample: output.substring(0, 500) });
  } catch (error) {
    console.log('⚠️ Error extracting metrics:', error);
  }

  return { accuracy, loss };
}

export async function POST(request: NextRequest) {
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

    const body: TrainingRequest = await request.json();
    const { model_id, project_id, algorithm_type, parameters, dataset_config } = body;

    console.log('🚀 Starting model training:', {
      model_id,
      algorithm_type,
      dataset_config
    });

    // 1. Fetch dataset from Supabase
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const datasetResponse = await fetch(`${baseUrl}/api/datasets/supabase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataset_config)
    });

    if (!datasetResponse.ok) {
      const error = await datasetResponse.json();
      return NextResponse.json(
        { error: 'Failed to fetch dataset', details: error },
        { status: 400 }
      );
    }

    const { dataset } = await datasetResponse.json();

    // 2. Save dataset to temporary files
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const trainDataPath = path.join(tempDir, `train_${model_id}.json`);
    const testDataPath = path.join(tempDir, `test_${model_id}.json`);
    const configPath = path.join(tempDir, `config_${model_id}.json`);

    fs.writeFileSync(trainDataPath, JSON.stringify(dataset.train));
    fs.writeFileSync(testDataPath, JSON.stringify(dataset.test));
    fs.writeFileSync(configPath, JSON.stringify({
      model_id,
      project_id,
      algorithm_type,
      parameters,
      dataset_metadata: dataset.metadata
    }));

    // 3. Determine which training script to use
    const scriptMap: { [key: string]: string } = {
      'LSTM': 'train_lstm.py',
      'GRU': 'train_lstm.py', // Use LSTM script for GRU
      'Linear Regression': 'train_linear_regression.py',
      'Random Forest': 'train_random_forest.py',
      'XGBoost': 'train_xgboost.py',
      'LightGBM': 'train_lightgbm.py',
      'Support Vector Machine': 'train_svm.py',
      'SVM': 'train_svm.py',
      'ARIMA': 'train_arima.py',
      'GARCH': 'train_garch.py',
      'VAR': 'train_var.py',
      'N-BEATS': 'train_nbeats.py',
      'Informer': 'train_informer.py',
      'DLinear': 'train_dlinear.py',
      'DeepAR': 'train_deepar.py',
      // Additional mappings for variations
      'random_forest': 'train_random_forest.py',
      'gradient_boosting': 'train_xgboost.py', // Use XGBoost for gradient boosting
      'neural_network': 'train_lstm.py', // Use LSTM for general neural networks
      'lstm': 'train_lstm.py',
      'svm': 'train_svm.py',
      'arima': 'train_arima.py',
      'garch': 'train_garch.py',
      'var': 'train_var.py'
    };

    const scriptName = scriptMap[algorithm_type] || 'train_lstm.py';
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName);

    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Training script not found: ${scriptName}` },
        { status: 404 }
      );
    }

    // 4. Create logs directory and file
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFilePath = path.join(logsDir, `training_${model_id}.log`);

    // Initialize logs as JSON array with consistent interface
    const initLogs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'start',
        message: `🚀 Starting ${algorithm_type} training process`,
        details: { model_id, algorithm_type }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `📊 Model ID: ${model_id}`,
        details: { model_id }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `🔧 Algorithm: ${algorithm_type}`,
        details: { algorithm_type }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `📈 Dataset: ${dataset.metadata.trainSize} train, ${dataset.metadata.testSize} test samples`,
        details: { 
          trainSize: dataset.metadata.trainSize,
          testSize: dataset.metadata.testSize
        }
      }
    ];

    // Write to file for backup
    const initLogText = initLogs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n') + '\n';
    fs.writeFileSync(logFilePath, initLogText);

    // Record training start time
    const trainingStartTime = Date.now();

    // 5. Update model status to training with initial logs
    await supabase
      .from('research_models') // Use correct table name
      .update({ 
        status: 'training',
        training_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        training_logs: JSON.stringify(initLogs),
        training_time: 0
      })
      .eq('id', model_id);

    // 6. Run training script
    console.log('🐍 Executing Python training script:', scriptPath);

    // Find working Python executable
    let pythonCmd = '';
    
    // Try to find Python in system PATH, avoiding virtual environment issues
    const pythonPaths = [
      'python',
      'python3',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Users\\Public\\python.exe'
    ];
    
    for (const cmdPath of pythonPaths) {
      try {
        console.log(`🔍 Testing Python path: ${cmdPath}`);
        const testProcess = spawn(cmdPath, ['--version'], { 
          stdio: 'pipe',
          shell: false 
        });
        
        const result = await new Promise<boolean>((resolve) => {
          let output = '';
          testProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
          testProcess.on('close', (code) => {
            console.log(`📊 Python test result for ${cmdPath}: code=${code}, output=${output.trim()}`);
            resolve(code === 0 && output.includes('Python'));
          });
          testProcess.on('error', () => {
            resolve(false);
          });
        });
        
        if (result) {
          pythonCmd = cmdPath;
          break;
        }
      } catch (error) {
        console.log(`❌ Error testing ${cmdPath}:`, error);
        continue;
      }
    }

    if (!pythonCmd) {
      const errorMsg = 'No working Python installation found. Please install Python 3.10+ and add it to PATH.';
      fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ❌ ${errorMsg}\n`);
      await supabase
        .from('research_models')
        .update({ 
          status: 'failed',
          training_error: errorMsg,
          updated_at: new Date().toISOString()
        })
        .eq('id', model_id);
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    console.log(`✅ Using Python: ${pythonCmd}`);
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ✅ Using Python: ${pythonCmd}\n[${new Date().toISOString()}] 🚀 Starting training script execution...\n`);

    // Create arguments array without quotes for spawn
    const pythonArgs = [
      scriptPath,
      '--train_data', trainDataPath,
      '--test_data', testDataPath,
      '--config', configPath,
      '--model_id', model_id,
      '--output_dir', path.join(process.cwd(), 'models', model_id)
    ];

    console.log(`🚀 Executing: ${pythonCmd} ${pythonArgs.join(' ')}`);

    const pythonProcess = spawn(pythonCmd, pythonArgs, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // Avoid shell issues
      env: {
        ...process.env,
        PYTHONPATH: process.cwd(),
        PYTHONUNBUFFERED: '1' // Ensure real-time output
      }
    });

    let output = '';
    let errorOutput = '';
    let allLogs = [...initLogs]; // Keep as array for JSON logging

    pythonProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      output += message + '\n';
      
      // Add to JSON logs array
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: message,
        source: 'stdout'
      };
      allLogs.push(logEntry);
      
      // Append to file
      const logText = `[${logEntry.timestamp}] [STDOUT] ${message}\n`;
      fs.appendFileSync(logFilePath, logText);
      console.log('📊 Training output:', message);
      
      // Update database with latest logs (debounced approach)
      // Only update every 10 log entries to avoid too many DB writes
      if (allLogs.length % 10 === 0) {
        // Fire and forget - use async IIFE to handle promise
        (async () => {
          try {
            await supabase
              .from('research_models')
              .update({ 
                training_logs: JSON.stringify(allLogs),
                updated_at: new Date().toISOString()
              })
              .eq('id', model_id);
          } catch (error) {
            console.log('❌ Error updating logs:', error);
          }
        })();
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      errorOutput += message + '\n';
      
      // Add to JSON logs array
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: message,
        source: 'stderr'
      };
      allLogs.push(logEntry);
      
      // Append to file
      const logText = `[${logEntry.timestamp}] [STDERR] ${message}\n`;
      fs.appendFileSync(logFilePath, logText);
      console.error('❌ Training error:', message);
    });

    // Return immediately with training started status
    // The actual training will continue in background
    pythonProcess.on('close', async (code) => {
      console.log(`🏁 Training process finished with code: ${code}`);
      
      const finishLog = `[${new Date().toISOString()}] 🏁 Training process finished with code: ${code}\n`;
      allLogs.push({
        timestamp: new Date().toISOString(),
        level: code === 0 ? 'success' : 'error',
        message: `Training process finished with code: ${code}`,
        source: 'system'
      });
      fs.appendFileSync(logFilePath, finishLog);
      
      try {
        // Clean up temporary files
        if (fs.existsSync(trainDataPath)) fs.unlinkSync(trainDataPath);
        if (fs.existsSync(testDataPath)) fs.unlinkSync(testDataPath);
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

        // Extract metrics from output
        const { accuracy, loss } = extractMetricsFromOutput(output);

        // Calculate training time first
        const trainingEndTime = Date.now();
        const trainingTime = Math.round((trainingEndTime - trainingStartTime) / 1000); // in seconds
        
        // Determine status
        const status = code === 0 ? 'completed' : 'failed';

        // Parse JSON result from Python script if available
        let pythonResults = null;
        try {
          // Look for JSON result in output
          const jsonMatch = output.match(/\{"success":\s*true,\s*"message":[^}]+\}/);
          if (jsonMatch) {
            pythonResults = JSON.parse(jsonMatch[0]);
          }
        } catch (error) {
          console.log('⚠️ Could not parse Python JSON result:', error);
        }

        // Build comprehensive performance metrics
        const performance_metrics: any = {
          training_completed_at: new Date().toISOString(),
          training_time_seconds: trainingTime,
          status: status,
          metrics: {
            accuracy: accuracy,
            loss: loss,
            r2_score: accuracy, // For regression models
            rmse: loss
          },
          python_results: pythonResults?.results || null,
          training_config: {
            algorithm_type: model_id, // Will be updated with actual algorithm
            dataset_size: allLogs.find(log => log.message.includes('Dataset:'))?.details || null
          },
          logs_summary: {
            total_log_entries: allLogs.length,
            last_updated: new Date().toISOString()
          }
        };

        if (status === 'failed') {
          performance_metrics.error = errorOutput || 'Training process failed with unknown error';
        }

        // Update model status
        const updateData: any = {
          status,
          training_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          training_logs: JSON.stringify(allLogs),
          performance_metrics: JSON.stringify(performance_metrics),
          training_time: trainingTime
        };

        if (status === 'failed') {
          updateData.training_error = errorOutput || 'Training process failed with unknown error';
        }

        // Add metrics if available
        if (accuracy !== null) {
          updateData.accuracy = accuracy;
        }
        if (loss !== null) {
          updateData.loss = loss;
        }

        console.log('📊 Updating model with data:', updateData);
        
        const { error: updateError } = await supabase
          .from('research_models')
          .update(updateData)
          .eq('id', model_id);

        if (updateError) {
          console.error('❌ Supabase update error:', updateError);
        } else {
          console.log(`✅ Model ${model_id} training ${status} - Updated in database`);
        }
        
        const statusLog = `[${new Date().toISOString()}] ✅ Model ${model_id} training ${status}\n`;
        fs.appendFileSync(logFilePath, statusLog);
      } catch (error) {
        console.error('❌ Error updating model status:', error);
        const errorLog = `[${new Date().toISOString()}] ❌ Error updating model status: ${error}\n`;
        fs.appendFileSync(logFilePath, errorLog);
      }
    });

    pythonProcess.on('error', async (error) => {
      console.error('❌ Python process error:', error);
      const errorLog = `[${new Date().toISOString()}] ❌ Python process error: ${error.message}\n`;
      allLogs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Python process error: ${error.message}`,
        source: 'system'
      });
      fs.appendFileSync(logFilePath, errorLog);
      
      // Update model status to failed
      try {
        await supabase
          .from('research_models')
          .update({
            status: 'failed',
            training_error: error.message,
            training_logs: JSON.stringify(allLogs),
            updated_at: new Date().toISOString()
          })
          .eq('id', model_id);
      } catch (updateError) {
        console.error('❌ Error updating failed status:', updateError);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Training started successfully',
      model_id,
      training_process_id: pythonProcess.pid,
      log_file: logFilePath,
      dataset_info: {
        total_records: dataset.total,
        train_records: dataset.metadata.trainSize,
        test_records: dataset.metadata.testSize,
        split_ratio: `${dataset_config.trainTestSplit}/${100 - dataset_config.trainTestSplit}`
      }
    });

  } catch (error) {
    console.error('❌ Training API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start training', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model_id = searchParams.get('model_id');

    if (!model_id) {
      return NextResponse.json(
        { error: 'model_id is required' },
        { status: 400 }
      );
    }

    // Get training status from database
    const { data: model, error } = await supabase
      .from('research_models')
      .select('status, updated_at')
      .eq('id', model_id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Model not found', details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      model_id,
      status: model.status,
      updated_at: model.updated_at
    });

  } catch (error) {
    console.error('❌ Training status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get training status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}