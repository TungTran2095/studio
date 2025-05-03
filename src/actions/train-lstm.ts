
// src/actions/train-lstm.ts // Renaming this file might be good later, e.g., train-model.ts
'use server';

import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';

// --- Schemas ---

// Define individual config schemas for clarity
const LstmTrainingConfigSchema = z.object({
  units: z.number().int().positive().default(50),
  layers: z.number().int().min(1).max(5).default(2),
  timesteps: z.number().int().positive().default(60),
  dropout: z.number().min(0).max(0.8).default(0.2),
  learningRate: z.number().positive().default(0.001),
  batchSize: z.number().int().positive().default(64),
  epochs: z.number().int().positive().default(100),
});
export type LstmTrainingConfig = z.infer<typeof LstmTrainingConfigSchema>;

// N-BEATS Config Schema (align with Python script args where possible)
const NBeatsTrainingConfigSchema = z.object({
    input_chunk_length: z.number().int().positive().default(20), // Darts param name
    output_chunk_length: z.number().int().positive().default(5), // Darts param name
    num_stacks: z.number().int().positive().default(30),
    num_blocks: z.number().int().positive().default(1),
    num_layers: z.number().int().positive().default(4),
    layer_widths: z.number().int().positive().default(256),
    learningRate: z.number().positive().default(0.001), // Renamed for consistency
    batchSize: z.number().int().positive().default(64), // Renamed for consistency
    epochs: z.number().int().positive().default(50), // Renamed for consistency
});
export type NBeatsTrainingConfig = z.infer<typeof NBeatsTrainingConfigSchema>;

// LightGBM Config Schema
const LightGBMTrainingConfigSchema = z.object({
    num_leaves: z.number().int().positive().default(31),
    learningRate: z.number().positive().default(0.05), // Kept consistent name
    feature_fraction: z.number().min(0).max(1).default(0.9),
    bagging_fraction: z.number().min(0).max(1).default(0.8),
    bagging_freq: z.number().int().min(0).default(5),
    boosting_type: z.enum(['gbdt', 'dart', 'goss']).default('gbdt'),
    numIterations: z.number().int().positive().default(100), // Renamed for clarity
    lags: z.number().int().positive().default(5), // Feature engineering param
    forecast_horizon: z.number().int().positive().default(1), // Feature engineering param
    batchSize: z.number().int().positive().default(64), // Added for consistency (though LGBM might not use it directly in fit)
    epochs: z.number().int().positive().default(100), // Added for consistency (LGBM uses numIterations)
});
export type LightGBMTrainingConfig = z.infer<typeof LightGBMTrainingConfigSchema>;

// DLinear Config Schema (Example using Darts library parameters)
const DLinearTrainingConfigSchema = z.object({
    input_chunk_length: z.number().int().positive().default(20),
    output_chunk_length: z.number().int().positive().default(5),
    kernel_size: z.number().int().positive().default(25),
    shared_weights: z.boolean().default(false),
    const_init: z.boolean().default(true),
    learningRate: z.number().positive().default(0.001),
    batchSize: z.number().int().positive().default(64),
    epochs: z.number().int().positive().default(50),
});
export type DLinearTrainingConfig = z.infer<typeof DLinearTrainingConfigSchema>;


// Input schema for the generic training job action
const StartTrainingJobInputSchema = z.object({
  // Added DLinear to the model types
  modelType: z.enum(['LSTM', 'N-BEATS', 'LightGBM', 'DLinear']),
  // Updated union to include DLinear config
  config: z.union([LstmTrainingConfigSchema, NBeatsTrainingConfigSchema, LightGBMTrainingConfigSchema, DLinearTrainingConfigSchema]),
  trainTestSplitRatio: z.number().min(0.1).max(0.9).default(0.8),
});
export type StartTrainingJobInput = z.infer<typeof StartTrainingJobInputSchema>;

// Output schema for the training job action - remains the same
const TrainingResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  jobId: z.string().optional(),
  results: z.object({
      rmse: z.number().optional(),
      mae: z.number().optional(),
  }).optional(),
});
export type TrainingResult = z.infer<typeof TrainingResultSchema>;


// --- Helper to find Python executable ---
function getPythonExecutable(): string {
    return process.platform === 'win32' ? 'python' : 'python3';
}


// --- Generic Server Action ---

/**
 * Initiates a model training job by spawning the appropriate Python script.
 * Handles LSTM, N-BEATS (placeholder), LightGBM, and DLinear (placeholder).
 */
export async function startTrainingJob(
  input: StartTrainingJobInput
): Promise<TrainingResult> {
  console.log(`[startTrainingJob] Received request for ${input.modelType}:`, JSON.stringify(input, null, 2));

  const validationResult = StartTrainingJobInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[startTrainingJob] Invalid input:', validationResult.error);
    return { success: false, message: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}` };
  }

  const { modelType, config, trainTestSplitRatio } = validationResult.data;
  const jobId = `${modelType.toLowerCase()}-job-${Date.now()}`; // Job ID includes model type

  const pythonExecutable = getPythonExecutable();
  let scriptName = '';
  let scriptArgs: string[] = [];

  // --- Determine script and arguments based on modelType ---
  switch (modelType) {
    case 'LSTM':
      scriptName = 'train_lstm.py';
      const lstmConfig = config as LstmTrainingConfig; // Type assertion
      scriptArgs = [
        path.join(process.cwd(), 'scripts', scriptName),
        '--units', String(lstmConfig.units),
        '--layers', String(lstmConfig.layers),
        '--timesteps', String(lstmConfig.timesteps),
        '--dropout', String(lstmConfig.dropout),
        '--learning_rate', String(lstmConfig.learningRate),
        '--batch_size', String(lstmConfig.batchSize),
        '--epochs', String(lstmConfig.epochs),
        '--train_test_split_ratio', String(trainTestSplitRatio),
      ];
      break;

    case 'N-BEATS':
      scriptName = 'train_nbeats.py';
      const nbeatsConfig = config as NBeatsTrainingConfig; // Type assertion
       // Map frontend config names to Python script args if they differ
      scriptArgs = [
        path.join(process.cwd(), 'scripts', scriptName),
        '--input_chunk_length', String(nbeatsConfig.input_chunk_length),
        '--output_chunk_length', String(nbeatsConfig.output_chunk_length),
        '--num_stacks', String(nbeatsConfig.num_stacks),
        '--num_blocks', String(nbeatsConfig.num_blocks),
        '--num_layers', String(nbeatsConfig.num_layers),
        '--layer_widths', String(nbeatsConfig.layer_widths),
        '--learning_rate', String(nbeatsConfig.learningRate),
        '--batch_size', String(nbeatsConfig.batchSize),
        '--epochs', String(nbeatsConfig.epochs),
        '--train_test_split_ratio', String(trainTestSplitRatio),
      ];
      break;

    case 'LightGBM':
      scriptName = 'train_lightgbm.py';
      const lgbmConfig = config as LightGBMTrainingConfig; // Type assertion
       scriptArgs = [
         path.join(process.cwd(), 'scripts', scriptName),
         '--num_leaves', String(lgbmConfig.num_leaves),
         '--learning_rate', String(lgbmConfig.learningRate),
         '--feature_fraction', String(lgbmConfig.feature_fraction),
         '--bagging_fraction', String(lgbmConfig.bagging_fraction),
         '--bagging_freq', String(lgbmConfig.bagging_freq),
         '--boosting_type', lgbmConfig.boosting_type,
         '--num_iterations', String(lgbmConfig.numIterations), // Use numIterations for script
         '--lags', String(lgbmConfig.lags),
         '--forecast_horizon', String(lgbmConfig.forecast_horizon),
         '--train_test_split_ratio', String(trainTestSplitRatio),
         // Note: batchSize and epochs from generic config might not be used directly by LightGBM script
       ];
      break;

    case 'DLinear': // Add case for DLinear
        scriptName = 'train_dlinear.py';
        const dlinearConfig = config as DLinearTrainingConfig; // Type assertion
        scriptArgs = [
            path.join(process.cwd(), 'scripts', scriptName),
            '--input_chunk_length', String(dlinearConfig.input_chunk_length),
            '--output_chunk_length', String(dlinearConfig.output_chunk_length),
            '--kernel_size', String(dlinearConfig.kernel_size),
            '--shared_weights', String(dlinearConfig.shared_weights), // Convert boolean to string
            '--const_init', String(dlinearConfig.const_init), // Convert boolean to string
            '--learning_rate', String(dlinearConfig.learningRate),
            '--batch_size', String(dlinearConfig.batchSize),
            '--epochs', String(dlinearConfig.epochs),
            '--train_test_split_ratio', String(trainTestSplitRatio),
        ];
        break;


    default:
      console.error(`[startTrainingJob] Unsupported model type: ${modelType}`);
      return { success: false, message: `Unsupported model type: ${modelType}` };
  }

  console.log(`[startTrainingJob] Spawning ${modelType} script: ${pythonExecutable} ${scriptName} ...`);

  // --- Execute Python Script (Promise wrapper remains the same) ---
  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    try {
        const pythonProcess = spawn(pythonExecutable, scriptArgs, {
            env: { ...process.env }, // Pass environment variables
        });

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutData += output;
            console.log(`[Python STDOUT - ${modelType}] ${output}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderrData += errorOutput;
            console.error(`[Python STDERR - ${modelType}] ${errorOutput}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`[startTrainingJob] ${modelType} script finished with code ${code}`);
            // Parse output (remains the same logic)
            if (code === 0) {
                const lines = stdoutData.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                try {
                    // Attempt to parse the last line as JSON
                    const resultJson = JSON.parse(lastLine);
                    const validation = TrainingResultSchema.safeParse(resultJson); // Validate schema

                    if (validation.success) {
                         console.log(`[startTrainingJob] Parsed ${modelType} Python output:`, validation.data);
                         resolve({ ...validation.data, jobId });
                    } else {
                        console.error(`[startTrainingJob] Failed to validate ${modelType} Python JSON output:`, validation.error);
                         // Include the problematic JSON in the error message if possible
                         const invalidJsonMessage = lastLine.length < 500 ? lastLine : lastLine.substring(0, 500) + '...';
                        resolve({
                            success: false,
                            message: `${modelType} script finished (code 0), but output format is invalid. Output: ${invalidJsonMessage}. Error: ${validation.error.message}`,
                            jobId: jobId,
                        });
                    }
                } catch (parseError: any) {
                     console.error(`[startTrainingJob] Failed to parse ${modelType} Python output as JSON:`, parseError);
                     console.error(`[startTrainingJob] Raw stdout (${modelType}):`, stdoutData);
                     // Include more raw output in the error message
                     const rawOutputMessage = stdoutData.length < 500 ? stdoutData : stdoutData.slice(-500);
                    resolve({
                        success: false,
                        message: `${modelType} script finished successfully (code 0), but failed to parse output. Raw stdout: ${rawOutputMessage}`,
                        jobId: jobId,
                    });
                }
            } else {
                 // Try parsing stderr first, then stdout for error messages
                 let errorMessage = `Python script (${modelType}) exited with error code ${code}.`;
                 if (stderrData.trim()) {
                    errorMessage += ` Stderr: ${stderrData.trim().slice(-500)}`; // Limit stderr length
                 } else if (stdoutData.trim()) {
                     // Sometimes errors might be printed to stdout
                     errorMessage += ` Stdout: ${stdoutData.trim().slice(-500)}`;
                 } else {
                     errorMessage += ' No output captured. Check server logs.';
                 }

                 console.error(`[startTrainingJob] ${modelType} script failed. Code: ${code}. Stderr: ${stderrData.trim()}`);
                 console.error(`[startTrainingJob] ${modelType} script failed. Stdout: ${stdoutData.trim()}`);
                resolve({
                    success: false,
                    message: errorMessage,
                    jobId: jobId,
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error(`[startTrainingJob] Failed to start ${modelType} Python process:`, err);
            resolve({
                success: false,
                message: `Failed to start ${modelType} training process: ${err.message}. Is Python installed and in PATH?`,
                jobId: jobId,
            });
        });

    } catch (spawnError: any) {
        console.error(`[startTrainingJob] Error spawning ${modelType} Python process:`, spawnError);
        resolve({
            success: false,
            message: `Error initiating ${modelType} training: ${spawnError.message}`,
            jobId: jobId,
        });
    }
  }); // End of Promise
}
