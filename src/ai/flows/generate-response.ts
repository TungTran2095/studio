'use server';

/**
 * @fileOverview A chatbot AI agent capable of handling conversation and executing Binance trades.
 *
 * - generateResponse - A function that handles the chatbot conversation and potential trading actions.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { placeBuyOrderTool, placeSellOrderTool } from '@/ai/tools/binance-tools';

// Input schema now includes optional API credentials.
// WARNING: Passing credentials directly like this is INSECURE for production.
// Consider fetching credentials securely server-side based on user session.
const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The message from the user.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'bot']),
    content: z.string(),
  })).optional().describe('The chat history of the conversation.'),
  // Optional API credentials - needed for trading tools if passed directly.
  // REMOVE THESE in production and fetch securely server-side within the tool.
  apiKey: z.string().optional().describe('(INSECURE - For Demo Only) Binance API Key if trading is intended.'),
  apiSecret: z.string().optional().describe('(INSECURE - For Demo Only) Binance API Secret if trading is intended.'),
  isTestnet: z.boolean().optional().default(false).describe('Whether to use the Binance testnet for trading.')
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The response from the AI, potentially including trade confirmation or errors.'),
});

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
    // Important Security Note: If apiKey/apiSecret are present in input, it's insecure.
    // In a real app, they should be retrieved server-side within the tool execution,
    // not passed through the client-facing flow input.
    // For this example, we proceed with the potentially insecure direct passing if provided.
    if (input.apiKey && input.apiSecret) {
         console.warn("API credentials passed directly in input. This is insecure for production!");
    } else {
         console.log("API credentials not provided in input. Trading tools will likely fail unless fetched server-side.");
         // If credentials ARE required and not provided, you might want to return an error early:
         // return { response: "Trading actions require API credentials to be configured." };
    }

    return generateResponseFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  // Include the trading tools
  tools: [placeBuyOrderTool, placeSellOrderTool],
  input: {
    // Input schema now includes the optional, insecure API keys
    schema: GenerateResponseInputSchema,
  },
  output: {
    schema: GenerateResponseOutputSchema,
  },
  prompt: `You are YINSEN, a helpful trading assistant chatbot integrated with Binance. Respond to the user message, taking into account the chat history.

Your Capabilities:
- General conversation and answering questions about trading or crypto.
- Placing BUY and SELL orders on Binance using the provided tools.

Trading Instructions:
- If the user expresses intent to BUY or SELL a cryptocurrency:
    - Identify the cryptocurrency (e.g., "Bitcoin", "ETH", "BTC"). Infer the standard USDT trading pair symbol (e.g., BTC -> BTCUSDT, ETH -> ETHUSDT) unless a different pair is specified.
    - Identify the quantity to trade.
    - Determine the order type. Default to MARKET order unless the user specifies a price (then use LIMIT).
    - **Crucially: You MUST have the API Key and API Secret to use the trading tools.** These might be provided in the input context (apiKey, apiSecret). If they are not available, politely inform the user that you cannot execute the trade without configured API credentials. Do not attempt to use the tool without credentials.
    - If all necessary parameters (symbol, quantity, credentials, price for limit orders) are clear, use the 'placeBuyOrderTool' or 'placeSellOrderTool' with the extracted information and the provided apiKey, apiSecret, and isTestnet status.
    - If any parameter (especially quantity or symbol) is unclear or missing, ASK the user for clarification before attempting to use a tool. Do not guess quantities or symbols if ambiguous.
    - After attempting a trade using a tool, report the result (success message with order ID, or the error message) back to the user clearly.

Chat History:
{{#each chatHistory}}
{{this.role}}: {{this.content}}
{{/each}}

User Message: {{message}}

Response:`,
});


const generateResponseFlow = ai.defineFlow<
  typeof GenerateResponseInputSchema,
  typeof GenerateResponseOutputSchema
>({
  name: 'generateResponseFlow',
  inputSchema: GenerateResponseInputSchema,
  outputSchema: GenerateResponseOutputSchema,
}, async (input) => {
    console.log("generateResponseFlow input:", JSON.stringify(input, null, 2));

    // Construct the prompt input, including potentially insecure credentials if passed.
    // In production, remove apiKey and apiSecret from here. The tools would fetch them.
    const promptInput: GenerateResponseInput = {
      message: input.message,
      chatHistory: input.chatHistory,
       ...(input.apiKey && { apiKey: input.apiKey }),
       ...(input.apiSecret && { apiSecret: input.apiSecret }),
       isTestnet: input.isTestnet
    };

    const response = await prompt(promptInput); // Pass potentially insecure credentials

    // Check if the model decided to use a tool
    if (response.toolRequests && response.toolRequests.length > 0) {
        console.log("Tool requests generated:", JSON.stringify(response.toolRequests, null, 2));
        // Normally, you would execute the tools here and return their output to the model.
        // Genkit handles this automatically when using definePrompt with tools.
        // The final 'response.output' will contain the model's response *after* considering the tool results.
    } else {
         console.log("No tool requests generated.");
    }

    if (!response.output) {
      console.error("Error: Flow did not return output.", response);
      return { response: "Sorry, I encountered an error. Please try again." };
    }

    console.log("Final AI Response:", response.output.response);
    return response.output;
});
