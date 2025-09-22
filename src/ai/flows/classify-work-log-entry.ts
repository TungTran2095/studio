'use server';

/**
 * @fileOverview Classifies work log entries into high-level categories using AI.
 *
 * - classifyWorkLogEntry - A function that classifies a work log entry.
 * - ClassifyWorkLogEntryInput - The input type for the classifyWorkLogEntry function.
 * - ClassifyWorkLogEntryOutput - The return type for the classifyWorkLogEntry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyWorkLogEntryInputSchema = z.object({
  title: z.string().describe('The title of the work log entry.'),
  description: z.string().describe('A detailed description of the work log entry.'),
});
export type ClassifyWorkLogEntryInput = z.infer<typeof ClassifyWorkLogEntryInputSchema>;

const ClassifyWorkLogEntryOutputSchema = z.object({
  category: z.string().describe('The predicted category for the work log entry.'),
  confidence: z.number().describe('The confidence level of the category prediction (0-1).'),
});
export type ClassifyWorkLogEntryOutput = z.infer<typeof ClassifyWorkLogEntryOutputSchema>;

export async function classifyWorkLogEntry(input: ClassifyWorkLogEntryInput): Promise<ClassifyWorkLogEntryOutput> {
  return classifyWorkLogEntryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyWorkLogEntryPrompt',
  input: {schema: ClassifyWorkLogEntryInputSchema},
  output: {schema: ClassifyWorkLogEntryOutputSchema},
  prompt: `You are a work log classifier. Given the title and description of a work log entry, you will classify it into one of the following high-level categories: Project Management, Software Development, Documentation, Testing, Research, or Other. You must also predict your confidence (0-1) that your classification is correct.

Title: {{{title}}}
Description: {{{description}}}

Category:`,
});

const classifyWorkLogEntryFlow = ai.defineFlow(
  {
    name: 'classifyWorkLogEntryFlow',
    inputSchema: ClassifyWorkLogEntryInputSchema,
    outputSchema: ClassifyWorkLogEntryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
