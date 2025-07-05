// src/actions/trade.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';
import { TimeSync } from '@/lib/time-sync'; // Import TimeSync utility

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
const initializeBinanceClient = async (apiKey: string, apiSecret: string, isTestnet: boolean): Promise<Binance | null> => {
    try {
        console.log('[initializeBinanceClient] Bắt đầu khởi tạo client...');
        
        // Đồng bộ thời gian trước khi tạo client
        try {
            await TimeSync.syncWithServer();
            console.log('[initializeBinanceClient] Đã đồng bộ thời gian với Binance');
        } catch (syncError) {
            console.error('[initializeBinanceClient] Lỗi đồng bộ thời gian:', syncError);
            TimeSync.adjustOffset(-20000);
        }
        
        // Làm sạch API key
        const cleanApiKey = apiKey.replace('API Key: ', '').trim();
        console.log(`[initializeBinanceClient] Đã xử lý API key - chiều dài: ${cleanApiKey.length}`);
        
        // Cấu hình client
        const options: any = {
            APIKEY: cleanApiKey, // Sử dụng API key đã làm sạch
            APISECRET: apiSecret,
            // Đảm bảo recvWindow nhỏ hơn 60000ms theo yêu cầu của Binance API
            recvWindow: 45000, // Giảm từ 50000 xuống 45000 để an toàn hơn
            // Tự tạo timestamp thay vì dùng method
            timestamp: () => {
                // Sử dụng phương thức getSafeTimestampForTrading cho các giao dịch
                return TimeSync.getSafeTimestampForTrading(); // Sử dụng timestamp siêu an toàn
            },
            // Bật gỡ lỗi
            verbose: true,
            // Tắt kết nối lại tự động
            reconnect: false,
            // Tăng timeout
            timeout: 15000, // Giảm timeout xuống 15 giây
            // Thêm useServerTime để Binance tự đồng bộ thời gian
            useServerTime: true,
            // Thêm các options quan trọng khác
            family: 4, // Sử dụng IPv4
            keepAlive: true,
            // Thêm tham số để tăng khả năng xử lý lỗi
            handleDrift: true, // Cho phép xử lý độ trễ
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
        console.log("[initializeBinanceClient] Binance client đã khởi tạo");
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
    const binance = await initializeBinanceClient(apiKey, apiSecret, isTestnet);
    if (!binance) {
        return { success: false, message: "Internal error: Failed to initialize Binance client." };
    }

    try {
        // Điều chỉnh timestamp trước khi gọi API - điều chỉnh nhiều hơn
        TimeSync.adjustOffset(-20000); // Tăng từ -10000 lên -20000
        
        // Thêm cơ chế retry tự động cho các giao dịch BUY/SELL
        let orderResult: any;
        let attempt = 0;
        const maxAttempts = 3; // Giảm số lần retry
        
        while (attempt < maxAttempts) {
            try {
                if (attempt > 0) {
                    console.log(`[placeOrder] Thử lại lần ${attempt}/${maxAttempts}...`);
                    // Mỗi lần retry, điều chỉnh thêm timestamp nhiều hơn
                    TimeSync.adjustOffset(-50000); // Tăng từ -30000 lên -50000
                    // Đợi lâu hơn trước khi thử lại
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                }
                
                if (orderType === 'MARKET') {
                    console.log(`[placeOrder] Placing MARKET ${side} order for ${quantity} ${symbol}`);
                    orderResult = side === 'BUY'
                        ? await binance.marketBuy(symbol, quantity)
                        : await binance.marketSell(symbol, quantity);
                    console.log(`[placeOrder] Market ${side} Order Result:`, orderResult);
                    break; // Thoát khỏi vòng lặp nếu thành công
                } else if (orderType === 'LIMIT' && price) { // Price existence guaranteed by validation
                    console.log(`[placeOrder] Placing LIMIT ${side} order for ${quantity} ${symbol} at price ${price}`);
                    orderResult = side === 'BUY'
                        ? await binance.buy(symbol, quantity, price)
                        : await binance.sell(symbol, quantity, price);
                    console.log(`[placeOrder] Limit ${side} Order Result:`, orderResult);
                    break; // Thoát khỏi vòng lặp nếu thành công
                } else {
                    // Should not happen due to validation, but safety first
                    return { success: false, message: "Invalid order configuration." };
                }
            } catch (retryError: any) {
                // Chỉ retry nếu lỗi timestamp hoặc một số lỗi kết nối
                if (retryError?.message?.includes('timestamp') || 
                    (retryError?.body && retryError.body.includes('-1021')) ||
                    retryError?.message?.includes('ETIMEDOUT') ||
                    retryError?.message?.includes('connect ECONNREFUSED')) {
                    attempt++;
                    
                    if (attempt >= maxAttempts) {
                        throw retryError; // Ném lỗi nếu đã vượt quá số lần retry
                    }
                    
                    console.log(`[placeOrder] Lỗi timestamp/kết nối, điều chỉnh và thử lại...`);
                    
                    // Kiểm tra cụ thể xem timestamp nhanh hay chậm
                    if (retryError.message?.includes('ahead of') || 
                        (retryError.body && retryError.body.includes('ahead of'))) {
                        console.log("[placeOrder] Timestamp đang nhanh hơn server, điều chỉnh về quá khứ thêm");
                        TimeSync.adjustOffset(-100000); // Tăng từ -60000 lên -100000 (1 phút 40 giây)
                    } else {
                        TimeSync.adjustOffset(10000); // Giữ nguyên 10000
                    }
                    
                    // Đợi một chút trước khi thử lại, tăng dần thời gian chờ
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                } else {
                    throw retryError; // Ném lỗi không phải timestamp ngay lập tức
                }
            }
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
                
                // Xử lý lỗi timestamp
                if (parsedBody?.code === -1021) {
                    errorMessage = "Server timestamp lỗi. Đã tự động điều chỉnh, vui lòng thử lại.";
                    // Điều chỉnh timestamp nếu là lỗi timestamp
                    if (errorMessage.includes('ahead of')) {
                        console.log("[placeOrder] Timestamp đang nhanh hơn server, điều chỉnh về quá khứ thêm");
                        TimeSync.adjustOffset(-100000); // Tăng từ -60000 lên -100000 (1 phút 40 giây)
                    } else {
                        TimeSync.adjustOffset(20000); // Tăng từ 10000 lên 20000
                    }
                } else if (parsedBody?.code === -2010) { // Example: Insufficient funds error code
                    errorMessage = "Insufficient funds.";
                } else if (parsedBody?.code === -1121) { // Invalid symbol
                    errorMessage = `Invalid symbol: ${symbol}.`;
                } else if (parsedBody?.code === -1013) { // Price/Quantity precision error
                     errorMessage = `Filter failure (e.g., price/quantity precision or limits): ${parsedBody?.msg}`;
                } else if (parsedBody?.code === -2015) {
                    errorMessage = 'API key của bạn không đúng, không có quyền truy cập, hoặc IP của bạn không được phép sử dụng API key này.';
                } else if (parsedBody?.code === -2011) {
                    errorMessage = 'Lỗi xác thực. Vui lòng kiểm tra API key và secret.';
                } else if (parsedBody?.code === -2013) {
                    errorMessage = 'Lệnh không tồn tại hoặc đã bị hủy.';
                } else if (parsedBody?.code === -2014) {
                    errorMessage = 'API key không có quyền giao dịch.';
                }
            } else if (error.message) {
                errorMessage = error.message;
                // Kiểm tra lỗi timestamp trong error.message
                if (error.message.includes('timestamp for this request')) {
                    console.log("[placeOrder] Phát hiện lỗi timestamp trong message");
                    if (error.message.includes('ahead of')) {
                        TimeSync.adjustOffset(-100000); // Tăng từ -60000 lên -100000
                    } else {
                        TimeSync.adjustOffset(20000); // Tăng từ 10000 lên 20000
                    }
                }
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