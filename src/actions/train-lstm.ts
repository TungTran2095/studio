
// src/actions/train-lstm.ts
'use server';

import { z } from 'zod';
import { spawn } from 'child_process'; // Import spawn
import path from 'path';

// --- Schemas ---

// Define the structure for LSTM training configuration
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

// Input schema for the training job action
const StartLstmTrainingJobInputSchema = z.object({
  config: LstmTrainingConfigSchema,
  trainTestSplitRatio: z.number().min(0.1).max(0.9).default(0.8), // e.g., 0.8 for 80% train
});
export type StartLstmTrainingJobInput = z.infer<typeof StartLstmTrainingJobInputSchema>;

// Output schema for the training job action
// Matches the JSON output structure of the Python script
const LstmTrainingResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(), // Make message optional
  jobId: z.string().optional(), // Keep jobId for potential future async tracking
  results: z.object({
      rmse: z.number().optional(),
      mae: z.number().optional(),
  }).optional(),
});
export type LstmTrainingResult = z.infer<typeof LstmTrainingResultSchema>;


// --- Helper to find Python executable ---
function getPythonExecutable(): string {
    // Simple check for 'python3' first, then 'python'
    // In production, ensure the correct Python path is configured in the environment
    return process.platform === 'win32' ? 'python' : 'python3';
}


// --- Server Action ---

/**
 * Initiates an LSTM model training job by spawning a Python script.
 *
 * IMPORTANT: This action executes a Python script locally.
 * Ensure Python 3, TensorFlow, pandas, scikit-learn, supabase-py, python-dotenv
 * are installed in the environment where the Next.js server runs.
 * For production, consider a dedicated backend or serverless function for training.
 */
export async function startLstmTrainingJob(
  input: StartLstmTrainingJobInput
): Promise<LstmTrainingResult> {
  console.log('[startLstmTrainingJob] Received request:', JSON.stringify(input, null, 2));

  const validationResult = StartLstmTrainingJobInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[startLstmTrainingJob] Invalid input:', validationResult.error);
    return { success: false, message: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}` };
  }

  const { config, trainTestSplitRatio } = validationResult.data;
  const jobId = `lstm-job-${Date.now()}`; // Simple job ID

  const pythonExecutable = getPythonExecutable();
  // Correct path assuming script is in project_root/scripts/train_lstm.py
  const scriptPath = path.join(process.cwd(), 'scripts', 'train_lstm.py');

  // Prepare arguments for the Python script
  const args = [
    scriptPath,
    '--units', String(config.units),
    '--layers', String(config.layers),
    '--timesteps', String(config.timesteps),
    '--dropout', String(config.dropout),
    '--learning_rate', String(config.learningRate),
    '--batch_size', String(config.batchSize),
    '--epochs', String(config.epochs),
    '--train_test_split_ratio', String(trainTestSplitRatio),
    // Add other args if needed (e.g., --feature_columns, --target_column)
  ];

  console.log(`[startLstmTrainingJob] Spawning Python script: ${pythonExecutable} ${args.join(' ')}`);

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    try {
        // Spawn the Python process
        const pythonProcess = spawn(pythonExecutable, args, {
             // Ensure environment variables from .env are passed to the Python script
            env: { ...process.env },
        });

        // Listen for data from stdout
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutData += output;
            console.log(`[Python STDOUT] ${output}`); // Log Python output
        });

        // Listen for data from stderr
        pythonProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderrData += errorOutput;
            console.error(`[Python STDERR] ${errorOutput}`); // Log Python errors
        });

        // Listen for process exit
        pythonProcess.on('close', (code) => {
            console.log(`[startLstmTrainingJob] Python script finished with code ${code}`);

            if (code === 0) {
                 // Try to parse the last line of stdout as JSON
                const lines = stdoutData.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                try {
                    const result: LstmTrainingResult = JSON.parse(lastLine);
                    // Validate the parsed result against the Zod schema
                    const validation = LstmTrainingResultSchema.safeParse(result);
                    if (validation.success) {
                         console.log("[startLstmTrainingJob] Parsed Python output:", validation.data);
                         resolve({ ...validation.data, jobId }); // Add jobId
                    } else {
                        console.error("[startLstmTrainingJob] Failed to validate Python JSON output:", validation.error);
                        resolve({
                            success: false,
                            message: `Training script finished, but output format is invalid. Check Python script output. Error: ${validation.error.message}`,
                            jobId: jobId,
                        });
                    }
                } catch (parseError: any) {
                     console.error("[startLstmTrainingJob] Failed to parse Python output as JSON:", parseError);
                     console.error("[startLstmTrainingJob] Raw stdout:", stdoutData);
                    resolve({
                        success: false,
                        message: `Training script finished, but failed to parse output. Raw output: ${stdoutData.slice(-200)}`, // Show last part of output
                        jobId: jobId,
                    });
                }
            } else {
                // Script exited with an error code
                 const errorMessage = stderrData.trim() || `Python script exited with error code ${code}.`;
                resolve({
                    success: false,
                    message: errorMessage,
                    jobId: jobId,
                });
            }
        });

        // Handle errors during spawning (e.g., Python not found)
        pythonProcess.on('error', (err) => {
            console.error('[startLstmTrainingJob] Failed to start Python process:', err);
            resolve({
                success: false,
                message: `Failed to start training process: ${err.message}. Is Python installed and in PATH?`,
                jobId: jobId,
            });
        });

    } catch (spawnError: any) {
        console.error('[startLstmTrainingJob] Error spawning Python process:', spawnError);
        resolve({
            success: false,
            message: `Error initiating training: ${spawnError.message}`,
            jobId: jobId,
        });
    }
  }); // End of Promise
}
