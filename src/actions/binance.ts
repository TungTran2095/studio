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
    // recvWindow: 60000, // Increased timeout window
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
    console.log(`[fetchBinanceAssets] Fetching prices for ${symbolsToFetchPrices.size} potential pairs...`);
    let prices: { [key: string]: string } = {};
    try {
        // Only fetch prices if we have symbols to fetch for
        if (symbolsToFetchPrices.size > 0) {
            prices = await binance.prices();
             if (!prices) {
               console.error('[fetchBinanceAssets] Failed to fetch prices (returned null/undefined).');
               throw new Error('Failed to fetch prices.');
             }
         } else {
            console.log('[fetchBinanceAssets] No symbols require price fetching.');
        }
    } catch (priceError: any) {
        // Log the error but potentially continue if some prices were fetched before error
         console.error('[fetchBinanceAssets] Error during price fetch:', priceError.message || priceError);
         // Decide if this is fatal or if we can proceed with partial data
         // For now, let's treat it as fatal to avoid incorrect calculations
         throw new Error(`Failed to fetch all necessary prices: ${priceError.message}`);
    }

    console.log('[fetchBinanceAssets] Prices received for', Object.keys(prices).length, 'pairs.');


    const filteredPrices: { [key: string]: string } = {};
    symbolsToFetchPrices.forEach(symbol => {
      if (prices[symbol]) {
        filteredPrices[symbol] = prices[symbol];
      }
    });
    console.log('[fetchBinanceAssets] Filtered relevant prices:', Object.keys(filteredPrices).length);


    const getPrice = (symbol: string): number => parseFloat(filteredPrices[symbol] || '0');
    const btcUsdtPrice = getPrice('BTCUSDT');


    // 4. Calculate total value for each asset
    const assets: Asset[] = [];
    console.log('[fetchBinanceAssets] Calculating asset values...');
    for (const assetSymbol of ownedAssetSymbolsWithBalance) { // Iterate only over symbols with balance
        const quantity = parseFloat(balances[assetSymbol].available) + parseFloat(balances[assetSymbol].onOrder);
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


        if (valueInUsd > 0.01) { // Only include assets with a minimum value (e.g., $0.01)
             assets.push({
               asset: assetName, // Use fetched/mapped name or symbol
               symbol: assetSymbol, // Store the base asset symbol
               quantity: quantity,
               totalValue: valueInUsd,
             });
        } else if (quantity > 0) {
             console.log(`[fetchBinanceAssets] Asset ${assetSymbol} has quantity ${quantity} but value <= $0.01, skipping.`);
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
        // recvWindow: 60000, // Consider increasing if timeouts occur
    });

    // ** REINFORCED CHECK: Verify if myTrades function exists **
    if (typeof binance.myTrades !== 'function') {
      const errorMsg = 'Internal Server Error: Could not access trade history function (myTrades method not found on Binance client). Check library version or initialization.';
      console.error(`[fetchBinanceTradeHistory] ${errorMsg}`);
      console.error('[fetchBinanceTradeHistory] Binance client instance properties:', Object.keys(binance)); // Log available properties/methods for inspection
      return { success: false, data: [], error: errorMsg };
    }
    // ** END REINFORCED CHECK **

    try {
        // The `symbols` are already provided in the input as `tradingPairsToFetch`
        if (!tradingPairsToFetch || tradingPairsToFetch.length === 0) {
             console.warn('[fetchBinanceTradeHistory] No trading pairs provided in input.');
             // This case should ideally be prevented by the Zod schema (`.min(1)`)
             return { success: false, data: [], error: "No trading pairs specified to fetch history for." };
        }

        console.log(`[fetchBinanceTradeHistory] Fetching trades for ${tradingPairsToFetch.length} symbols (limit ${limit} per symbol): ${tradingPairsToFetch.slice(0, 10).join(', ')}${tradingPairsToFetch.length > 10 ? '...' : ''}`);


        let allTrades: Trade[] = [];


        // --- Fetch trades concurrently with error handling for each symbol ---
        const fetchPromises = tradingPairsToFetch.map(symbol => {
            return new Promise<Trade[]>(async (resolve) => { // Make inner function async
               try {
                   // Now we know binance.myTrades exists (or the check above would have returned)
                   const trades: any[] = await binance.myTrades(symbol, { limit: limit });

                    if (Array.isArray(trades)) {
                        // console.log(`[fetchBinanceTradeHistory] Fetched ${trades.length} trades for ${symbol}`);

                        // --- Determine Base and Quote Asset ---
                        const knownQuoteAssets = ['USDT', 'USDC', 'TUSD', 'BUSD', 'FDUSD', 'BTC', 'ETH', 'BNB']; // More extensive list
                        let baseAsset = symbol; // Default assumption
                        let quoteAsset = '';

                         for (const quote of knownQuoteAssets) {
                            if (symbol.endsWith(quote) && symbol.length > quote.length) {
                                const potentialBase = symbol.substring(0, symbol.length - quote.length);
                                if (/^[A-Z0-9]+$/.test(potentialBase)) { // Basic validation
                                    baseAsset = potentialBase;
                                    quoteAsset = quote;
                                    break;
                                }
                            }
                        }
                         // Fallback if no known quote asset matched (less likely for trade pairs)
                        if (!quoteAsset && symbol.length > 3) {
                            const potentialQuote = symbol.substring(symbol.length - 3); // Assume 3-char quote
                            const potentialBase = symbol.substring(0, symbol.length - 3);
                             if (/^[A-Z0-9]+$/.test(potentialBase) && /^[A-Z]+$/.test(potentialQuote)) {
                                 baseAsset = potentialBase;
                                 quoteAsset = potentialQuote;
                             }
                        }
                        // --- End Base/Quote Determination ---

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
                            baseAsset: baseAsset, // Add determined base asset
                            quoteAsset: quoteAsset, // Add determined quote asset
                        } as Trade)));
                    } else {
                        console.warn(`[fetchBinanceTradeHistory] Received non-array response for ${symbol} trades:`, trades);
                        resolve([]); // Return empty array if response is not as expected
                    }
               } catch (error: any) {
                     // Handle specific errors, e.g., "Invalid symbol" (-1121)
                    if (error?.body?.includes('-1121') || error?.message?.includes('Invalid symbol')) {
                        // console.warn(`[fetchBinanceTradeHistory] Skipping invalid symbol for trade history: ${symbol}`);
                        resolve([]); // Resolve with empty array for ignored errors (symbol doesn't exist or no trades)
                    } else if (error?.message?.includes('Duplicate') || error?.body?.includes('-1104')) {
                        console.warn(`[fetchBinanceTradeHistory] Duplicate request warning for ${symbol}, skipping: ${error.message}`);
                        resolve([]);
                    } else if (error?.message?.includes('Too many requests') || error?.body?.includes('-1003')) {
                        console.warn(`[fetchBinanceTradeHistory] Rate limited fetching trades for ${symbol}, skipping.`);
                        // Implement backoff/retry later if needed
                        resolve([]);
                    } else if (error?.message?.includes('permissions') || error?.body?.includes('-2008')) { // -2008 Invalid Api-Key ID
                         console.error(`[fetchBinanceTradeHistory] Permission or API Key error for ${symbol}:`, error.message);
                         // Resolve empty, but maybe bubble up the error if it's key-related?
                         resolve([]);
                    }
                    else {
                        console.error(`[fetchBinanceTradeHistory] Error fetching trades for ${symbol}:`, error);
                         // Resolve empty to allow other symbols to proceed
                         resolve([]);
                    }
               }
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
                errorMessage = 'Request timed out or clock sync issue. Check system time and recvWindow.';
            } else if (error.message.includes('Invalid API-key') || error.message.includes('signature') || error.message.includes('-2008')) {
                errorMessage = 'Invalid API key or secret.';
            } else if (error.message.includes('permissions') || error.message.includes('permission')) {
                errorMessage = 'API key lacks permissions (requires trade history access).';
            }
             // Explicitly check for the function existence error here as well, though the initial check should catch it
            else if (error.message.includes('binance.myTrades is not a function')) {
                 errorMessage = 'Internal Server Error: Trade history feature unavailable (function missing).';
                 console.error('[fetchBinanceTradeHistory] Caught error confirming myTrades is not a function.');
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
