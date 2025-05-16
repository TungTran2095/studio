'use server';

/**
 * @fileOverview A chatbot AI agent capable of handling conversation. Trading functionality has been removed.
 *
 * - generateResponse - A function that handles the chatbot conversation.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// Removed import for placeBuyOrderTool, placeSellOrderTool from '@/ai/tools/binance-tools'

// Input schema no longer needs API credentials.
const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The message from the user.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'bot']),
    content: z.string(),
  })).optional().describe('The chat history of the conversation.'),
  // Removed apiKey, apiSecret, isTestnet fields
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The response from the AI.'),
});

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
    // No longer need to log credentials
    console.log("[generateResponse] Received message for AI processing.");
    return generateResponseFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  // Removed tools: [placeBuyOrderTool, placeSellOrderTool]
  input: {
    // Input schema no longer includes API keys
    schema: GenerateResponseInputSchema,
  },
  output: {
    schema: GenerateResponseOutputSchema,
  },
  // Updated prompt to remove trading instructions
  prompt: `You are YINSEN, a helpful trading assistant chatbot. Respond to the user message, taking into account the chat history.

Your Capabilities:
- General conversation and answering questions about trading, cryptocurrencies, or market analysis.
- You cannot execute trades directly. Advise the user to use the dedicated trading panel for placing orders.

Chat History:
{{#each chatHistory}}
{{this.role}}: {{this.content}}
{{/each}}

User Message: {{message}}

Response:`, // Ensure the final word is Response:, prompting for the JSON structure.
});


const generateResponseFlow = ai.defineFlow<
  typeof GenerateResponseInputSchema,
  typeof GenerateResponseOutputSchema
>({
  name: 'generateResponseFlow',
  inputSchema: GenerateResponseInputSchema,
  outputSchema: GenerateResponseOutputSchema,
}, async (input) => {
    console.log("[generateResponseFlow] Input received:", {
        message: input.message,
        chatHistoryLength: input.chatHistory?.length,
        // Removed credential logging
    });

    // Prepare the input for the prompt. Credentials are no longer passed.
    const promptInput: GenerateResponseInput = {
      message: input.message,
      chatHistory: input.chatHistory,
    };

    let response;
    try {
        console.log("[generateResponseFlow] Calling prompt...");
        response = await prompt(promptInput); // Pass input without credentials
        console.log("[generateResponseFlow] Received raw response from prompt:", JSON.stringify(response, null, 2));

    } catch (error: any) {
        console.error("[generateResponseFlow] Error calling prompt:", error);
        return { response: `Sorry, I encountered an error processing your request: ${error.message || 'Unknown error'}` };
    }

    // Tool request handling is no longer needed
    // if (response?.toolRequests?.length > 0) { ... }

    if (response?.output === null || response?.output === undefined) {
      console.error("[generateResponseFlow] Error: Flow returned null or undefined output. Raw response:", JSON.stringify(response, null, 2));
      return { response: "Sorry, I couldn't generate a valid response in the expected format. Please try again." };
    }

    console.log("[generateResponseFlow] Final AI Response (validated):", response.output.response);
    return response.output; // Return the validated output
});
