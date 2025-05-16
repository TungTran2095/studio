
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

// Informer Config Schema (Example common parameters)
const InformerTrainingConfigSchema = z.object({
    seq_len: z.number().int().positive().default(96), // Input sequence length
    pred_len: z.number().int().positive().default(24), // Prediction horizon
    d_model: z.number().int().positive().default(512), // Model dimension
    n_heads: z.number().int().positive().default(8), // Number of attention heads
    e_layers: z.number().int().positive().default(2), // Encoder layers
    d_layers: z.number().int().positive().default(1), // Decoder layers
    d_ff: z.number().int().positive().default(2048), // Feedforward dimension
    dropout: z.number().min(0).max(0.8).default(0.05),
    activation: z.enum(['relu', 'gelu']).default('gelu'),
    learningRate: z.number().positive().default(0.0001),
    batchSize: z.number().int().positive().default(32),
    epochs: z.number().int().positive().default(10),
});
export type InformerTrainingConfig = z.infer<typeof InformerTrainingConfigSchema>;

// DeepAR Config Schema (Example common parameters based on Darts)
const DeepARTrainingConfigSchema = z.object({
    input_chunk_length: z.number().int().positive().default(20),
    output_chunk_length: z.number().int().positive().default(5),
    hidden_dim: z.number().int().positive().default(40),
    n_rnn_layers: z.number().int().positive().default(2),
    dropout: z.number().min(0).max(0.8).default(0.1),
    likelihood: z.enum(['Gaussian', 'NegativeBinomial', 'Poisson']).default('Gaussian').describe("Likelihood function to use."),
    learningRate: z.number().positive().default(0.001),
    batchSize: z.number().int().positive().default(64),
    epochs: z.number().int().positive().default(100),
});
export type DeepARTrainingConfig = z.infer<typeof DeepARTrainingConfigSchema>;


// Input schema for the generic training job action
const StartTrainingJobInputSchema = z.object({
  // Add Informer and DeepAR to the model types
  modelType: z.enum(['LSTM', 'N-BEATS', 'LightGBM', 'DLinear', 'Informer', 'DeepAR']),
  // Updated union to include Informer and DeepAR config
  config: z.union([
      LstmTrainingConfigSchema,
      NBeatsTrainingConfigSchema,
      LightGBMTrainingConfigSchema,
      DLinearTrainingConfigSchema,
      InformerTrainingConfigSchema,
      DeepARTrainingConfigSchema, // Added DeepAR schema
    ]),
  trainTestSplitRatio: z.number().min(0.1).max(0.9).default(0.8),
  // Added target_column and feature_columns for flexibility across models
  target_column: z.string().default('close'),
  feature_columns: z.array(z.string()).default(['open', 'high', 'low', 'close', 'volume']),
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
    // Prioritize checking for a virtual environment python first
    const venvPythonWin = path.join(process.cwd(), 'venv', 'Scripts', 'python.exe');
    const venvPythonUnix = path.join(process.cwd(), 'venv', 'bin', 'python');
    const venvPython3Unix = path.join(process.cwd(), 'venv', 'bin', 'python3');

    // This basic check isn't foolproof but covers common cases
    // A more robust check would involve `fs.existsSync`
    // For simplicity, we'll assume if venv paths *might* exist, prioritize them.
    if (process.platform === 'win32') {
        // Check venvPythonWin existence ideally, fallback to global 'python'
        return 'python'; // Simplification: Assume 'python' is in PATH or venv is active
    } else {
        // Check venvPython3Unix, then venvPythonUnix, fallback to global 'python3'
        return 'python3'; // Simplification: Assume 'python3' is in PATH or venv is active
    }
    // Note: A better approach involves environment checks or config files.
}


// --- Generic Server Action ---

/**
 * Initiates a model training job by spawning the appropriate Python script.
 * Handles LSTM, N-BEATS (placeholder), LightGBM, DLinear (placeholder), Informer (placeholder), DeepAR (placeholder).
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

  const { modelType, config, trainTestSplitRatio, target_column, feature_columns } = validationResult.data;
  const jobId = `${modelType.toLowerCase()}-job-${Date.now()}`; // Job ID includes model type

  const pythonExecutable = getPythonExecutable();
  let scriptName = '';
  let scriptArgs: string[] = [];

  // Common args for all scripts
  const commonArgs = [
     '--train_test_split_ratio', String(trainTestSplitRatio),
     '--target_column', target_column,
     '--feature_columns', ...feature_columns, // Spread feature column array
  ];

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
        ...commonArgs, // Add common arguments
      ];
      break;

    case 'N-BEATS':
      scriptName = 'train_nbeats.py';
      const nbeatsConfig = config as NBeatsTrainingConfig; // Type assertion
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
        ...commonArgs,
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
         ...commonArgs,
       ];
      break;

    case 'DLinear':
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
            ...commonArgs,
        ];
        break;

    case 'Informer': // Add case for Informer
        scriptName = 'train_informer.py';
        const informerConfig = config as InformerTrainingConfig; // Type assertion
        scriptArgs = [
            path.join(process.cwd(), 'scripts', scriptName),
            '--seq_len', String(informerConfig.seq_len),
            '--pred_len', String(informerConfig.pred_len),
            '--d_model', String(informerConfig.d_model),
            '--n_heads', String(informerConfig.n_heads),
            '--e_layers', String(informerConfig.e_layers),
            '--d_layers', String(informerConfig.d_layers),
            '--d_ff', String(informerConfig.d_ff),
            '--dropout', String(informerConfig.dropout),
            '--activation', informerConfig.activation,
            '--learning_rate', String(informerConfig.learningRate),
            '--batch_size', String(informerConfig.batchSize),
            '--epochs', String(informerConfig.epochs),
            ...commonArgs,
        ];
        break;

    case 'DeepAR': // Add case for DeepAR
        scriptName = 'train_deepar.py';
        const deeparConfig = config as DeepARTrainingConfig; // Type assertion
        scriptArgs = [
            path.join(process.cwd(), 'scripts', scriptName),
            '--input_chunk_length', String(deeparConfig.input_chunk_length),
            '--output_chunk_length', String(deeparConfig.output_chunk_length),
            '--hidden_dim', String(deeparConfig.hidden_dim),
            '--n_rnn_layers', String(deeparConfig.n_rnn_layers),
            '--dropout', String(deeparConfig.dropout),
            '--likelihood', deeparConfig.likelihood,
            '--learning_rate', String(deeparConfig.learningRate),
            '--batch_size', String(deeparConfig.batchSize),
            '--epochs', String(deeparConfig.epochs),
            ...commonArgs,
        ];
        break;


    default:
      // Assert exhaustive check - this should ideally not be reached if types match
      // const _exhaustiveCheck: never = modelType;
      console.error(`[startTrainingJob] Unsupported model type: ${modelType}`);
      return { success: false, message: `Unsupported model type: ${modelType}` };
  }

  console.log(`[startTrainingJob] Spawning ${modelType} script: ${pythonExecutable} ${scriptName} ...`);
  console.log("[startTrainingJob] With args:", scriptArgs.join(" "));

  // --- Execute Python Script (Promise wrapper remains the same) ---
  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let scriptOutputParsed = false; // Flag to ensure we only parse JSON once

    try {
        const pythonProcess = spawn(pythonExecutable, scriptArgs, {
            env: { ...process.env, // Pass existing env vars
                   PYTHONUNBUFFERED: "1", // Often helps with real-time output
            },
        });

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutData += output;
            console.log(`[Python STDOUT - ${modelType}] ${output.trim()}`); // Log trimmed output

            // Attempt to parse JSON from the last line if it looks like JSON
             // Be cautious: multiple JSON objects might be printed if script isn't careful
            const lines = stdoutData.trim().split('\n');
            const lastLine = lines[lines.length - 1];
             if (lastLine.startsWith('{') && lastLine.endsWith('}') && !scriptOutputParsed) {
                 try {
                     const resultJson = JSON.parse(lastLine);
                     const validation = TrainingResultSchema.safeParse(resultJson);

                     if (validation.success) {
                         scriptOutputParsed = true; // Mark as parsed
                         console.log(`[startTrainingJob] Parsed final JSON output from ${modelType}:`, validation.data);
                         // Resolve here if you expect JSON output before the script closes
                         // resolve({ ...validation.data, jobId });
                     } else {
                         console.warn(`[startTrainingJob] Last line looks like JSON but failed validation: ${validation.error.message}. Line: ${lastLine}`);
                     }
                 } catch (parseError) {
                     // Ignore if parsing fails, might be intermediate output
                      // console.warn(`[startTrainingJob] Failed to parse last stdout line as JSON: ${lastLine}`);
                 }
             }

        });

        pythonProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderrData += errorOutput;
            console.error(`[Python STDERR - ${modelType}] ${errorOutput.trim()}`); // Log trimmed error output
        });

        pythonProcess.on('close', (code) => {
            console.log(`[startTrainingJob] ${modelType} script finished with code ${code}`);

             // If JSON wasn't parsed from stdout stream, try parsing the complete stdout now
             if (!scriptOutputParsed) {
                 const lines = stdoutData.trim().split('\n');
                 const lastLine = lines[lines.length - 1];
                 try {
                     const resultJson = JSON.parse(lastLine);
                     const validation = TrainingResultSchema.safeParse(resultJson);

                     if (validation.success) {
                         console.log(`[startTrainingJob] Parsed ${modelType} Python output on close:`, validation.data);
                         resolve({ ...validation.data, jobId });
                         return; // Exit after resolving
                     } else {
                          console.error(`[startTrainingJob] Failed to validate ${modelType} Python JSON output on close:`, validation.error);
                          const invalidJsonMessage = lastLine.length < 500 ? lastLine : lastLine.substring(0, 500) + '...';
                          resolve({
                              success: false,
                              message: `${modelType} script finished (code ${code ?? 'unknown'}), but output format is invalid. Output: ${invalidJsonMessage}. Error: ${validation.error.message}`,
                              jobId: jobId,
                          });
                          return;
                     }
                 } catch (parseError: any) {
                      console.error(`[startTrainingJob] Failed to parse final ${modelType} Python output as JSON:`, parseError);
                      console.error(`[startTrainingJob] Raw stdout (${modelType}):`, stdoutData);
                 }
             } else if (code !== 0 && scriptOutputParsed) {
                // If JSON was parsed but script exited with error code, resolve with success false?
                // Let's prioritize the parsed JSON but maybe add a warning
                console.warn(`[startTrainingJob] ${modelType} script parsed JSON but exited with code ${code}. Check stderr logs.`);
                // Assuming the JSON output is the primary result source, we might still resolve based on it
                // Find the parsed JSON again (or store it when parsed initially)
                const lines = stdoutData.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                 try {
                     const resultJson = JSON.parse(lastLine);
                     const validation = TrainingResultSchema.safeParse(resultJson);
                     if (validation.success) {
                         resolve({ ...validation.data, message: `${validation.data.message} (Warning: Script exited with code ${code})`, jobId });
                         return;
                     }
                 } catch {} // Ignore parse error here, handled below
             }


            // --- Fallback / Error Handling if JSON parsing failed or code != 0 ---
             let errorMessage = `Python script (${modelType}) finished.`;
             if (code !== 0) {
                 errorMessage = `Python script (${modelType}) exited with error code ${code}.`;
             }

             // Append stderr if available
             if (stderrData.trim()) {
                errorMessage += ` Stderr: ${stderrData.trim().slice(-500)}`; // Limit stderr length
             }
             // Append stdout if stderr is empty but stdout might contain error info (and wasn't valid JSON)
             else if (stdoutData.trim() && !scriptOutputParsed) {
                 errorMessage += ` Stdout: ${stdoutData.trim().slice(-500)}`;
             }
              // Append message if no output was captured
              else if (!stderrData.trim() && !stdoutData.trim()) {
                  errorMessage += ' No output captured. Check server logs or script path.';
              }


             console.error(`[startTrainingJob] ${modelType} script failed or produced invalid output. Code: ${code}. Stderr: ${stderrData.trim()}`);
             console.error(`[startTrainingJob] ${modelType} script stdout (if relevant): ${stdoutData.trim()}`);

            // Resolve with failure if code is non-zero OR if code is zero but JSON parsing failed
            if (code !== 0 || !scriptOutputParsed) {
                 resolve({
                     success: false,
                     message: errorMessage,
                     jobId: jobId,
                 });
            }
            // If code is 0 and JSON *was* parsed earlier, it should have resolved already.
            // This else block is a safeguard but ideally shouldn't be reached if logic above is correct.
            else {
                 resolve({
                    success: true, // Assume success if code is 0 and JSON was parsed
                    message: `Training completed (final status check).`, // Generic message
                    jobId: jobId,
                    // Include results if stored from initial parse
                 })
            }

        });

        pythonProcess.on('error', (err) => {
            console.error(`[startTrainingJob] Failed to start ${modelType} Python process:`, err);
            // Check for common errors like 'ENOENT' (command not found)
             let detail = err.message;
             if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                 detail = `Command '${pythonExecutable}' not found. Is Python installed and in PATH, or is the virtual environment active?`;
             }
            resolve({
                success: false,
                message: `Failed to start ${modelType} training process: ${detail}`,
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


