import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to create temporary data files
async function createTempDataFiles(trainData: any[], testData: any[]) {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  
  const trainPath = path.join(tempDir, `train_data_${timestamp}.json`);
  const testPath = path.join(tempDir, `test_data_${timestamp}.json`);
  
  await fs.promises.writeFile(trainPath, JSON.stringify(trainData, null, 2));
  await fs.promises.writeFile(testPath, JSON.stringify(testData, null, 2));
  
  return { trainPath, testPath };
}

// Helper function to create temporary config file
async function createTempConfigFile(trainingConfig: any) {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  
  const configPath = path.join(tempDir, `training_config_${timestamp}.json`);
  await fs.promises.writeFile(configPath, JSON.stringify(trainingConfig, null, 2));
  
  return configPath;
}

// Real training execution using Python scripts
async function executeRealTraining(model: any, config: any): Promise<any> {
  try {
    console.log('🐍 [Real Training] Starting real model training for:', model.id);
    
    // Get training data from config
    const dataConfig = config?.data_config || {};
    
    // Parse training_config from database
    let trainingConfig;
    try {
      trainingConfig = typeof model.training_config === 'string' 
        ? JSON.parse(model.training_config) 
        : model.training_config || {};
    } catch (e) {
      console.error('❌ Failed to parse training_config:', e);
      trainingConfig = {};
    }
    
    console.log('📊 Training config from database:', trainingConfig);
    
    // Get train/test split data from API call if available
    let trainData = [];
    let testData = [];
    
    if (dataConfig.trainData && dataConfig.testData) {
      trainData = dataConfig.trainData;
      testData = dataConfig.testData;
      console.log(`📊 Using provided train/test data: ${trainData.length}/${testData.length} records`);
    } else {
      // Fallback: fetch recent OHLCV data and split
      console.log('📊 Fetching OHLCV data for training...');
      
      const dataLimit = dataConfig.dataLimit || 5000;
      const testSize = dataConfig.testSize || 0.2;
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
        const dataResponse = await fetch(`${baseUrl}/api/data/ohlcv?limit=${dataLimit}&order=open_time.desc`);
        
        if (dataResponse.ok) {
          const result = await dataResponse.json();
          const allData = result.data || [];
          
          const trainSize = Math.floor(allData.length * (1 - testSize));
          trainData = allData.slice(0, trainSize);
          testData = allData.slice(trainSize);
          
          console.log(`📊 Auto-split data: ${trainData.length} train, ${testData.length} test`);
        } else {
          throw new Error('Failed to fetch OHLCV data');
        }
      } catch (fetchError) {
        console.error('❌ Failed to fetch training data:', fetchError);
        throw new Error(`Data fetch failed: ${fetchError}`);
      }
    }
    
    if (trainData.length === 0 || testData.length === 0) {
      throw new Error('No training or test data available');
    }
    
    // Create temporary data and config files
    const { trainPath, testPath } = await createTempDataFiles(trainData, testData);
    const configPath = await createTempConfigFile(trainingConfig);
    
    console.log('📁 Temporary files created:', { trainPath, testPath, configPath });
    
    // Determine algorithm
    const algorithm = model.algorithm || model.model_type || model.algorithm_type || 'linear_regression';
    console.log('🧠 Algorithm:', algorithm);
    
    // Path to model_trainer.py
    const scriptPath = path.join(process.cwd(), 'scripts', 'model_trainer.py');
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Training script not found: ${scriptPath}`);
    }
    
    return new Promise((resolve, reject) => {
      const args = [
        scriptPath,
        '--model_id', model.id,
        '--algorithm', algorithm,
        '--train_data', trainPath,
        '--test_data', testPath,
        '--config', configPath,
        '--supabase_url', process.env.NEXT_PUBLIC_SUPABASE_URL!,
        '--supabase_key', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ];
      
      console.log('🚀 [Real Training] Executing:', 'python', args.join(' '));
      
      const pythonProcess = spawn('python', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('📊 [Python Training]', output.trim());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error('❌ [Python Training Error]', output.trim());
      });
      
      pythonProcess.on('close', async (code) => {
        // Cleanup temporary files
        try {
          await fs.promises.unlink(trainPath);
          await fs.promises.unlink(testPath);
          await fs.promises.unlink(configPath);
          console.log('🗑️ Temporary files cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup temporary files:', cleanupError);
        }
        
        if (code === 0) {
          console.log('✅ [Real Training] Python training completed successfully');
          
          // Try to parse final JSON output from stdout
          let result;
          try {
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            
            if (lastLine.startsWith('{') && lastLine.endsWith('}')) {
              result = JSON.parse(lastLine);
            } else {
              result = {
                success: true,
                message: 'Training completed successfully',
                output: stdout
              };
            }
          } catch (parseError) {
            console.warn('⚠️ Failed to parse training result, using default success');
            result = {
              success: true,
              message: 'Training completed successfully',
              output: stdout
            };
          }
          
          resolve(result);
        } else {
          console.error(`❌ [Real Training] Python process exited with code: ${code}`);
          reject(new Error(`Training failed with exit code ${code}. Stderr: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('❌ [Real Training] Failed to start Python process:', error);
        reject(new Error(`Failed to start training process: ${error.message}`));
      });
    });
    
  } catch (error) {
    console.error('❌ [Real Training] Training execution error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, action, config } = body;

    console.log(`🚀 [Model Actions] ${action.toUpperCase()} - Model: ${modelId}`);

    if (!modelId || !action) {
      return NextResponse.json(
        { error: 'Model ID and action are required' },
        { status: 400 }
      );
    }

    // Get the model first
    const { data: model, error: fetchError } = await supabase
      .from('research_models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (fetchError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'train':
        return await handleTrain(model, config);
      
      case 'test':
        return await handleTest(model, config);
      
      case 'deploy':
        return await handleDeploy(model, config);
      
      case 'stop':
        return await handleStop(model);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [Model Actions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleTrain(model: any, config: any) {
  try {
    console.log('🎯 [Handle Train] Starting training for model:', model.id);
    console.log('📊 [Handle Train] Config received:', config);
    
    // Update status to training with initial log
    const initialLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `Training started for model ${model.name} (${model.algorithm || 'unknown algorithm'})`,
      source: 'api'
    };

    await supabase
      .from('research_models')
      .update({ 
        status: 'training',
        training_logs: JSON.stringify([initialLog]),
        updated_at: new Date().toISOString()
      })
      .eq('id', model.id);

    // Start real training process in background
    executeRealTraining(model, config)
      .then(async (result) => {
        console.log('✅ [Handle Train] Training completed successfully:', result);
        
        // Update model with final results
        const updateData: any = {
          status: 'completed',
          updated_at: new Date().toISOString()
        };
        
        if (result.results) {
          updateData.performance_metrics = JSON.stringify(result.results);
        }
        
        await supabase
          .from('research_models')
          .update(updateData)
          .eq('id', model.id);
      })
      .catch(async (error) => {
        console.error('❌ [Handle Train] Training failed:', error);
        
        // Update model with error
        const errorLog = {
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          message: `Training failed: ${error.message}`,
          source: 'api'
        };
        
        await supabase
          .from('research_models')
          .update({
            status: 'failed',
            training_logs: JSON.stringify([errorLog]),
            updated_at: new Date().toISOString()
          })
          .eq('id', model.id);
      });

    return NextResponse.json({
      success: true,
      message: 'Real training started successfully with Python scripts',
      modelId: model.id,
      status: 'training',
      realTraining: true
    });

  } catch (error) {
    console.error('❌ [Handle Train] Training error:', error);
    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    );
  }
}

async function handleTest(model: any, config: any) {
  try {
    if (model.status !== 'completed') {
      return NextResponse.json(
        { error: 'Model must be completed before testing' },
        { status: 400 }
      );
    }

    // Update status to testing
    await supabase
      .from('research_models')
      .update({ 
        status: 'testing',
        updated_at: new Date().toISOString()
      })
      .eq('id', model.id);

    // Start testing simulation in background
    simulateTesting(model.id, model.algorithm_type, config);

    return NextResponse.json({
      success: true,
      message: 'Testing started successfully',
      modelId: model.id,
      status: 'testing'
    });

  } catch (error) {
    console.error('❌ [Model Actions] Testing error:', error);
    return NextResponse.json(
      { error: 'Failed to start testing' },
      { status: 500 }
    );
  }
}

async function handleDeploy(model: any, config: any) {
  try {
    if (model.status !== 'completed') {
      return NextResponse.json(
        { error: 'Model must be completed before deployment' },
        { status: 400 }
      );
    }

    // Update status to deploying
    await supabase
      .from('research_models')
      .update({ 
        status: 'deploying',
        updated_at: new Date().toISOString()
      })
      .eq('id', model.id);

    // Simulate deployment process
    setTimeout(async () => {
      await supabase
        .from('research_models')
        .update({ 
          status: 'deployed',
          updated_at: new Date().toISOString()
        })
        .eq('id', model.id);
    }, 3000);

    return NextResponse.json({
      success: true,
      message: 'Deployment started successfully',
      modelId: model.id,
      status: 'deploying'
    });

  } catch (error) {
    console.error('❌ [Model Actions] Deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to start deployment' },
      { status: 500 }
    );
  }
}

async function handleStop(model: any) {
  try {
    // Update status back to previous state or draft
    const newStatus = model.status === 'training' ? 'draft' : 
                     model.status === 'testing' ? 'completed' : model.status;

    await supabase
      .from('research_models')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', model.id);

    return NextResponse.json({
      success: true,
      message: 'Operation stopped successfully',
      modelId: model.id,
      status: newStatus
    });

  } catch (error) {
    console.error('❌ [Model Actions] Stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop operation' },
      { status: 500 }
    );
  }
}

// Background testing simulation
async function simulateTesting(modelId: string, algorithmType: string, config: any) {
  try {
    const totalSteps = 50;
    
    for (let i = 0; i <= totalSteps; i++) {
      const progress = (i / totalSteps) * 100;
      
      await supabase
        .from('research_models')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', modelId);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Generate test metrics
    const testMetrics = generateMockTestMetrics(algorithmType);

    // Testing completed
    await supabase
      .from('research_models')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', modelId);

  } catch (error) {
    console.error('❌ Testing simulation error:', error);
  }
}

// Generate mock test metrics
function generateMockTestMetrics(algorithm: string) {
  return {
    test_accuracy: Math.random() * 0.15 + 0.7,
    test_loss: Math.random() * 0.6 + 0.15,
    precision: Math.random() * 0.2 + 0.75,
    recall: Math.random() * 0.2 + 0.7,
    f1_score: Math.random() * 0.2 + 0.72,
    predictions_made: Math.floor(Math.random() * 1000) + 500,
    test_duration: Math.floor(Math.random() * 60) + 30
  };
} 