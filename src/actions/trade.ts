// src/actions/trade.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';

// --- Schemas ---

// Input schema matching the binance-tools input, including credentials
const PlaceOrderInputSchema = z.object({
    apiKey: z.string().min(10, "API Key is required."),
    apiSecret: z.string().min(10, "API Secret is required."),
    isTestnet: z.boolean().optional().default(false),
    symbol: z.string().min(1, "Symbol is required."),
    quantity: z.number().positive("Quantity must be positive."),
    orderType: z.enum(['MARKET', 'LIMIT']),
    price: z.number().optional(), // Price is optional, required for LIMIT
}).refine(data => data.orderType !== 'LIMIT' || (data.price !== undefined && data.price > 0), {
    message: 'A valid positive price is required for LIMIT orders.',
    path: ['price'],
});

// Output schema matching the binance-tools output
const PlaceOrderOutputSchema = z.object({
    success: z.boolean(),
    orderId: z.number().optional(),
    message: z.string(),
});

// Type alias for validated input
type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>;
// Type alias for output
type PlaceOrderResult = z.infer<typeof PlaceOrderOutputSchema>;


// --- Helper Function to Initialize Binance Client ---
const initializeBinanceClient = (apiKey: string, apiSecret: string, isTestnet: boolean): Binance | null => {
    try {
        const options: any = {
            APIKEY: apiKey,
            APISECRET: apiSecret,
            recvWindow: 60000, // Increased recvWindow
        };
        if (isTestnet) {
            options.urls = {
                base: 'https://testnet.binance.vision/api/', // Ensure correct testnet URL
            };
             console.log("[initializeBinanceClient] Using Testnet URLs");
        } else {
             console.log("[initializeBinanceClient] Using Production URLs");
        }
        const binance = new Binance().options(options);
        console.log("[initializeBinanceClient] Binance client initialized.");
        return binance;
    } catch (initError: any) {
        console.error("[initializeBinanceClient] Failed to initialize Binance client:", initError);
        return null;
    }
};


// --- Generic Order Placement Function ---
const placeOrder = async (input: PlaceOrderInput, side: 'BUY' | 'SELL'): Promise<PlaceOrderResult> => {
    console.log(`[placeOrder] Attempting ${side} order:`, { ...input, apiKey: '***', apiSecret: '***' }); // Mask credentials

    // Validate input against schema
    const validationResult = PlaceOrderInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("[placeOrder] Invalid input:", validationResult.error);
        return { success: false, message: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}` };
    }

    const { apiKey, apiSecret, isTestnet, symbol, quantity, orderType, price } = validationResult.data;

    // Initialize client
    const binance = initializeBinanceClient(apiKey, apiSecret, isTestnet);
    if (!binance) {
        return { success: false, message: "Internal error: Failed to initialize Binance client." };
    }

    try {
        let orderResult: any;

        if (orderType === 'MARKET') {
            console.log(`[placeOrder] Placing MARKET ${side} order for ${quantity} ${symbol}`);
            orderResult = side === 'BUY'
                ? await binance.marketBuy(symbol, quantity)
                : await binance.marketSell(symbol, quantity);
            console.log(`[placeOrder] Market ${side} Order Result:`, orderResult);

        } else if (orderType === 'LIMIT' && price) { // Price existence guaranteed by validation
            console.log(`[placeOrder] Placing LIMIT ${side} order for ${quantity} ${symbol} at price ${price}`);
            orderResult = side === 'BUY'
                ? await binance.buy(symbol, quantity, price)
                : await binance.sell(symbol, quantity, price);
            console.log(`[placeOrder] Limit ${side} Order Result:`, orderResult);
        } else {
            // Should not happen due to validation, but safety first
            return { success: false, message: "Invalid order configuration." };
        }

        // Process result
        if (orderResult && orderResult.orderId) {
            return {
                success: true,
                orderId: orderResult.orderId,
                message: `Successfully placed ${orderType} ${side.toLowerCase()} order for ${quantity} ${symbol}${orderType === 'LIMIT' ? ` at ${price}` : ''}. Order ID: ${orderResult.orderId}`,
            };
        } else {
            // Handle errors reported by Binance API (e.g., insufficient funds, invalid symbol)
            const errorMessage = orderResult?.msg || `Failed to place ${side.toLowerCase()} order. Unknown reason from Binance.`;
            console.error(`[placeOrder] Binance API Error (${side}):`, orderResult);
            return { success: false, message: `Failed to place ${side.toLowerCase()} order: ${errorMessage}` };
        }
    } catch (error: any) {
        console.error(`[placeOrder] Binance ${side} Order Exception:`, error);
        let errorMessage = 'An unknown error occurred.';
        try {
            if (error?.body) {
                // Binance API errors often have details in the body
                const parsedBody = JSON.parse(error.body);
                errorMessage = parsedBody?.msg || error.body;
                if (parsedBody?.code === -2010) { // Example: Insufficient funds error code
                    errorMessage = "Insufficient funds.";
                } else if (parsedBody?.code === -1121) { // Invalid symbol
                    errorMessage = `Invalid symbol: ${symbol}.`;
                } else if (parsedBody?.code === -1013) { // Price/Quantity precision error
                     errorMessage = `Filter failure (e.g., price/quantity precision or limits): ${parsedBody?.msg}`;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
        } catch (parseError) {
            // Fallback if parsing fails
            errorMessage = error.message || 'An unknown error occurred while parsing the error response.';
        }

        return {
            success: false,
            message: `Error placing ${side.toLowerCase()} order for ${symbol}: ${errorMessage}`,
        };
    }
};


// --- Specific Buy/Sell Actions ---

export async function placeBuyOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    return placeOrder(input, 'BUY');
}

export async function placeSellOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    return placeOrder(input, 'SELL');
}
