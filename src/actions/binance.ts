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

// Define the input schema for the action
const BinanceInputSchema = z.object({
  apiKey: z.string().min(10), // Basic length check
  apiSecret: z.string().min(10), // Basic length check
  isTestnet: z.boolean(),
});

// Define the output schema (or structure) for the action
interface BinanceActionResult {
  success: boolean;
  data: Asset[];
  error?: string;
}

export async function fetchBinanceAssets(
  input: z.infer<typeof BinanceInputSchema>
): Promise<BinanceActionResult> {
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
    const ownedAssetsSymbols = Object.keys(balances).filter(
      symbol => parseFloat(balances[symbol].available) > 0 || parseFloat(balances[symbol].onOrder) > 0
    );

    // Add "BTC" if not present to ensure we can calculate non-USDT pairs
    if (!ownedAssetsSymbols.includes('BTC') && ownedAssetsSymbols.length > 0) {
        ownedAssetsSymbols.push('BTC');
    }
     // Add "USDT" if not present to ensure we have a base quote currency
     if (!ownedAssetsSymbols.includes('USDT') && ownedAssetsSymbols.length > 0) {
         ownedAssetsSymbols.push('USDT');
     }


    const symbolsToFetch = new Set<string>();
    ownedAssetsSymbols.forEach(assetSymbol => {
      if (assetSymbol !== 'USDT') {
        symbolsToFetch.add(`${assetSymbol}USDT`); // Try direct USDT pair first
        symbolsToFetch.add(`${assetSymbol}BTC`); // Try BTC pair as fallback
      }
    });
     // Ensure BTCUSDT price is fetched if we have BTC or need it for conversion
    if (ownedAssetsSymbols.includes('BTC')) {
       symbolsToFetch.add('BTCUSDT');
    }


    // 3. Fetch current prices for the required trading pairs
    const prices = await binance.prices();
    if (!prices) {
      throw new Error('Failed to fetch prices.');
    }

    const filteredPrices: { [key: string]: string } = {};
    symbolsToFetch.forEach(symbol => {
      if (prices[symbol]) {
        filteredPrices[symbol] = prices[symbol];
      }
    });

    const btcUsdtPrice = parseFloat(filteredPrices['BTCUSDT'] || '0'); // Get BTC price in USDT

    // 4. Calculate total value for each asset
    const assets: Asset[] = [];
    for (const assetSymbol of ownedAssetsSymbols) {
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

    return { success: true, data: assets };
  } catch (error: any) {
    console.error('Binance API Error:', error);
    // Provide a more user-friendly error message
    let errorMessage = 'An unknown error occurred.';
    if (error?.message) {
      if (error.message.includes('Timestamp') || error.message.includes('timestamp')) {
        errorMessage = 'Request timed out or clock sync issue. Check system time.';
      } else if (error.message.includes('Invalid API-key') || error.message.includes('signature')) {
        errorMessage = 'Invalid API key or secret.';
      } else if (error.message.includes('permissions') || error.message.includes('permission')) {
          errorMessage = 'API key lacks necessary permissions (requires read access).';
      } else {
        errorMessage = `API Error: ${error.message}`;
      }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    return { success: false, data: [], error: errorMessage };
  }
}
