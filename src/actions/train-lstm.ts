// src/actions/train-lstm.ts
'use server';

import { z } from 'zod';

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
  // Add other necessary inputs like data source identifiers if needed
});
export type StartLstmTrainingJobInput = z.infer<typeof StartLstmTrainingJobInputSchema>;

// Output schema for the training job action
const LstmTrainingResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  jobId: z.string().optional(), // Optional: ID of the backend training job
  results: z.object({
      rmse: z.number().optional(), // Root Mean Squared Error
      mae: z.number().optional(), // Mean Absolute Error
      // Add other relevant metrics
  }).optional(),
});
export type LstmTrainingResult = z.infer<typeof LstmTrainingResultSchema>;

// --- Server Action ---

/**
 * Initiates an LSTM model training job.
 *
 * IMPORTANT: This action simulates triggering an external backend process
 * (e.g., a Cloud Function, separate API) where the actual Python/TensorFlow
 * training would occur. It does NOT perform the training within the Next.js server action.
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
  const jobId = `lstm-job-${Date.now()}`; // Simple simulated job ID

  // --- SIMULATION: Triggering External Backend ---
  // In a real application, you would replace this section with a call to your backend:
  // - Make an HTTP request to a Cloud Function/API endpoint.
  // - Pass the `config` and `trainTestSplitRatio`.
  // - The backend would queue/start the Python training script.
  // - This action might return immediately with the jobId, and the frontend
  //   could poll for status, or the backend could notify upon completion (e.g., via WebSocket, webhook).

  console.log(`[startLstmTrainingJob] Simulating call to external backend for job ${jobId}...`);
  // Simulate processing/training time
  await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate 5 seconds

  // Simulate success or failure from the backend
  const backendSuccess = Math.random() > 0.2; // 80% chance of success

  if (backendSuccess) {
    console.log(`[startLstmTrainingJob] Simulated backend job ${jobId} completed successfully.`);
    // Simulate some results
    const simulatedRMSE = Math.random() * 50 + 10;
    const simulatedMAE = Math.random() * 40 + 8;
    return {
      success: true,
      message: `Training job ${jobId} completed.`,
      jobId: jobId,
      results: {
        rmse: simulatedRMSE,
        mae: simulatedMAE,
      },
    };
  } else {
    console.error(`[startLstmTrainingJob] Simulated backend job ${jobId} failed.`);
    return {
      success: false,
      message: `Backend training job ${jobId} failed (simulated). Check backend logs.`,
      jobId: jobId,
    };
  }
  // --- END SIMULATION ---
}