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

// Define the input schema for the trade history action (can reuse BinanceInputSchema or be more specific)
const TradeHistoryInputSchema = BinanceInputSchema.extend({
    symbols: z.array(z.string()).optional(), // Optional: Fetch history only for specific symbols
    limit: z.number().optional().default(500), // Optional: Limit number of trades per symbol
});


// Define the output schema (or structure) for the asset action
interface BinanceAssetsResult {
  success: boolean;
  data: Asset[];
  error?: string;
  // Include symbols with balance for trade history fetching
  ownedSymbols?: string[];
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
  // Validate input server-side
  const validationResult = BinanceInputSchema.safeParse(input);
  if (!validationResult.success) {
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
    const balances = await binance.balance();
    if (!balances) {
      throw new Error('Failed to fetch balances.');
    }

    // 2. Filter assets with positive balance and prepare symbols for price fetching
    const ownedAssetSymbolsWithBalance = Object.keys(balances).filter(
      symbol => parseFloat(balances[symbol].available) > 0 || parseFloat(balances[symbol].onOrder) > 0
    );

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
     });
      // Ensure BTCUSDT price is fetched if we have BTC or need it for conversion
     if (symbolsForPricing.has('BTC')) {
        symbolsToFetchPrices.add('BTCUSDT');
     }


    // 3. Fetch current prices for the required trading pairs
    const prices = await binance.prices();
    if (!prices) {
      throw new Error('Failed to fetch prices.');
    }

    const filteredPrices: { [key: string]: string } = {};
    symbolsToFetchPrices.forEach(symbol => {
      if (prices[symbol]) {
        filteredPrices[symbol] = prices[symbol];
      }
    });

    const btcUsdtPrice = parseFloat(filteredPrices['BTCUSDT'] || '0'); // Get BTC price in USDT

    // 4. Calculate total value for each asset
    const assets: Asset[] = [];
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
        } else if (assetSymbol === 'BTC') {
             valueInUsd = quantity * btcUsdtPrice;
        }
        // Add logic here to fetch full asset names if desired (might require another API or mapping)
        // e.g., const nameMap = { BTC: 'Bitcoin', ETH: 'Ethereum' }; assetName = nameMap[assetSymbol] || assetSymbol;


        if (valueInUsd > 0.01) { // Only include assets with a minimum value (e.g., $0.01)
             assets.push({
               asset: assetName, // Use fetched/mapped name or symbol
               symbol: assetSymbol,
               quantity: quantity,
               totalValue: valueInUsd,
             });
        }

    }


    // Sort assets by value, descending
    assets.sort((a, b) => b.totalValue - a.totalValue);

    return { success: true, data: assets, ownedSymbols: ownedAssetSymbolsWithBalance };
  } catch (error: any) {
    console.error('Binance Asset Fetch Error:', error);
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
           console.warn('Ignoring invalid symbol error during price fetch:', error.message);
           // Continue execution if possible, or return partial data? For now, fail.
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
    const validationResult = TradeHistoryInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, data: [], error: 'Invalid input for trade history.' };
    }

    const { apiKey, apiSecret, isTestnet, symbols, limit } = validationResult.data;

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
        let symbolsToFetch: string[] = [];

        // If specific symbols are provided, use them
        if (symbols && symbols.length > 0) {
            symbolsToFetch = symbols;
        } else {
            // Otherwise, fetch all available trading pairs (this can be a lot!)
            // Alternatively, fetch symbols from user's balance (requires another call or passing from asset fetch)
            // For now, let's fetch pairs based on common quote assets USDT and BTC - this is an assumption
            // A better approach would be to pass owned symbols from the asset fetch result.
            // **MODIFICATION**: Expect `symbols` to be passed (e.g., from asset fetch result).
            // If `symbols` is empty/undefined, maybe default to BTCUSDT or return error.
            // For this implementation, we require `symbols` to be passed if not specified in input.
             if (!input.symbols) {
                // Fetch symbols from account info if not provided
                 const accountInfo = await binance.account();
                 if (!accountInfo || !accountInfo.balances) {
                     throw new Error('Could not fetch account info to determine symbols.');
                 }
                 const ownedSymbols = accountInfo.balances
                    .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
                    .map((b: any) => b.asset);

                // Need to form pairs (e.g., BTC -> BTCUSDT, ETH -> ETHUSDT, ETHBTC)
                // This logic can get complex. Let's try fetching common pairs for owned assets.
                const exchangeInfo = await binance.exchangeInfo();
                const availableSymbols = exchangeInfo.symbols.map((s: any) => s.symbol);

                ownedSymbols.forEach((asset: string) => {
                     if (asset !== 'USDT' && availableSymbols.includes(`${asset}USDT`)) {
                        symbolsToFetch.push(`${asset}USDT`);
                     }
                     if (asset !== 'BTC' && asset !== 'USDT' && availableSymbols.includes(`${asset}BTC`)) {
                        symbolsToFetch.push(`${asset}BTC`);
                     }
                     // Add more quote currencies if needed (e.g., EUR, BNB)
                });
                // Remove duplicates
                symbolsToFetch = [...new Set(symbolsToFetch)];

                if (symbolsToFetch.length === 0 && ownedSymbols.includes('BTC') && availableSymbols.includes('BTCUSDT')){
                     symbolsToFetch.push('BTCUSDT'); // Fallback for BTC only accounts
                }
             } else {
                 symbolsToFetch = input.symbols; // Use provided symbols directly
             }


            if (symbolsToFetch.length === 0) {
                 return { success: true, data: [], error: "No relevant trading pairs found for your assets or none specified." };
            }

        }


        console.log(`Fetching trades for symbols: ${symbolsToFetch.join(', ')} with limit ${limit}`);


        let allTrades: Trade[] = [];
        // Check if the myTrades function exists on the binance instance
         if (typeof binance.myTrades !== 'function') {
           console.error('binance.myTrades is not a function. The Binance API library might have changed or not initialized correctly.');
           return { success: false, data: [], error: 'Internal Server Error: Could not access trade history function.' };
         }

        const fetchPromises = symbolsToFetch.map(symbol => {
            // Explicitly wrap the call in a promise and handle potential errors
            return new Promise<Trade[]>((resolve, reject) => {
                binance.myTrades(symbol, { limit: limit })
                    .then((trades: any) => {
                        if (Array.isArray(trades)) {
                            console.log(`Fetched ${trades.length} trades for ${symbol}`);
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
                            console.warn(`Received non-array response for ${symbol} trades:`, trades);
                            resolve([]); // Return empty array if response is not as expected
                        }
                    })
                    .catch((error: any) => {
                         // Handle specific errors, e.g., "Invalid symbol"
                        if (error?.message?.includes('Invalid symbol') || error?.body?.includes('-1121')) {
                            console.warn(`Skipping invalid symbol for trade history: ${symbol}`);
                            resolve([]); // Resolve with empty array for ignored errors
                        } else if(error?.message?.includes('Duplicate') || error?.body?.includes('-1104')) {
                            // Sometimes happens with concurrent requests, maybe retry or ignore
                            console.warn(`Duplicate request warning for ${symbol}, skipping: ${error.message}`);
                            resolve([]);
                        } else if(error?.message?.includes('Too many requests') || error?.body?.includes('-1003')) {
                            console.warn(`Rate limited fetching trades for ${symbol}, skipping.`);
                            // Implement backoff/retry later if needed
                            resolve([]);
                        } else {
                            console.error(`Error fetching trades for ${symbol}:`, error);
                             // Reject other errors so Promise.allSettled can catch them
                             reject(new Error(`Failed to fetch trades for ${symbol}: ${error.message || 'Unknown error'}`));
                        }
                    });
            });
        });


        // Use Promise.allSettled to handle individual promise failures without stopping the whole process
        const results = await Promise.allSettled(fetchPromises);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allTrades = allTrades.concat(result.value);
            } else {
                // Log the error for the specific symbol that failed
                console.error(`Failed to fetch trades for symbol ${symbolsToFetch[index]}:`, result.reason);
                // Optionally, you could add a partial error message to the final result
            }
        });


        // Sort trades by time, descending (most recent first)
        allTrades.sort((a, b) => b.time - a.time);

        console.log(`Fetched a total of ${allTrades.length} trades. Some symbols might have failed.`);

        return { success: true, data: allTrades }; // Still return success=true, but maybe add a note about partial data if errors occurred

    } catch (error: any) {
        console.error('Binance Trade History Fetch Error:', error);
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
