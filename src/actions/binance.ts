// src/actions/binance.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api'; // Import the library

// Define the structure for an asset
export interface Asset {
  asset: string;
  symbol: string; // Added symbol for consistency
  quantity: number;
  totalValue: number; // Value in USD
}

// Define the structure for a trade
export interface Trade {
    symbol: string;
    id: number;
    orderId: number;
    price: string;
    qty: string;
    quoteQty: string; // Total value of the trade (price * qty)
    commission: string;
    commissionAsset: string;
    time: number; // Timestamp
    isBuyer: boolean;
    isMaker: boolean;
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
    symbols: z.array(z.string()).min(1, "At least one symbol must be provided."),
    limit: z.number().optional().default(500), // Optional: Limit number of trades per symbol
});


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
    data: Trade[];
    error?: string;
}


// --- Fetch Assets Action ---
export async function fetchBinanceAssets(
  input: z.infer<typeof BinanceInputSchema>
): Promise<BinanceAssetsResult> {
  console.log('[fetchBinanceAssets] Input:', { apiKey: '***', apiSecret: '***', isTestnet: input.isTestnet });
  // Validate input server-side
  const validationResult = BinanceInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[fetchBinanceAssets] Invalid input:', validationResult.error);
    return { success: false, data: [], error: 'Invalid input.' };
  }

  const { apiKey, apiSecret, isTestnet } = validationResult.data;

  // Configure Binance client
  const binance = new Binance().options({
    APIKEY: apiKey,
    APISECRET: apiSecret,
    // Use testnet URLs if isTestnet is true
    ...(isTestnet && {
      urls: {
        base: 'https://testnet.binance.vision/api/',
        // Add other testnet URLs if needed (e.g., for streams)
      },
    }),
    // Consider adding recvWindow if requests time out
    // recvWindow: 60000,
  });

  try {
    // 1. Fetch account balances
    console.log('[fetchBinanceAssets] Fetching balances...');
    const balances = await binance.balance();
    if (!balances) {
      console.error('[fetchBinanceAssets] Failed to fetch balances.');
      throw new Error('Failed to fetch balances.');
    }
    console.log('[fetchBinanceAssets] Balances received:', Object.keys(balances).length, 'assets');

    // 2. Filter assets with positive balance and prepare symbols for price fetching
    const ownedAssetSymbolsWithBalance = Object.keys(balances).filter(
      symbol => parseFloat(balances[symbol].available) > 0 || parseFloat(balances[symbol].onOrder) > 0
    );
    console.log('[fetchBinanceAssets] Owned symbols with balance:', ownedAssetSymbolsWithBalance);


    // Add "BTC" and "USDT" if needed for price calculations
    const symbolsForPricing = new Set(ownedAssetSymbolsWithBalance);
    if (ownedAssetSymbolsWithBalance.length > 0) {
        if (!symbolsForPricing.has('BTC')) symbolsForPricing.add('BTC');
        if (!symbolsForPricing.has('USDT')) symbolsForPricing.add('USDT');
    }


    const symbolsToFetchPrices = new Set<string>();
     symbolsForPricing.forEach(assetSymbol => {
       if (assetSymbol !== 'USDT') {
         symbolsToFetchPrices.add(`${assetSymbol}USDT`); // Try direct USDT pair first
         symbolsToFetchPrices.add(`${assetSymbol}BTC`); // Try BTC pair as fallback
       }
       // Add other quote pairs if needed, e.g., ETH pairs
       if (assetSymbol !== 'ETH' && assetSymbol !== 'USDT' && assetSymbol !== 'BTC') {
            symbolsToFetchPrices.add(`${assetSymbol}ETH`);
       }
     });
      // Ensure BTCUSDT price is fetched if we have BTC or need it for conversion
     if (symbolsForPricing.has('BTC')) {
        symbolsToFetchPrices.add('BTCUSDT');
     }
     if (symbolsForPricing.has('ETH')) {
         symbolsToFetchPrices.add('ETHUSDT'); // Ensure ETH price in USDT is fetched
     }


    // 3. Fetch current prices for the required trading pairs
    console.log(`[fetchBinanceAssets] Fetching prices for ${symbolsToFetchPrices.size} potential pairs...`);
    const prices = await binance.prices();
    if (!prices) {
      console.error('[fetchBinanceAssets] Failed to fetch prices.');
      throw new Error('Failed to fetch prices.');
    }
    console.log('[fetchBinanceAssets] Prices received for', Object.keys(prices).length, 'pairs.');


    const filteredPrices: { [key: string]: string } = {};
    symbolsToFetchPrices.forEach(symbol => {
      if (prices[symbol]) {
        filteredPrices[symbol] = prices[symbol];
      }
    });
    console.log('[fetchBinanceAssets] Filtered relevant prices:', Object.keys(filteredPrices).length);


    const btcUsdtPrice = parseFloat(filteredPrices['BTCUSDT'] || '0'); // Get BTC price in USDT
    const ethUsdtPrice = parseFloat(filteredPrices['ETHUSDT'] || '0'); // Get ETH price in USDT

    // 4. Calculate total value for each asset
    const assets: Asset[] = [];
    console.log('[fetchBinanceAssets] Calculating asset values...');
    for (const assetSymbol of ownedAssetSymbolsWithBalance) { // Iterate only over symbols with balance
        const quantity = parseFloat(balances[assetSymbol].available) + parseFloat(balances[assetSymbol].onOrder);
        if (quantity <= 0) continue; // Skip if total quantity is zero or less

        let valueInUsd = 0;
        let assetName = assetSymbol; // Default name to symbol

        if (assetSymbol === 'USDT') {
            valueInUsd = quantity;
        } else if (filteredPrices[`${assetSymbol}USDT`]) {
            // Direct conversion to USDT
            valueInUsd = quantity * parseFloat(filteredPrices[`${assetSymbol}USDT`]);
        } else if (filteredPrices[`${assetSymbol}BTC`] && btcUsdtPrice > 0) {
            // Convert via BTC
            const valueInBtc = quantity * parseFloat(filteredPrices[`${assetSymbol}BTC`]);
            valueInUsd = valueInBtc * btcUsdtPrice;
        } else if (filteredPrices[`${assetSymbol}ETH`] && ethUsdtPrice > 0) {
            // Convert via ETH
            const valueInEth = quantity * parseFloat(filteredPrices[`${assetSymbol}ETH`]);
            valueInUsd = valueInEth * ethUsdtPrice;
        }
         else if (assetSymbol === 'BTC' && btcUsdtPrice > 0) {
             valueInUsd = quantity * btcUsdtPrice;
        }
        else if (assetSymbol === 'ETH' && ethUsdtPrice > 0) {
            valueInUsd = quantity * ethUsdtPrice;
        }
         // Add more conversion logic here if needed (e.g., via BNB)

        // Add logic here to fetch full asset names if desired (might require another API or mapping)
        // e.g., const nameMap = { BTC: 'Bitcoin', ETH: 'Ethereum' }; assetName = nameMap[assetSymbol] || assetSymbol;


        if (valueInUsd > 0.01) { // Only include assets with a minimum value (e.g., $0.01)
             assets.push({
               asset: assetName, // Use fetched/mapped name or symbol
               symbol: assetSymbol, // Store the base asset symbol
               quantity: quantity,
               totalValue: valueInUsd,
             });
        }

    }
    console.log('[fetchBinanceAssets] Calculated values for', assets.length, 'assets with value > $0.01');


    // Sort assets by value, descending
    assets.sort((a, b) => b.totalValue - a.totalValue);

    console.log('[fetchBinanceAssets] Successfully fetched assets. Returning owned symbols:', ownedAssetSymbolsWithBalance);
    // Return the base asset symbols (like BTC, ETH), not trading pairs
    return { success: true, data: assets, ownedSymbols: ownedAssetSymbolsWithBalance };
  } catch (error: any) {
    console.error('[fetchBinanceAssets] Error:', error);
    // Provide a more user-friendly error message
    let errorMessage = 'An unknown error occurred while fetching assets.';
    if (error?.message) {
       if (error.message.includes('Timestamp') || error.message.includes('timestamp')) {
         errorMessage = 'Request timed out or clock sync issue. Check system time.';
       } else if (error.message.includes('Invalid API-key') || error.message.includes('signature')) {
         errorMessage = 'Invalid API key or secret.';
       } else if (error.message.includes('permissions') || error.message.includes('permission')) {
           errorMessage = 'API key lacks necessary permissions (requires read access).';
       } else if (error.message.includes('symbol is invalid') || error.message.includes('Invalid symbol')) {
           // Ignore invalid symbol errors during price fetching if possible, log otherwise
           console.warn('[fetchBinanceAssets] Ignoring invalid symbol error during price fetch:', error.message);
           // Continue execution if possible, or return partial data? For now, fail.
           // This error shouldn't ideally stop the entire asset fetch, maybe return partial success?
           errorMessage = `Error fetching prices: ${error.message}`;
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
     console.log('[fetchBinanceTradeHistory] Input:', { apiKey: '***', apiSecret: '***', isTestnet: input.isTestnet, symbolsCount: input.symbols?.length, limit: input.limit });
    const validationResult = TradeHistoryInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error('[fetchBinanceTradeHistory] Invalid input:', validationResult.error);
        return { success: false, data: [], error: 'Invalid input for trade history.' };
    }

    // Destructure validated data, including the `symbols` array (trading pairs)
    const { apiKey, apiSecret, isTestnet, symbols: tradingPairsToFetch, limit } = validationResult.data;

    // Configure Binance client
    const binance = new Binance().options({
        APIKEY: apiKey,
        APISECRET: apiSecret,
        ...(isTestnet && {
            urls: { base: 'https://testnet.binance.vision/api/' },
        }),
        // recvWindow: 60000,
    });

    try {
        // The `symbols` are already provided in the input as `tradingPairsToFetch`
        if (!tradingPairsToFetch || tradingPairsToFetch.length === 0) {
             console.warn('[fetchBinanceTradeHistory] No trading pairs provided in input.');
             // This case should ideally be prevented by the Zod schema (`.min(1)`)
             return { success: false, data: [], error: "No trading pairs specified to fetch history for." };
        }

        console.log(`[fetchBinanceTradeHistory] Fetching trades for ${tradingPairsToFetch.length} symbols (limit ${limit} per symbol): ${tradingPairsToFetch.slice(0, 10).join(', ')}${tradingPairsToFetch.length > 10 ? '...' : ''}`);


        let allTrades: Trade[] = [];
        // Check if the myTrades function exists on the binance instance
         if (typeof binance.myTrades !== 'function') {
           console.error('[fetchBinanceTradeHistory] binance.myTrades is not a function. Library issue?');
           return { success: false, data: [], error: 'Internal Server Error: Could not access trade history function.' };
         }

        // --- Fetch trades concurrently with error handling for each symbol ---
        const fetchPromises = tradingPairsToFetch.map(symbol => {
            return new Promise<Trade[]>((resolve, reject) => {
                binance.myTrades(symbol, { limit: limit })
                    .then((trades: any) => {
                        if (Array.isArray(trades)) {
                            // console.log(`[fetchBinanceTradeHistory] Fetched ${trades.length} trades for ${symbol}`);
                            // Ensure trades have the expected structure
                            resolve(trades.map((trade: any) => ({
                                symbol: trade.symbol,
                                id: trade.id,
                                orderId: trade.orderId,
                                price: trade.price,
                                qty: trade.qty,
                                quoteQty: trade.quoteQty,
                                commission: trade.commission,
                                commissionAsset: trade.commissionAsset,
                                time: trade.time,
                                isBuyer: trade.isBuyer,
                                isMaker: trade.isMaker,
                            } as Trade)));
                        } else {
                            console.warn(`[fetchBinanceTradeHistory] Received non-array response for ${symbol} trades:`, trades);
                            resolve([]); // Return empty array if response is not as expected
                        }
                    })
                    .catch((error: any) => {
                         // Handle specific errors, e.g., "Invalid symbol" (-1121)
                        if (error?.body?.includes('-1121') || error?.message?.includes('Invalid symbol')) {
                            // console.warn(`[fetchBinanceTradeHistory] Skipping invalid symbol for trade history: ${symbol}`);
                            resolve([]); // Resolve with empty array for ignored errors (symbol doesn't exist or no trades)
                        } else if(error?.message?.includes('Duplicate') || error?.body?.includes('-1104')) {
                            console.warn(`[fetchBinanceTradeHistory] Duplicate request warning for ${symbol}, skipping: ${error.message}`);
                            resolve([]);
                        } else if(error?.message?.includes('Too many requests') || error?.body?.includes('-1003')) {
                            console.warn(`[fetchBinanceTradeHistory] Rate limited fetching trades for ${symbol}, skipping.`);
                            // Implement backoff/retry later if needed
                            resolve([]);
                        } else if (error?.message?.includes('permissions')) {
                             console.error(`[fetchBinanceTradeHistory] Permission error for ${symbol}:`, error.message);
                             // Don't reject the whole batch, just skip this symbol
                             resolve([]);
                        }
                         else {
                            console.error(`[fetchBinanceTradeHistory] Error fetching trades for ${symbol}:`, error);
                             // Reject other unexpected errors so Promise.allSettled can catch them
                             // Avoid rejecting, resolve empty to allow other symbols to proceed
                             resolve([]);
                             // reject(new Error(`Failed to fetch trades for ${symbol}: ${error.message || 'Unknown error'}`));
                        }
                    });
            });
        });


        // Use Promise.allSettled to handle individual promise failures without stopping the whole process
        const results = await Promise.allSettled(fetchPromises);
        let failedSymbols = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allTrades = allTrades.concat(result.value);
            } else {
                // Log the error for the specific symbol that failed
                failedSymbols++;
                console.error(`[fetchBinanceTradeHistory] Failed to fetch trades for symbol ${tradingPairsToFetch[index]} (Promise Rejected):`, result.reason);
                // Optionally, you could add a partial error message to the final result
            }
        });
        // --- End concurrent fetching ---


        // Sort trades by time, descending (most recent first)
        allTrades.sort((a, b) => b.time - a.time);

        console.log(`[fetchBinanceTradeHistory] Fetched a total of ${allTrades.length} trades. ${failedSymbols} symbols failed or were skipped.`);

        // Return success=true even if some symbols failed, as long as the overall process didn't crash
        return { success: true, data: allTrades };

    } catch (error: any) {
        // This catch block handles errors *outside* the Promise.allSettled loop (e.g., client setup, unexpected top-level errors)
        console.error('[fetchBinanceTradeHistory] Overall Fetch Error:', error);
        let errorMessage = 'An unknown error occurred while fetching trade history.';
        if (error?.message) {
            if (error.message.includes('Timestamp') || error.message.includes('timestamp')) {
                errorMessage = 'Request timed out or clock sync issue. Check system time.';
            } else if (error.message.includes('Invalid API-key') || error.message.includes('signature')) {
                errorMessage = 'Invalid API key or secret.';
            } else if (error.message.includes('permissions') || error.message.includes('permission')) {
                errorMessage = 'API key lacks permissions (requires trade history access).';
            } else if (error.message.includes('binance.myTrades is not a function')) { // Catch the specific error
                 errorMessage = 'Internal Server Error: Trade history feature unavailable.';
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
