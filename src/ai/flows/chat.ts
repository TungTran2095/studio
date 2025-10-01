'use server';

/**
 * @fileOverview Chat functionality using AI for work log queries.
 *
 * - chat - A function that processes chat messages and returns AI responses.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  prompt: z.string().describe('The user prompt or question.'),
  userId: z.string().describe('The user ID for context.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  reply: z.string().describe('The AI response to the user prompt.'),
  hasData: z.boolean().optional().describe('Whether the response contains data from work logs.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `You are a helpful assistant for a work log management system. You help users with questions about their work logs, provide summaries, and answer queries about their work history.

User ID: {{{userId}}}
User Question: {{{prompt}}}

Please provide a helpful response based on the work log context. If the question is about specific work logs or data, indicate that you would need to query the database for specific information.

Response:`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return {
      reply: output?.reply || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
      hasData: output?.hasData || false,
    };
  }
);



