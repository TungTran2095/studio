'use server';

/**
 * @fileOverview A chatbot AI agent capable of handling conversation. Trading functionality will be handled separately.
 *
 * - generateResponse - A function that handles the chatbot conversation.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Input schema includes API credentials (for context only)
const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The message from the user.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'bot', 'model']),
    content: z.string(),
  })).optional().describe('The chat history of the conversation.'),
  apiKey: z.string().optional().describe('Binance API key for trading.'),
  apiSecret: z.string().optional().describe('Binance API secret for trading.'),
  isTestnet: z.boolean().optional().default(false).describe('Use Binance testnet?'),
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The response from the AI.'),
  // Add trading intent detection
  tradingIntent: z.object({
    detected: z.boolean().describe('Có phát hiện ý định giao dịch không'),
    action: z.enum(['BUY', 'SELL', 'NONE']).describe('Hành động giao dịch'),
    symbol: z.string().optional().describe('Mã tiền, ví dụ: BTC, ETH'),
    quantity: z.number().optional().describe('Số lượng'),
    orderType: z.enum(['MARKET', 'LIMIT', 'NONE']).describe('Loại lệnh'),
    price: z.number().optional().describe('Giá cho lệnh LIMIT'),
  }).optional(),
});

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
    // Mask credentials for logging
    console.log("[generateResponse] Received message for AI processing.", {
      apiKeyProvided: !!input.apiKey,
      apiSecretProvided: !!input.apiSecret,
      isTestnet: input.isTestnet || false,
    });
    return generateResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {
    schema: GenerateResponseInputSchema,
  },
  output: {
    schema: GenerateResponseOutputSchema,
  },
  prompt: `You are YINSEN, a helpful Vietnamese trading assistant chatbot that specializes in cryptocurrency trading. Respond to the user message in Vietnamese, taking into account the chat history.

Your Capabilities:
- General conversation and answering questions about trading, cryptocurrencies, or market analysis.
- Detect when users want to place trading orders (but don't execute them directly)
- When users express trading intent, include structured data about the trade in your response

Trading Intent Examples:
1. "mua 0.1 BTC market" -> Detect BUY intent for 0.1 BTC as MARKET order
2. "bán 0.05 BTC" -> Detect SELL intent for 0.05 BTC as MARKET order
3. "đặt lệnh mua 0.01 BTC giá 60000" -> Detect BUY intent for 0.01 BTC as LIMIT order at price 60000
4. "mua btc giá 65000" -> Detect BUY intent for BTC as LIMIT order at price 65000 (missing quantity)

When detecting trading intent, extract these details:
- action: "BUY" or "SELL"
- symbol: The cryptocurrency symbol (e.g., "BTC")
- quantity: The amount to trade
- orderType: "MARKET" or "LIMIT"
- price: For LIMIT orders only

Respond in Vietnamese and include trade details in a structured format in your JSON response.

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
    console.log("[generateResponseFlow] Input received:", {
        message: input.message,
        chatHistoryLength: input.chatHistory?.length,
        hasApiKey: !!input.apiKey,
        hasApiSecret: !!input.apiSecret,
        isTestnet: input.isTestnet || false
    });

    const promptInput: GenerateResponseInput = {
      message: input.message,
      chatHistory: input.chatHistory,
      apiKey: input.apiKey,
      apiSecret: input.apiSecret,
      isTestnet: input.isTestnet,
    };

    let response;
    try {
        console.log("[generateResponseFlow] Calling prompt...");
        response = await prompt(promptInput);
        console.log("[generateResponseFlow] Received raw response:", JSON.stringify(response, null, 2));

    } catch (error: any) {
        console.error("[generateResponseFlow] Error calling prompt:", error);
        return { response: `Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn: ${error.message || 'Lỗi không xác định'}` };
    }

    if (response?.output === null || response?.output === undefined) {
      console.error("[generateResponseFlow] Error: Flow returned null or undefined output. Raw response:", JSON.stringify(response, null, 2));
      return { response: "Xin lỗi, tôi không thể tạo phản hồi hợp lệ theo định dạng yêu cầu. Vui lòng thử lại." };
    }

    console.log("[generateResponseFlow] Final AI Response (validated):", response.output.response);
    return response.output;
});
