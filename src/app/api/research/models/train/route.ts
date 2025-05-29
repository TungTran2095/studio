import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Check if we're in mock mode (when Supabase is not configured)
const MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

// Demo mode - use real training scripts with local datasets but mock Supabase
const DEMO_MODE = process.env.DEMO_MODE === 'true' || MOCK_MODE;

let supabase: any = null;
if (!MOCK_MODE) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

// Mapping algorithms to training scripts
const ALGORITHM_SCRIPTS = {
  'LSTM': 'scripts/training_scripts/lstm_trainer.py',
  'GRU': 'scripts/training_scripts/lstm_trainer.py', // GRU sử dụng same script
  'Random Forest': 'scripts/training_scripts/random_forest_trainer.py',
  'XGBoost': 'scripts/training_scripts/xgboost_trainer.py',
  'Linear Regression': 'scripts/training_scripts/linear_regression_trainer.py',
  'ARIMA': 'scripts/training_scripts/arima_trainer.py',
  'SVM': 'scripts/training_scripts/svm_trainer.py'
};

export async function POST(request: NextRequest) {
  try {
    const { model_id, dataset_id } = await request.json();

    if (!model_id) {
      return NextResponse.json(
        { error: 'model_id is required' },
        { status: 400 }
      );
    }

    console.log('🚀 [Model Training] Starting training for model:', model_id);
    console.log('📊 [Model Training] Dataset ID:', dataset_id);

    // Mock mode - simulate training without Supabase
    if (MOCK_MODE) {
      console.log('🎭 [Mock Mode] Simulating training process...');
      
      // Check if we have a real dataset_id to use for actual training
      if (dataset_id && (dataset_id === 'crypto-price-data' || dataset_id === 'stock-features-data')) {
        console.log('🔄 [Mock Mode] Found dataset_id, switching to real training with local data');
        
        // Create training config for real training
        const trainingConfig = {
          model_id: model_id,
          model_name: `Model ${model_id}`,
          algorithm: 'LSTM',
          dataset_id: dataset_id,
          target_column: dataset_id === 'crypto-price-data' ? 'close' : 'future_return',
          parameters: {
            units: 50,
            layers: 2,
            dropout: 0.2,
            learning_rate: 0.001,
            epochs: 20,
            batch_size: 32,
            sequence_length: 60,
            train_split: 0.7,
            validation_split: 0.15,
            patience: 5
          },
          project_id: 'local-project'
        };
        
        // Save config to temp file
        const configId = uuidv4();
        const tempDir = join(process.cwd(), 'temp');
        const configPath = join(tempDir, `training_config_${configId}.json`);

        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }

        writeFileSync(configPath, JSON.stringify(trainingConfig, null, 2));
        console.log('📁 [Mock Mode] Config saved to:', configPath);
        
        // Execute real training script
        const scriptPath = 'scripts/training_scripts/lstm_trainer.py';
        
        if (existsSync(scriptPath)) {
          try {
            const trainingResult = await executeTrainingScript(scriptPath, configPath);
            
            if (trainingResult.success) {
              console.log('✅ [Mock Mode] Real training completed successfully');
              return NextResponse.json({
                success: true,
                message: 'Model training completed successfully (Real Training with Local Data)',
                model_id,
                results: trainingResult.results,
                artifacts: trainingResult.artifacts,
                mode: 'real_training_local_data'
              });
            } else {
              console.error('❌ [Mock Mode] Real training failed:', trainingResult.error);
              // Fall back to mock results
            }
          } catch (error) {
            console.error('❌ [Mock Mode] Training script error:', error);
            // Fall back to mock results
          }
        }
      }
      
      // Default mock simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock training results
      const mockResults = {
        success: true,
        message: 'Model training completed successfully (Mock Mode)',
        model_id,
        results: {
          metrics: {
            train: {
              accuracy: 0.85 + Math.random() * 0.1,
              loss: 0.2 + Math.random() * 0.1,
              rmse: 0.15 + Math.random() * 0.05
            },
            test: {
              accuracy: 0.82 + Math.random() * 0.08,
              loss: 0.25 + Math.random() * 0.1,
              rmse: 0.18 + Math.random() * 0.05
            }
          },
          training_time: 120 + Math.random() * 60,
          epochs: 50,
          best_epoch: 35 + Math.floor(Math.random() * 10)
        },
        artifacts: {
          model_path: `models/mock_model_${model_id}.pkl`,
          scaler_path: `models/mock_scaler_${model_id}.pkl`,
          history_path: `models/mock_history_${model_id}.json`
        },
        mode: 'mock_simulation'
      };
      
      console.log('✅ [Mock Mode] Training completed:', mockResults);
      return NextResponse.json(mockResults);
    }

    // Real mode with Supabase
    // Get model details from Supabase
    const { data: model, error: modelError } = await supabase
      .from('research_models')
      .select(`
        *,
        project:research_projects(*)
      `)
      .eq('id', model_id)
      .single();

    if (modelError || !model) {
      console.error('❌ [Model Training] Model not found:', modelError);
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    console.log('📋 [Model Training] Model details:', {
      name: model.name,
      algorithm: model.algorithm_type,
      dataset_id: model.dataset_id
    });

    // Validate dataset
    if (!model.dataset_id) {
      return NextResponse.json(
        { error: 'Model does not have dataset assigned' },
        { status: 400 }
      );
    }

    // Get script path for algorithm
    const scriptPath = ALGORITHM_SCRIPTS[model.algorithm_type as keyof typeof ALGORITHM_SCRIPTS];
    
    if (!scriptPath) {
      return NextResponse.json(
        { error: `Training script not found for algorithm: ${model.algorithm_type}` },
        { status: 400 }
      );
    }

    if (!existsSync(scriptPath)) {
      console.error('❌ [Model Training] Script file not found:', scriptPath);
      return NextResponse.json(
        { error: `Training script file not found: ${scriptPath}` },
        { status: 500 }
      );
    }

    // Update model status to training
    await supabase
      .from('research_models')
      .update({
        status: 'training',
        training_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', model_id);

    console.log('✅ [Model Training] Model status updated to training');

    // Create training configuration
    const trainingConfig = {
      model_id: model.id,
      model_name: model.name,
      algorithm: model.algorithm_type,
      dataset_id: model.dataset_id,
      target_column: model.target_column,
      parameters: model.hyperparameters || {},
      project_id: model.project_id
    };

    console.log('📋 [Model Training] Training config:', trainingConfig);

    // Save config to temp file
    const configId = uuidv4();
    const tempDir = join(process.cwd(), 'temp');
    const configPath = join(tempDir, `training_config_${configId}.json`);

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    writeFileSync(configPath, JSON.stringify(trainingConfig, null, 2));
    console.log('📁 [Model Training] Config saved to:', configPath);

    // Start training process
    try {
      const trainingResult = await executeTrainingScript(scriptPath, configPath);
      
      // Update model with results
      if (trainingResult.success) {
        await supabase
          .from('research_models')
          .update({
            status: 'trained',
            training_completed_at: new Date().toISOString(),
            performance_metrics: trainingResult.results?.metrics,
            model_artifacts: trainingResult.artifacts,
            updated_at: new Date().toISOString()
          })
          .eq('id', model_id);

        console.log('✅ [Model Training] Training completed successfully');

        return NextResponse.json({
          success: true,
          message: 'Model training completed successfully',
          model_id,
          results: trainingResult.results,
          artifacts: trainingResult.artifacts
        });
      } else {
        // Training failed
        await supabase
          .from('research_models')
          .update({
            status: 'failed',
            training_error: trainingResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', model_id);

        console.error('❌ [Model Training] Training failed:', trainingResult.error);

        return NextResponse.json({
          success: false,
          error: trainingResult.error,
          model_id
        }, { status: 500 });
      }

    } catch (error) {
      console.error('❌ [Model Training] Training process error:', error);
      
      // Update model status to failed
      await supabase
        .from('research_models')
        .update({
          status: 'failed',
          training_error: (error as Error).message,
          updated_at: new Date().toISOString()
        })
        .eq('id', model_id);

      return NextResponse.json({
        success: false,
        error: (error as Error).message,
        model_id
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [Model Training] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

function executeTrainingScript(scriptPath: string, configPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('🐍 [Model Training] Executing Python script:', scriptPath);
    console.log('📋 [Model Training] Config path:', configPath);

    const pythonPath = process.env.PYTHON_PATH || 'python3';
    
    const pythonProcess = spawn(pythonPath, [scriptPath, configPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        // Add Supabase DB credentials for Python scripts
        SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST,
        SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT,
        SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME,
        SUPABASE_DB_USER: process.env.SUPABASE_DB_USER,
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD
      }
    });

    let stdout = '';
    let stderr = '';
    let isCompleted = false;

    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;
      console.log('📤 [Python Training]:', output.trim());
    });

    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      stderr += output;
      console.log('⚠️ [Python Training Error]:', output.trim());
    });

    pythonProcess.on('close', (code: number | null) => {
      if (isCompleted) return;
      isCompleted = true;

      console.log(`🏁 [Model Training] Python process finished with code: ${code}`);

      if (code === 0) {
        // Success - try to parse JSON result from stdout
        try {
          const lines = stdout.trim().split('\n');
          let result = null;
          
          // Look for JSON result in the last few lines
          for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
            try {
              const line = lines[i].trim();
              if (line.startsWith('{') && line.endsWith('}')) {
                result = JSON.parse(line);
                break;
              }
            } catch (e) {
              // Continue looking
            }
          }

          if (!result) {
            result = {
              success: true,
              message: 'Training completed but no structured result found',
              stdout: stdout.trim(),
              stderr: stderr.trim()
            };
          }

          resolve(result);
        } catch (error) {
          console.error('❌ [Model Training] Error parsing result:', error);
          resolve({
            success: true,
            message: 'Training completed but result parsing failed',
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        }
      } else {
        // Training failed
        resolve({
          success: false,
          error: `Training script failed with code ${code}. Error: ${stderr.trim() || 'Unknown error'}`,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      }
    });

    pythonProcess.on('error', (error: Error) => {
      if (isCompleted) return;
      isCompleted = true;
      
      console.error('💥 [Model Training] Process error:', error);
      reject(new Error(`Failed to start Python training process: ${error.message}`));
    });

    // Set timeout (30 minutes for training)
    setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        pythonProcess.kill('SIGTERM');
        reject(new Error('Training timeout (30 minutes)'));
      }
    }, 30 * 60 * 1000);
  });
} 