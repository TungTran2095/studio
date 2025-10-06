// src/actions/binance.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api'; // Import the library
import { TimeSync } from '@/lib/time-sync'; // Import TimeSync utility

// Define the structure for an asset
export interface Asset {
  asset: string;
  symbol: string; // Added symbol for consistency
  quantity: number;
  totalValue: number; // Value in USD
}

// Define the structure for a trade
export interface Trade {
    symbol: string; // The trading pair, e.g., BTCUSDT
    id: number;
    orderId: number;
    price: string;
    qty: string; // Base asset quantity
    quoteQty: string; // Quote asset quantity (price * qty)
    commission: string;
    commissionAsset: string;
    time: number; // Timestamp
    isBuyer: boolean;
    isMaker: boolean;
    // Added for easier filtering/display
    baseAsset?: string;
    quoteAsset?: string;
}


// Define the input schema for the asset action
const BinanceInputSchema = z.object({
  apiKey: z.string().min(10), // Basic length check
  apiSecret: z.string().min(10), // Basic length check
  isTestnet: z.boolean(),
});

// Define the input schema for the trade history action
const TradeHistoryInputSchema = BinanceInputSchema.extend({
    // Expect an array of potential trading pairs (e.g., ['BTCUSDT', 'ETHUSDT', 'ETHBTC'])
    symbols: z.array(z.string()).min(1, "At least one trading pair symbol must be provided."),
    limit: z.number().int().positive().optional().default(500), // Optional: Limit number of trades per symbol (ensure integer)
});


// Helper function to make Binance API calls (simplified with basic throttling)
async function trackBinanceCall<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>,
  weight: number = 1
): Promise<T> {
  try {
    // Apply basic throttling based on endpoint type
    if (endpoint.includes('/account')) {
      const { accountApiThrottle } = await import('@/lib/simple-api-throttle');
      await accountApiThrottle.throttle();
    } else if (endpoint.includes('/ticker/price')) {
      const { priceApiThrottle } = await import('@/lib/simple-api-throttle');
      await priceApiThrottle.throttle();
    } else if (endpoint.includes('/order')) {
      const { orderApiThrottle } = await import('@/lib/simple-api-throttle');
      await orderApiThrottle.throttle();
    }

    const result = await fn();
    console.log(`[Binance] ✅ API call successful: ${method} ${endpoint}`);
    return result;
  } catch (error) {
    console.error(`[Binance] ❌ API call failed: ${method} ${endpoint}`, error);
    throw error;
  }
}

// Define the output schema (or structure) for the asset action
interface BinanceAssetsResult {
  success: boolean;
  data: Asset[];
  error?: string;
  // Include symbols with balance for trade history fetching
  ownedSymbols?: string[]; // Asset symbols like 'BTC', 'ETH'
}

// Define the output schema (or structure) for the trade history action
interface BinanceTradeHistoryResult {
    success: boolean;
    data: Trade[]; // Now includes optional base/quote assets
    error?: string;
}

// Hàm trợ giúp xử lý lỗi Binance cụ thể
function handleBinanceAPIError(error: any): { message: string; code?: number; retryable: boolean } {
  // Chuẩn hóa cấu trúc lỗi từ nhiều định dạng có thể xảy ra
  let errorCode: number | undefined;
  let errorMessage: string = 'Unknown error';
  let isRetryable: boolean = false;

  // Trích xuất thông tin lỗi từ các định dạng khác nhau
  if (error.body) {
    try {
      const parsed = JSON.parse(error.body);
      errorCode = parsed.code;
      errorMessage = parsed.msg || 'API error';
    } catch {
      errorMessage = error.body;
    }
  } else if (error.code && error.message) {
    errorCode = typeof error.code === 'string' ? parseInt(error.code) : error.code;
    errorMessage = error.message;
  } else if (error.message) {
    // Tìm mã lỗi trong message nếu có
    const codeMatch = error.message.match(/code[:\s-]*(-?\d+)/i);
    if (codeMatch) {
      errorCode = parseInt(codeMatch[1]);
    }
    errorMessage = error.message;
  }

  // Xác định lỗi có thể retry hay không
  const retryableCodes = [-1021, -1001, -1002, -1003, -1006, -1007, -2014]; // Thêm -2014 (API key invalid) vào danh sách retry
  isRetryable = errorCode ? retryableCodes.includes(errorCode) : false;

  // Xử lý đặc biệt cho lỗi API key
  if (errorCode === -2014) {
    errorMessage = 'API key không đúng định dạng. Hãy kiểm tra lại API key và đảm bảo không có kí tự đặc biệt.';
    console.error('[handleBinanceAPIError] Phát hiện lỗi API key không hợp lệ, sẽ thử lại sau khi xử lý key...');
  }
  
  // Xử lý đặc biệt cho lỗi quyền API key hoặc IP
  if (errorCode === -2015) {
    errorMessage = 'API key không có quyền hoặc IP không được phép. Vui lòng kiểm tra cài đặt API key trên Binance.';
    console.error(`[handleBinanceAPIError] Phát hiện lỗi quyền API key hoặc IP: ${errorMessage}`);
    console.error(`[handleBinanceAPIError] HƯỚNG DẪN:
    1. Đăng nhập vào tài khoản Binance của bạn
    2. Vào phần API Management 
    3. Kiểm tra xem API key có quyền đọc (Read) hoặc không
    4. Trong testnet, đảm bảo IP của bạn đã được đăng ký
    5. Tìm địa chỉ IP hiện tại của bạn (search "what is my ip" trên Google)
    6. Thêm IP vào danh sách IP được phép truy cập của API key`);
  }

  // Trả về thông tin lỗi đã chuẩn hóa
  return {
    message: errorMessage,
    code: errorCode,
    retryable: isRetryable
  };
}

// Tạo hàm mới để khởi tạo Binance client an toàn hơn
export async function createSafeBinanceClient(apiKey: string, apiSecret: string, isTestnet: boolean = false): Promise<any> {
  // Tắt log để giảm spam - chỉ giữ log lỗi quan trọng
  // console.log('[createSafeBinanceClient] Bắt đầu khởi tạo client...');
  
  // Đồng bộ thời gian trước khi tạo client
  try {
    await TimeSync.syncWithServer();
    // console.log('[createSafeBinanceClient] Đã đồng bộ thời gian với Binance');
  } catch (syncError) {
    console.error('[createSafeBinanceClient] Lỗi đồng bộ thời gian:', syncError);
    // Tiếp tục nhưng điều chỉnh offset thấp hơn nữa
    TimeSync.adjustOffset(-20000); // Tăng từ -10000 lên -20000
  }
  
  // Làm sạch API key - loại bỏ tiền tố "API Key: " nếu có
  const cleanApiKey = apiKey.replace('API Key: ', '').trim();
  // console.log(`[createSafeBinanceClient] Đã xử lý API key - chiều dài: ${cleanApiKey.length}`);
  
  // Tạo client với cấu hình an toàn nhất
  const client = new Binance().options({
    APIKEY: cleanApiKey, // Sử dụng API key đã làm sạch
    APISECRET: apiSecret,
    // Sử dụng testnet nếu cần
    ...(isTestnet && {
      urls: {
        base: 'https://testnet.binance.vision/api/',
        api: 'https://testnet.binance.vision/api/'
      },
    }),
    // Sử dụng URL phụ cho production
    ...(!isTestnet && {
      urls: {
        base: 'https://api1.binance.com/api/',
        api: 'https://api1.binance.com/api/' 
      }
    }),
    // Đảm bảo recvWindow nhỏ hơn 60000ms theo yêu cầu của Binance API
    recvWindow: 30000, // Giảm từ 50000ms xuống 30000ms để phù hợp với khuyến nghị của Binance
    // Tự tạo timestamp thay vì dùng method
    timestamp: () => {
      // Luôn trả về timestamp nhỏ hơn thời gian thực để đảm bảo không vượt quá giới hạn server
      return TimeSync.getTimestamp();
    },
    // Bật gỡ lỗi
    verbose: true,
    // Tắt kết nối lại tự động
    reconnect: false,
    // Giảm timeout để phát hiện lỗi sớm hơn
    timeout: 30000, // Giảm từ 60000ms xuống 30000ms
    // Thêm useServerTime để Binance tự đồng bộ thời gian
    useServerTime: true,
    // Thêm các options quan trọng khác
    family: 4, // Sử dụng IPv4
    keepAlive: true,
    // Thêm tham số để tăng khả năng xử lý lỗi
    handleDrift: true, // Cho phép xử lý độ trễ
    // Thêm User-Agent để tránh bị chặn
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  // console.log('[createSafeBinanceClient] Đã khởi tạo Binance client với timestamp cố định -300000ms và recvWindow=30000ms');
  
  return client;
}

// Retry logic đã được cải tiến
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelayMs: number = 500,
  options: { apiKey?: string; apiSecret?: string } = {}
): Promise<T> {
  let lastError: any;
  let retries = 0;
  let currentApiKey = options.apiKey;
  let timestampRetries = 0; // Đếm số lần đã xử lý lỗi timestamp 
  const maxTimestampRetries = 3; // Tối đa 3 lần xử lý lỗi timestamp

  while (retries <= maxRetries) {
    try {
      if (retries > 0) {
        console.log(`[Binance] Thử lại lần ${retries}/${maxRetries}...`);
      }
      return await fn();
    } catch (error) {
      lastError = error;
      const errorInfo = handleBinanceAPIError(error);
      
      // Xử lý đặc biệt cho lỗi function is not a function
      if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && (
          error.message.includes('is not a function') || 
          error.message.includes('is not defined') ||
          error.message.includes('is undefined')
      )) {
        console.error('[Binance] Lỗi phương thức không tồn tại:', error.message);
        // Đây là lỗi nghiêm trọng liên quan đến cấu trúc API, không thể retry
        throw new Error(`Lỗi gọi phương thức API: ${error.message}. Vui lòng kiểm tra cài đặt thư viện node-binance-api.`);
      }
      
      // Xử lý đặc biệt cho lỗi API key
      if (errorInfo.code === -2014 && currentApiKey) {
        console.log('[Binance] Lỗi định dạng API key, đang xử lý...');
        // Thử làm sạch API key
        currentApiKey = currentApiKey.replace(/[^a-zA-Z0-9]/g, '').trim();
        console.log(`[Binance] Đã làm sạch API key, chiều dài mới: ${currentApiKey?.length}`);
        
        // Nếu có callback cập nhật key, thực hiện nó
        if (options.apiKey) {
          options.apiKey = currentApiKey;
          console.log('[Binance] Đã cập nhật API key đã làm sạch');
        }
        
        retries++;
        continue;
      }
      
      // Xử lý đặc biệt cho lỗi timestamp
      if (errorInfo.code === -1021) {
        console.log('[Binance] Lỗi timestamp, đang xử lý...');
        
        // Kiểm tra nếu đã thử quá nhiều lần
        if (timestampRetries >= maxTimestampRetries) {
          console.error(`[Binance] Đã thử xử lý lỗi timestamp ${timestampRetries} lần không thành công. Bỏ qua.`);
          throw new Error("Không thể đồng bộ thời gian với Binance API sau nhiều lần thử. Vui lòng kiểm tra đồng hồ máy tính của bạn.");
        }
        
        timestampRetries++;
        
        // Kiểm tra trong nội dung lỗi xem timestamp đang sớm hay muộn
        let isTimeAhead = false;
        if (errorInfo.message && errorInfo.message.includes("ahead of")) {
          isTimeAhead = true;
          console.log("[Binance] Phát hiện timestamp đang nhanh hơn server, điều chỉnh về quá khứ");
        }
        
        try {
          // Cách mới: Lấy thời gian server trực tiếp
          console.log("[Binance] Đang lấy thời gian server trực tiếp...");
          const serverTime = await TimeSync.getActualServerTime();
          const localTime = Date.now();
          const diff = serverTime - localTime;
          
          console.log(`[Binance] Thời gian server: ${new Date(serverTime).toISOString()}, thời gian local: ${new Date(localTime).toISOString()}`);
          console.log(`[Binance] Chênh lệch thời gian: ${diff}ms`);
          
          // Điều chỉnh timeOffset dựa trên chênh lệch thực tế và cộng thêm biên an toàn
          if (isTimeAhead) {
            // Nếu timestamp đang nhanh hơn server, tăng offset âm để bù vào (từ 30000 lên 60000ms)
            const newOffset = diff - 60000;
            TimeSync.setOffset(newOffset);
            console.log(`[Binance] Đặt timeOffset = ${newOffset}ms (diff ${diff}ms - 60000ms margin)`);
          } else {
            // Nếu timestamp đang chậm hơn server, cần điều chỉnh thêm
            TimeSync.setOffset(diff - 20000); // Tăng biên từ 10000 lên 20000ms
            console.log(`[Binance] Đặt timeOffset = ${diff - 20000}ms (diff ${diff}ms - 20000ms margin)`);
          }
          
          // Thử lại ngay lập tức không cần chờ delay
          retries++;
          continue;
        } catch (syncError) {
          console.error('[Binance] Lỗi khi lấy thời gian server:', syncError);
          
          // Nếu không thể lấy thời gian server, thực hiện phương pháp dự phòng
          if (isTimeAhead) {
            // Timestamp đang nhanh hơn server, thiết lập offset cố định -240 giây (tăng từ 180 lên 240 giây)
            TimeSync.setOffset(-240000);
            console.log('[Binance] Đặt offset cố định -240 giây để đảm bảo timestamp không vượt quá server');
          } else {
            // Nếu timestamp đang chậm hơn server, thiết lập offset +0
            TimeSync.setOffset(0); 
            console.log('[Binance] Đặt offset 0ms vì timestamp đang chậm hơn server');
          }
          
          // Có thể đã điều chỉnh offset, thử lại ngay
          retries++;
          continue;
        }
      }
      
      // Chỉ retry nếu lỗi có thể retry và chưa vượt quá số lần thử lại
      if (!errorInfo.retryable || retries >= maxRetries) {
        console.error(`[Binance] Lỗi cuối cùng, không thể retry:`, errorInfo);
        throw error;
      }
      
      // Tính toán delay với exponential backoff
      const delay = initialDelayMs * Math.pow(2, retries);
      console.log(`[Binance] Lỗi ${errorInfo.code}: ${errorInfo.message}. Đợi ${delay}ms trước khi thử lại...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }

  throw lastError;
}

// --- Fetch Assets Action ---
export async function fetchBinanceAssets(
  input: z.infer<typeof BinanceInputSchema>
): Promise<BinanceAssetsResult> {
  // Làm sạch API key (loại bỏ các ký tự không hợp lệ)
  let apiKey = input.apiKey.trim();

  const apiSecret = input.apiSecret.trim();
  
  // Khởi tạo client Binance với các cài đặt an toàn
  const binance = await createSafeBinanceClient(apiKey, apiSecret, input.isTestnet);
  
  // Mảng lưu trữ tài sản
  const assets: Asset[] = [];

  try {
    // 1. Fetch account balances with retry logic
    const balances = await withRetry(async () => {
      // Thêm một lần đồng bộ thời gian vào thời điểm gọi API
      TimeSync.adjustOffset(-2000);
      
      // Track this API call
      const baseUrl = input.isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
      return await trackBinanceCall(
        `${baseUrl}/api/v3/account`,
        'GET',
        () => binance.balance(),
        10 // Weight for /api/v3/account
      );
    }, 5, 500, { apiKey, apiSecret }); // Truyền thông tin API để có thể làm sạch khi cần
    
    if (!balances) {
      console.error('[fetchBinanceAssets] Failed to fetch balances.');
      throw new Error('Failed to fetch balances.');
    }

    // 2. Filter assets with positive balance and prepare symbols for price fetching
    const ownedAssetSymbolsWithBalance = Object.keys(balances).filter(
      symbol => parseFloat((balances as any)[symbol].available) > 0 || parseFloat((balances as any)[symbol].onOrder) > 0
    );


    // Add "BTC" and "USDT" if needed for price calculations, among others
    const symbolsForPricing = new Set(ownedAssetSymbolsWithBalance);
    // Define target symbols - ONLY FOCUS ON BTC and USDT as requested
    const TARGET_SYMBOLS_PRICING = ['BTC', 'USDT'];
    const essentialQuoteAssets = ['USDT']; // Primarily need USDT for pricing

    // Ensure TARGET_SYMBOLS are included if we own anything relevant for pricing (BTC or USDT)
     TARGET_SYMBOLS_PRICING.forEach(asset => {
        if (ownedAssetSymbolsWithBalance.includes(asset)) {
             symbolsForPricing.add(asset);
        }
     });

     // Ensure essential quote assets are added if needed for pair construction
     essentialQuoteAssets.forEach(asset => {
         if (ownedAssetSymbolsWithBalance.length > 0) { // Only add if we own something
               symbolsForPricing.add(asset);
         }
     });


    const symbolsToFetchPrices = new Set<string>();
     symbolsForPricing.forEach(assetSymbol => {
       // Try direct pairs with essential quote assets
       essentialQuoteAssets.forEach(quoteAsset => {
          if (assetSymbol !== quoteAsset) {
             symbolsToFetchPrices.add(`${assetSymbol}${quoteAsset}`);
          }
       });
       // Add BTC pairing if the asset is not BTC or a quote asset
       if (assetSymbol !== 'BTC' && !essentialQuoteAssets.includes(assetSymbol)) {
            symbolsToFetchPrices.add(`${assetSymbol}BTC`);
       }
     });

     // Ensure essential quote asset prices against USDT are fetched if they exist
     essentialQuoteAssets.forEach(asset => {
         if (asset !== 'USDT') {
             symbolsToFetchPrices.add(`${asset}USDT`);
         }
     });
     // Ensure BTC/USDT is always included if any prices are needed
      if (symbolsToFetchPrices.size > 0) {
         symbolsToFetchPrices.add('BTCUSDT');
     }


    // 3. Fetch current prices for the required trading pairs
    let prices: { [key: string]: string } = {};
    try {
        // Only fetch prices if we have symbols to fetch for
        if (symbolsToFetchPrices.size > 0) {
            prices = await withRetry(async () => {
                return await binance.prices();
            });
            
            if (!prices) {
               console.error('[fetchBinanceAssets] Failed to fetch prices (returned null/undefined).');
               throw new Error('Failed to fetch prices.');
            }
        }
    } catch (priceError: any) {
        // Xử lý lỗi với thông tin chi tiết hơn
        const errorInfo = handleBinanceAPIError(priceError);
        console.error('[fetchBinanceAssets] Error during price fetch:', errorInfo);
        // Nếu đây là lỗi có thể khôi phục, chúng ta đã thử retry với withRetry
        throw new Error(`Failed to fetch all necessary prices: ${errorInfo.message}`);
    }


    const filteredPrices: { [key: string]: string } = {};
    symbolsToFetchPrices.forEach(symbol => {
      if (prices[symbol]) {
        filteredPrices[symbol] = prices[symbol];
      }
    });


    const getPrice = (symbol: string): number => parseFloat(filteredPrices[symbol] || '0');
    const btcUsdtPrice = getPrice('BTCUSDT');


    // 4. Calculate total value for each asset
    const assets: Asset[] = [];
    for (const assetSymbol of ownedAssetSymbolsWithBalance) { // Iterate only over symbols with balance
        const quantity = parseFloat((balances as any)[assetSymbol].available) + parseFloat((balances as any)[assetSymbol].onOrder);
        if (quantity <= 0) continue; // Skip if total quantity is zero or less

        let valueInUsd = 0;
        let assetName = assetSymbol; // Default name to symbol

        if (assetSymbol === 'USDT' /* Add other stables like USDC if needed */) {
            valueInUsd = quantity; // Assume 1:1 USD value for stablecoins
        } else if (getPrice(`${assetSymbol}USDT`) > 0) {
            valueInUsd = quantity * getPrice(`${assetSymbol}USDT`);
        } else if (assetSymbol === 'BTC') { // Explicitly check BTC/USDT if direct BTC/USDT pair missing
            if (btcUsdtPrice > 0) {
                valueInUsd = quantity * btcUsdtPrice;
            }
        }
        // Add more conversion logic here if needed (e.g., via other stablecoins if USDT pair fails)


        // Add logic here to fetch full asset names if desired (might require another API or mapping)


        if (valueInUsd > 0.01) { // Only include assets with value > $0.01
             assets.push({
               asset: assetName, // Use fetched/mapped name or symbol
               symbol: assetSymbol, // Store the base asset symbol
               quantity: quantity,
               totalValue: valueInUsd,
             });
        }

    }


    // Sort assets by value, descending
    assets.sort((a, b) => b.totalValue - a.totalValue);

    // Return the base asset symbols (like BTC, ETH), not trading pairs
    return { success: true, data: assets, ownedSymbols: ownedAssetSymbolsWithBalance };
  } catch (error: any) {
    console.error('[fetchBinanceAssets] Error:', error);
    // Provide a more user-friendly error message
    let errorMessage = 'An unknown error occurred while fetching assets.';
    if (error?.message) {
       if (error.message.includes('Timestamp for this request') || error.message.includes('timestamp')) {
         errorMessage = 'Request timed out or clock sync issue. Check system time and recvWindow.';
       } else if (error.message.includes('Invalid API-key') || error.message.includes('signature')) {
         errorMessage = 'Invalid API key or secret.';
       } else if (error.message.includes('permissions') || error.message.includes('permission')) {
           errorMessage = 'API key lacks necessary permissions (requires read access).';
       } else if (error.message.includes('symbol is invalid') || error.message.includes('Invalid symbol')) {
           // This might happen during price fetching for pairs that don't exist
           console.warn('[fetchBinanceAssets] Encountered invalid symbol during price fetch:', error.message);
           // Depending on where it happened, maybe it's not fatal if basic prices (like BTCUSDT) were fetched
           errorMessage = `Error fetching prices for some pairs: ${error.message}. Results might be incomplete.`;
       }
       else if (error.body && error.body.includes('-2015')) {
         // Tìm nạp kết quả phân tích lỗi API key hoặc IP
         errorMessage = 'API key của bạn không đúng, không có quyền truy cập, hoặc IP của bạn không được phép sử dụng API key này. Vui lòng kiểm tra lại cài đặt API key trong Binance.';
         // Thêm hướng dẫn kiểm tra IP
         errorMessage += '\n\nĐể kiểm tra IP của bạn và biết cách thêm vào whitelist, truy cập endpoint /api/ip-check của ứng dụng.';
       }
       else {
         errorMessage = `API Error: ${error.message}`;
       }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    return { success: false, data: [], error: errorMessage };
  }
}


// --- Fetch Trade History Action ---
export async function fetchBinanceTradeHistory(
    input: z.infer<typeof TradeHistoryInputSchema>
): Promise<BinanceTradeHistoryResult> {

    
    // Validate input server-side
    const validationResult = TradeHistoryInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, data: [], error: 'Invalid input for trade history.' };
    }

    let { apiKey, apiSecret, isTestnet, symbols, limit } = validationResult.data;
    
    // Làm sạch API key ngay từ đầu
    apiKey = apiKey.replace(/API Key:\s+/i, '').trim();

    // Khởi tạo client mới với phương pháp an toàn 
    let binance: any;
    try {
        binance = await createSafeBinanceClient(apiKey, apiSecret, isTestnet);
    } catch (initError: any) {
        return { success: false, data: [], error: `Failed to initialize Binance client: ${initError.message}` };
    }

    // Sửa đổi: Kiểm tra xem phương thức nào khả dụng
    // Kiểm tra nếu binance là một đối tượng hợp lệ
    if (!binance) {
        return { success: false, data: [], error: 'Không thể khởi tạo kết nối Binance' };
    }

    // Kiểm tra tất cả các phương thức có thể dùng cho lịch sử giao dịch
    const hasMyTrades = typeof binance.myTrades === 'function';
    const hasTrades = typeof binance.trades === 'function';
    const hasGetMyTrades = typeof binance.getMyTrades === 'function';
    const hasAllTrades = typeof binance.allTrades === 'function';
    
    // Chọn phương thức khả dụng theo thứ tự ưu tiên
    let tradeMethod;
    let methodName = '';
    
    if (hasMyTrades) {
        tradeMethod = binance.myTrades.bind(binance);
        methodName = 'myTrades';
    } else if (hasGetMyTrades) {
        tradeMethod = binance.getMyTrades.bind(binance);
        methodName = 'getMyTrades';
    } else if (hasTrades) {
        tradeMethod = binance.trades.bind(binance);
        methodName = 'trades';
    } else if (hasAllTrades) {
        tradeMethod = binance.allTrades.bind(binance);
        methodName = 'allTrades';
    }
    
    if (!tradeMethod) {
        return { 
            success: false, 
            data: [], 
            error: 'Thư viện Binance API không hỗ trợ truy vấn lịch sử giao dịch. Vui lòng kiểm tra phiên bản thư viện node-binance-api.' 
        };
    }

    try {
        // The `symbols` are already provided in the input
        if (!symbols || symbols.length === 0) {
            return { success: false, data: [], error: "No trading pairs specified to fetch history for." };
        }

        // --- Special Handling: Exchange Info Setup ---
        // 1. Fetch exchange info for symbol details - useful for understanding base/quote assets
        let exchangeInfo: any;
        try {
            // Import cache service dynamically to avoid circular dependency
            const { binanceCache } = await import('@/lib/cache/binance-cache');
            
            // Try cache first
            const cachedExchangeInfo = binanceCache.getExchangeInfo();
            if (cachedExchangeInfo) {
                console.log('[BinanceActions] ✅ Using cached exchange info');
                exchangeInfo = cachedExchangeInfo;
            } else {
                console.log('[BinanceActions] 🔄 Fetching fresh exchange info');
                exchangeInfo = await withRetry(async () => {
                    // Điều chỉnh thời gian trước khi gọi API
                    TimeSync.adjustOffset(-2000);
                    
                    // Track this API call
                    const baseUrl = input.isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
                    return await trackBinanceCall(
                        `${baseUrl}/api/v3/exchangeInfo`,
                        'GET',
                        () => binance.exchangeInfo(),
                        10 // Weight for /api/v3/exchangeInfo
                    );
                }, 5, 500, { apiKey, apiSecret });
                
                // Cache the result
                binanceCache.setExchangeInfo(exchangeInfo);
            }
        } catch (infoError: any) {
            // We can continue without exchange info, trades will just lack some additional metadata
            exchangeInfo = { symbols: [] };
        }

        // 2. Build a map of symbol details for easy lookup
        const symbolDetails: { [key: string]: { baseAsset: string; quoteAsset: string; } } = {};
        if (exchangeInfo && Array.isArray(exchangeInfo.symbols)) {
            exchangeInfo.symbols.forEach((symbol: any) => {
                if (symbol && symbol.symbol) {
                    symbolDetails[symbol.symbol] = {
                        baseAsset: symbol.baseAsset,
                        quoteAsset: symbol.quoteAsset
                    };
                }
            });
        }


        // --- Fetch trades concurrently with error handling for each symbol ---
        const fetchPromises = symbols.map(symbol => {
            return new Promise<Trade[]>(async (resolve) => { // Make inner function async
               try {
                   // Use the selected trade method with withRetry
                   // Sử dụng callback style cho phương thức trades                   
                   TimeSync.adjustOffset(-2000);
                   
                   // Thử sử dụng nhiều phương thức khác nhau theo thứ tự ưu tiên
                   if (methodName === 'myTrades' || methodName === 'getMyTrades') {
                       try {
                           // Sử dụng phương thức myTrades hoặc getMyTrades để lấy lịch sử giao dịch của người dùng
                           const myTradesData = await withRetry(async () => {
                               return await tradeMethod(symbol, { limit });
                           }, 5, 500, { apiKey, apiSecret });
                           
                           if (!myTradesData || !Array.isArray(myTradesData)) {
                               resolve([]);
                               return;
                           }
                           
                           // Xử lý dữ liệu myTrades
                           const processedTrades = myTradesData.map((trade: any): Trade => {
                               // Enhance trade with base/quote asset info if available                           
                               if (symbolDetails[symbol]) {
                                   return {
                                       ...trade,
                                       baseAsset: symbolDetails[symbol].baseAsset,
                                       quoteAsset: symbolDetails[symbol].quoteAsset
                                   };
                               }
                               // Return as-is if we don't have asset details                           
                               return trade as Trade;
                           });
                           
                           resolve(processedTrades);
                       } catch (myTradesError) {
                           // Fallback to trades method if myTrades fails
                           fallbackToTradesMethod();
                       }
                   } else {
                       // Sử dụng phương thức trades
                       fallbackToTradesMethod();
                   }
                   
                   // Hàm fallback sử dụng phương thức trades
                   function fallbackToTradesMethod() {
                       // Sử dụng phương thức trades với callback                   
                       binance.trades(symbol, function(error: any, tradesData: any[], symbolName: string) {
                           if (error) {
                               resolve([]);
                               return;
                           }
                           
                           // Check for valid response                       
                           if (!tradesData || !Array.isArray(tradesData)) {
                               resolve([]);
                               return;
                           }
                           
                           // Xử lý dữ liệu và resolve                       
                           const processedTrades = tradesData.map((trade: any): Trade => {
                               // Enhance trade with base/quote asset info if available                           
                               if (symbolDetails[symbol]) {
                                   return {
                                       ...trade,
                                       baseAsset: symbolDetails[symbol].baseAsset,
                                       quoteAsset: symbolDetails[symbol].quoteAsset
                                   };
                               }
                               // Return as-is if we don't have asset details                           
                               return trade as Trade;
                           });
                           
                           resolve(processedTrades);
                       }, { limit });
                   }
               } catch (tradeError: any) {
                   // Instead of failing everything, just return empty for this symbol
                   resolve([]);
               }
            });
        });


        // Use Promise.allSettled to handle individual promise failures without stopping the whole process
        const results = await Promise.allSettled(fetchPromises);
        let failedSymbols = 0;

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                // Count the failed symbols
                failedSymbols++;
            }
        });
        // --- End concurrent fetching ---


        // Sort trades by time, descending (most recent first)
        const allTrades = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
        allTrades.sort((a, b) => b.time - a.time);



        // Return success=true even if some symbols failed, as long as the overall process didn't crash
        return { success: true, data: allTrades };

    } catch (error: any) {
        // This catch block handles errors *outside* the Promise.allSettled loop (e.g., client setup, unexpected top-level errors)
        let errorMessage = 'An unknown error occurred while fetching trade history.';
        if (error?.message) {
            if (error.message.includes('Timestamp') || error.message.includes('timestamp')) {
                errorMessage = 'Request timed out or clock sync issue. Check system time and recvWindow.';
            } else if (error.message.includes('Invalid API-key') || error.message.includes('signature') || error.message.includes('-2008')) {
                errorMessage = 'Invalid API key or secret.';
            } else if (error.message.includes('permissions') || error.message.includes('permission')) {
                errorMessage = 'API key lacks permissions (requires trade history access).';
            }
             // Explicitly check for the function existence error here as well
            else if (error.message.includes('binance.trades is not a function')) { // Check for `trades`
                 errorMessage = 'Internal Server Error: Trade history feature unavailable (function missing). Check library version.';
            }
            else if (error.body && error.body.includes('-2015')) {
                // Tìm nạp kết quả phân tích lỗi API key hoặc IP
                errorMessage = 'API key của bạn không đúng, không có quyền truy cập, hoặc IP của bạn không được phép sử dụng API key này. Vui lòng kiểm tra lại cài đặt API key trong Binance.';
                // Thêm hướng dẫn kiểm tra IP
                errorMessage += '\n\nĐể kiểm tra IP của bạn và biết cách thêm vào whitelist, truy cập endpoint /api/ip-check của ứng dụng.';
            }
            else {
                 errorMessage = `API Error: ${error.message}`;
            }

        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return { success: false, data: [], error: errorMessage };
    }
}

    