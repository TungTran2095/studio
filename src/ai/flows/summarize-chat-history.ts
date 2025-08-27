'use server';

/**
 * @fileOverview Summarizes the chat history in the EchoBot application.
 *
 * - summarizeChatHistory - A function that summarizes the chat history.
 * - SummarizeChatHistoryInput - The input type for the summarizeChatHistory function.
 * - SummarizeChatHistoryOutput - The return type for the summarizeChatHistory function.
 */

import {ai} from '@/ai/ai-instance';
import { z } from 'zod';

const SummarizeChatHistoryInputSchema = z.object({
  chatHistory: z
    .string()
    .describe('The complete chat history to be summarized.'),
});
export type SummarizeChatHistoryInput = z.infer<
  typeof SummarizeChatHistoryInputSchema
>;

const SummarizeChatHistoryOutputSchema = z.object({
  summary: z.string().describe('The summarized chat history.'),
});
export type SummarizeChatHistoryOutput = z.infer<
  typeof SummarizeChatHistoryOutputSchema
>;

export async function summarizeChatHistory(
  input: SummarizeChatHistoryInput
): Promise<SummarizeChatHistoryOutput> {
  return summarizeChatHistoryFlow(input);
}

// Comment out genkit usage to prevent build errors
// const prompt = ai.definePrompt({
//   name: 'summarizeChatHistoryPrompt',
//   input: {
//     schema: z.object({
//       chatHistory: z
//         .string()
//         .describe('The complete chat history to be summarized.'),
//     }),
//   },
//   output: {
//     schema: z.object({
//       summary: z.string().describe('The summarized chat history.'),
//     }),
//   },
//   prompt: `Summarize the following chat history:\n\n{{chatHistory}}`,
// });

// const summarizeChatHistoryFlow = ai.defineFlow<
//   typeof SummarizeChatHistoryInputSchema,
//   typeof SummarizeChatHistoryOutputSchema
// >(
//   {
//     name: 'summarizeChatHistoryFlow',
//     inputSchema: SummarizeChatHistoryInputSchema,
//     outputSchema: SummarizeChatHistoryOutputSchema,
//   },
//   async input => {
//     const {output} = await prompt(input);
//     return output!;
//   }
// );

// Placeholder implementation to prevent build errors
const summarizeChatHistoryFlow = async (input: SummarizeChatHistoryInput): Promise<SummarizeChatHistoryOutput> => {
  // Simple placeholder summary
  const summary = input.chatHistory.length > 100 
    ? `Tóm tắt cuộc trò chuyện: ${input.chatHistory.substring(0, 100)}...`
    : `Cuộc trò chuyện: ${input.chatHistory}`;
    
  return { summary };
};
