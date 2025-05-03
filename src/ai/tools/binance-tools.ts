'use server';
/**
 * @fileOverview Genkit tools for interacting with the Binance API to place trades.
 *
 * - placeBuyOrderTool - Tool to place a market or limit buy order on Binance.
 * - placeSellOrderTool - Tool to place a market or limit sell order on Binance.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import Binance from 'node-binance-api';

// Define common input parameters for trading tools
// These parameters will be populated by the LLM based on user intent AND the credentials passed in the flow input context.
const TradingInputBaseSchema = z.object({
    apiKey: z.string().describe('The Binance API key. This MUST be provided from the flow input context if available.'),
    apiSecret: z.string().describe('The Binance API secret. This MUST be provided from the flow input context if available.'),
    isTestnet: z.boolean().optional().default(false).describe('Whether to use the Binance testnet. Provided from flow input context.'),
    symbol: z.string().describe("The trading pair symbol (e.g., 'BTCUSDT'). The user might just say 'BTC' or 'Bitcoin', infer the USDT pair (e.g. BTCUSDT) unless another pair is specified."),
    quantity: z.number().positive().describe('The quantity of the asset to trade.'),
});

// Define input schema for placing orders
const PlaceOrderInputSchema = TradingInputBaseSchema.extend({
    orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET').describe("The type of order ('MARKET' or 'LIMIT'). Default to MARKET if not specified."),
    price: z.number().optional().describe('The price for LIMIT orders. Required if orderType is LIMIT.'),
});

// Define output schema for order placement
const PlaceOrderOutputSchema = z.object({
    success: z.boolean().describe('Whether the order placement was successful.'),
    orderId: z.number().optional().describe('The ID of the placed order, if successful.'),
    message: z.string().describe('A confirmation message or an error description.'),
});

// --- Place Buy Order Tool ---
export const placeBuyOrderTool = ai.defineTool(
    {
        name: 'placeBuyOrderTool',
        description: 'Places a buy order on the Binance exchange. Use this when the user expresses intent to buy a cryptocurrency. Infer the trading pair symbol (e.g., BTCUSDT from BTC) if not explicitly stated. Default to a MARKET order unless a specific price (LIMIT order) is mentioned. Requires API Key and Secret to be available in the input context.',
        inputSchema: PlaceOrderInputSchema,
        outputSchema: PlaceOrderOutputSchema,
    },
    async (input) => {
        console.log("Attempting to place buy order with input:", { ...input, apiKey: '***', apiSecret: '***' }); // Mask credentials in log
        const { apiKey, apiSecret, isTestnet, symbol, quantity, orderType, price } = input;

        // --- Crucial Validation: Check if credentials were actually passed ---
        // Although the LLM is instructed not to call without them, add a safeguard.
        if (!apiKey || !apiSecret) {
            console.error("[placeBuyOrderTool] Tool called without API Key or Secret.");
            return { success: false, message: 'Error: API Key and Secret are required to place an order but were not provided.' };
        }
        // --- End Validation ---


        // Basic validation for LIMIT order
        if (orderType === 'LIMIT' && (!price || price <= 0)) { // Also check if price is positive
            return { success: false, message: 'A valid positive price is required for LIMIT orders.' };
        }

        let binance;
        try {
            binance = new Binance().options({
                APIKEY: apiKey,
                APISECRET: apiSecret,
                ...(isTestnet && {
                    urls: { base: 'https://testnet.binance.vision/api/' },
                }),
                // Consider adding recvWindow if requests time out
                // recvWindow: 60000,
            });
            console.log("[placeBuyOrderTool] Binance client initialized for buy order.");
        } catch (initError: any) {
            console.error("[placeBuyOrderTool] Failed to initialize Binance client:", initError);
            return { success: false, message: `Internal error: Failed to initialize Binance client: ${initError.message}` };
        }


        try {
            let orderResult: any;
            if (orderType === 'MARKET') {
                console.log(`Placing MARKET buy order for ${quantity} ${symbol}`);
                // Ensure quantity is treated as the base asset quantity for market buy
                 orderResult = await binance.marketBuy(symbol, quantity); // Use marketBuy for market orders
                 console.log("Market Buy Order Result:", orderResult);


            } else if (orderType === 'LIMIT' && price) {
                console.log(`Placing LIMIT buy order for ${quantity} ${symbol} at price ${price}`);
                orderResult = await binance.buy(symbol, quantity, price);
                 console.log("Limit Buy Order Result:", orderResult);
            } else {
                 // This case should be caught by earlier validation, but included for safety
                 return { success: false, message: 'Invalid order type or missing price for LIMIT order.' };
            }


            if (orderResult && orderResult.orderId) {
                return {
                    success: true,
                    orderId: orderResult.orderId,
                    message: `Successfully placed ${orderType} buy order for ${quantity} ${symbol}${orderType === 'LIMIT' ? ` at ${price}` : ''}. Order ID: ${orderResult.orderId}`,
                };
            } else {
                // Handle cases where order might seem successful but lacks orderId or has specific error messages
                 const errorMessage = orderResult?.msg || 'Failed to place buy order. Unknown reason from Binance.';
                 console.error("Binance API Error (Buy):", orderResult);
                 return { success: false, message: `Failed to place buy order: ${errorMessage}` };
            }
        } catch (error: any) {
            console.error('Binance Buy Order Error:', error);
             // Attempt to parse error message from Binance response body if available
             let errorMessage = 'An unknown error occurred.';
             try {
                if (error?.body) {
                     const parsedBody = JSON.parse(error.body);
                     errorMessage = parsedBody?.msg || error.body;
                } else if (error.message) {
                    errorMessage = error.message;
                }
             } catch (parseError) {
                 // Fallback if parsing fails
                 errorMessage = error.message || 'An unknown error occurred while parsing the error response.';
             }

            return {
                success: false,
                message: `Error placing buy order for ${symbol}: ${errorMessage}`,
            };
        }
    }
);


// --- Place Sell Order Tool ---
export const placeSellOrderTool = ai.defineTool(
    {
        name: 'placeSellOrderTool',
        description: 'Places a sell order on the Binance exchange. Use this when the user expresses intent to sell a cryptocurrency. Infer the trading pair symbol (e.g., BTCUSDT from BTC) if not explicitly stated. Default to a MARKET order unless a specific price (LIMIT order) is mentioned. Requires API Key and Secret to be available in the input context.',
        inputSchema: PlaceOrderInputSchema,
        outputSchema: PlaceOrderOutputSchema,
    },
    async (input) => {
        console.log("Attempting to place sell order with input:", { ...input, apiKey: '***', apiSecret: '***' }); // Mask credentials in log
        const { apiKey, apiSecret, isTestnet, symbol, quantity, orderType, price } = input;

        // --- Crucial Validation: Check if credentials were actually passed ---
        if (!apiKey || !apiSecret) {
            console.error("[placeSellOrderTool] Tool called without API Key or Secret.");
            return { success: false, message: 'Error: API Key and Secret are required to place an order but were not provided.' };
        }
        // --- End Validation ---

        // Basic validation for LIMIT order
        if (orderType === 'LIMIT' && (!price || price <= 0)) { // Also check if price is positive
            return { success: false, message: 'A valid positive price is required for LIMIT orders.' };
        }

        let binance;
         try {
            binance = new Binance().options({
                APIKEY: apiKey,
                APISECRET: apiSecret,
                ...(isTestnet && {
                    urls: { base: 'https://testnet.binance.vision/api/' },
                }),
                // recvWindow: 60000,
            });
            console.log("[placeSellOrderTool] Binance client initialized for sell order.");
        } catch (initError: any) {
             console.error("[placeSellOrderTool] Failed to initialize Binance client:", initError);
             return { success: false, message: `Internal error: Failed to initialize Binance client: ${initError.message}` };
        }


        try {
             let orderResult: any;
             if (orderType === 'MARKET') {
                 console.log(`Placing MARKET sell order for ${quantity} ${symbol}`);
                 // Use marketSell for market orders
                 orderResult = await binance.marketSell(symbol, quantity);
                 console.log("Market Sell Order Result:", orderResult);
             } else if (orderType === 'LIMIT' && price) {
                 console.log(`Placing LIMIT sell order for ${quantity} ${symbol} at price ${price}`);
                 orderResult = await binance.sell(symbol, quantity, price);
                 console.log("Limit Sell Order Result:", orderResult);
             } else {
                  // This case should be caught by earlier validation, but included for safety
                  return { success: false, message: 'Invalid order type or missing price for LIMIT order.' };
             }


            if (orderResult && orderResult.orderId) {
                return {
                    success: true,
                    orderId: orderResult.orderId,
                    message: `Successfully placed ${orderType} sell order for ${quantity} ${symbol}${orderType === 'LIMIT' ? ` at ${price}` : ''}. Order ID: ${orderResult.orderId}`,
                };
            } else {
                 const errorMessage = orderResult?.msg || 'Failed to place sell order. Unknown reason from Binance.';
                 console.error("Binance API Error (Sell):", orderResult);
                 return { success: false, message: `Failed to place sell order: ${errorMessage}` };
            }
        } catch (error: any) {
             console.error('Binance Sell Order Error:', error);
             // Attempt to parse error message from Binance response body if available
             let errorMessage = 'An unknown error occurred.';
              try {
                if (error?.body) {
                     const parsedBody = JSON.parse(error.body);
                     errorMessage = parsedBody?.msg || error.body;
                } else if (error.message) {
                    errorMessage = error.message;
                }
             } catch (parseError) {
                 // Fallback if parsing fails
                 errorMessage = error.message || 'An unknown error occurred while parsing the error response.';
             }

             return {
                success: false,
                message: `Error placing sell order for ${symbol}: ${errorMessage}`,
             };
        }
    }
);

// IMPORTANT: This implementation passes API keys directly in the input.
// This is INSECURE for production. In a real application, you should:
// 1. Store API keys securely on the server (e.g., using a secrets manager or environment variables associated with user accounts).
// 2. Modify the tools to retrieve the keys from the secure store based on the authenticated user,
//    instead of receiving them directly in the input.
// 3. Ensure the Genkit flow and tools run in a secure server-side environment.
// 4. The current approach relies on the client-side React component holding the keys in state (Zustand store) and passing them up. This is acceptable for a demo but NOT for production.
