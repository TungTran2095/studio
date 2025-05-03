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

// Input schema still includes optional API credentials.
// These MUST be passed from the client if trading is intended.
const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The message from the user.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'bot']),
    content: z.string(),
  })).optional().describe('The chat history of the conversation.'),
  // Optional API credentials - MUST be passed from the client component if trading is needed.
  apiKey: z.string().optional().describe('Binance API Key required for trading.'),
  apiSecret: z.string().optional().describe('Binance API Secret required for trading.'),
  isTestnet: z.boolean().optional().default(false).describe('Whether to use the Binance testnet for trading.')
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The response from the AI, potentially including trade confirmation or errors.'),
});

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
    // Log whether credentials were provided in the input
    if (input.apiKey && input.apiSecret) {
         console.log("[generateResponse] API credentials provided in input. Trading tools can be attempted.");
    } else {
         console.log("[generateResponse] API credentials NOT provided in input. Trading tools will fail.");
         // The AI prompt should handle informing the user if credentials are required but missing.
    }

    return generateResponseFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  // Include the trading tools
  tools: [placeBuyOrderTool, placeSellOrderTool],
  input: {
    // Input schema includes optional API keys to be passed from client
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
    - **Crucially: You MUST have the API Key and API Secret to use the trading tools.** These credentials should be passed in the input context (apiKey, apiSecret).
    - **If the apiKey or apiSecret are NOT available in the input context, politely inform the user that you cannot execute the trade without the API credentials being configured in the 'Binance Account' section first.** Do not attempt to use the tool without credentials.
    - If all necessary parameters (symbol, quantity, available credentials, price for limit orders) are clear, use the 'placeBuyOrderTool' or 'placeSellOrderTool' with the extracted information and the provided apiKey, apiSecret, and isTestnet status from the input context.
    - If any parameter (especially quantity or symbol) is unclear or missing, ASK the user for clarification before attempting to use a tool. Do not guess quantities or symbols if ambiguous.
    - After attempting a trade using a tool, **you MUST generate a final text response confirming the outcome (success with order ID, or the error message from the tool) back to the user clearly.** Your final output MUST be a JSON object with a single key "response" containing this text message. Example: { "response": "Successfully placed buy order..." } or { "response": "Error placing order: ..." }.

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
        apiKeyProvided: !!input.apiKey,
        apiSecretProvided: !!input.apiSecret,
        isTestnet: input.isTestnet
    });

    // Prepare the input for the prompt, passing along credentials if they exist.
    // The prompt now knows to look for these in the input context.
    const promptInput: GenerateResponseInput = {
      message: input.message,
      chatHistory: input.chatHistory,
       ...(input.apiKey && { apiKey: input.apiKey }), // Pass only if exists
       ...(input.apiSecret && { apiSecret: input.apiSecret }), // Pass only if exists
       isTestnet: input.isTestnet ?? false // Ensure boolean is passed
    };

    let response;
    try {
        console.log("[generateResponseFlow] Calling prompt...");
        response = await prompt(promptInput); // Pass input containing credentials if available
        console.log("[generateResponseFlow] Received raw response from prompt/tool execution:", JSON.stringify(response, null, 2));

    } catch (error: any) {
        console.error("[generateResponseFlow] Error calling prompt:", error);
         // Ensure the error response also matches the schema
        return { response: `Sorry, I encountered an error processing your request: ${error.message || 'Unknown error'}` };
    }


    if (response?.toolRequests?.length > 0) {
        console.log("[generateResponseFlow] Tool requests were generated and handled by Genkit.");
        // Genkit handles tool execution and feeding results back to the model automatically.
        // The 'response' object here *should* contain the final output *after* tool use.
    } else {
         console.log("[generateResponseFlow] No tool requests generated by the LLM.");
    }

    // **** Explicitly check if the output is null or undefined ****
    // This check already exists and is likely triggering the user's error.
    if (response?.output === null || response?.output === undefined) {
      console.error("[generateResponseFlow] Error: Flow returned null or undefined output. Raw response:", JSON.stringify(response, null, 2));
      // Return a valid object matching the schema, explaining the internal issue.
      return { response: "Sorry, I couldn't generate a valid response in the expected format after processing your request. Please try again." };
    }

     // If the output exists but doesn't match the schema, Genkit's validation will throw.
     // The `catch` block above should handle this. If not, it implies a deeper issue.
    console.log("[generateResponseFlow] Final AI Response (validated):", response.output.response);
    return response.output; // Return the validated output
});
