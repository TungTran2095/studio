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
const TradingInputBaseSchema = z.object({
    apiKey: z.string().describe('The Binance API key.'),
    apiSecret: z.string().describe('The Binance API secret.'),
    isTestnet: z.boolean().optional().default(false).describe('Whether to use the Binance testnet.'),
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
        description: 'Places a buy order on the Binance exchange. Use this when the user expresses intent to buy a cryptocurrency. Infer the trading pair symbol (e.g., BTCUSDT from BTC) if not explicitly stated. Default to a MARKET order unless a specific price (LIMIT order) is mentioned.',
        inputSchema: PlaceOrderInputSchema,
        outputSchema: PlaceOrderOutputSchema,
    },
    async (input) => {
        console.log("Attempting to place buy order with input:", input);
        const { apiKey, apiSecret, isTestnet, symbol, quantity, orderType, price } = input;

        // Basic validation for LIMIT order
        if (orderType === 'LIMIT' && !price) {
            return { success: false, message: 'Price is required for LIMIT orders.' };
        }

        const binance = new Binance().options({
            APIKEY: apiKey,
            APISECRET: apiSecret,
            ...(isTestnet && {
                urls: { base: 'https://testnet.binance.vision/api/' },
            }),
            // Consider adding recvWindow if requests time out
            // recvWindow: 60000,
        });

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
                 const errorMessage = orderResult?.msg || 'Failed to place buy order. Unknown reason.';
                 console.error("Binance API Error (Buy):", orderResult);
                 return { success: false, message: `Failed to place buy order: ${errorMessage}` };
            }
        } catch (error: any) {
            console.error('Binance Buy Order Error:', error);
             const errorMessage = error?.body ? JSON.parse(error.body).msg : (error.message || 'An unknown error occurred.');
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
        description: 'Places a sell order on the Binance exchange. Use this when the user expresses intent to sell a cryptocurrency. Infer the trading pair symbol (e.g., BTCUSDT from BTC) if not explicitly stated. Default to a MARKET order unless a specific price (LIMIT order) is mentioned.',
        inputSchema: PlaceOrderInputSchema,
        outputSchema: PlaceOrderOutputSchema,
    },
    async (input) => {
        console.log("Attempting to place sell order with input:", input);
        const { apiKey, apiSecret, isTestnet, symbol, quantity, orderType, price } = input;

        // Basic validation for LIMIT order
        if (orderType === 'LIMIT' && !price) {
            return { success: false, message: 'Price is required for LIMIT orders.' };
        }

        const binance = new Binance().options({
            APIKEY: apiKey,
            APISECRET: apiSecret,
            ...(isTestnet && {
                urls: { base: 'https://testnet.binance.vision/api/' },
            }),
             // recvWindow: 60000,
        });

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
                  return { success: false, message: 'Invalid order type or missing price for LIMIT order.' };
             }


            if (orderResult && orderResult.orderId) {
                return {
                    success: true,
                    orderId: orderResult.orderId,
                    message: `Successfully placed ${orderType} sell order for ${quantity} ${symbol}${orderType === 'LIMIT' ? ` at ${price}` : ''}. Order ID: ${orderResult.orderId}`,
                };
            } else {
                 const errorMessage = orderResult?.msg || 'Failed to place sell order. Unknown reason.';
                 console.error("Binance API Error (Sell):", orderResult);
                 return { success: false, message: `Failed to place sell order: ${errorMessage}` };
            }
        } catch (error: any) {
             console.error('Binance Sell Order Error:', error);
             const errorMessage = error?.body ? JSON.parse(error.body).msg : (error.message || 'An unknown error occurred.');
             return {
                success: false,
                message: `Error placing sell order for ${symbol}: ${errorMessage}`,
             };
        }
    }
);

// IMPORTANT: This implementation passes API keys directly in the input.
// This is INSECURE for production. In a real application, you should:
// 1. Store API keys securely on the server (e.g., using a secrets manager or environment variables).
// 2. Modify the tools to retrieve the keys from the secure store based on the authenticated user,
//    instead of receiving them directly in the input.
// 3. Ensure the Genkit flow and tools run in a secure server-side environment.
