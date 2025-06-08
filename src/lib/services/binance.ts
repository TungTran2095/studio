import { OHLCV } from '@/modules/backtesting/types';

export class BinanceService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private isTestnet: boolean;

  constructor(apiKey: string, apiSecret: string, isTestnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet 
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
    
    if (isTestnet) {
      console.warn('WARNING: Using Binance Testnet. Historical data may not be available.');
    }
  }

  private async request(endpoint: string, params: Record<string, any> = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}?${queryString}`;
      
      console.log('Making request to:', url);
      console.log('Request params:', params);
      console.log('Using environment:', this.isTestnet ? 'Testnet' : 'Mainnet');
      
      const response = await fetch(url, {
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('Binance API error:', data);
        if (this.isTestnet && endpoint === '/v3/klines') {
          console.error('NOTE: Testnet does not provide historical data. Please use mainnet for backtesting.');
        }
        throw new Error(data.msg || `Binance API error: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Request error:', error);
      console.error('Request details:', {
        endpoint,
        params,
        baseUrl: this.baseUrl,
        isTestnet: this.isTestnet
      });
      if (error instanceof Error) {
        throw new Error(`Binance API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling Binance API');
    }
  }

  async getKlines(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<OHLCV[]> {
    try {
      console.log('Getting klines with params:', {
        symbol,
        interval,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        limit
      });

      // Validate symbol format
      const formattedSymbol = symbol.toUpperCase();
      if (!formattedSymbol.match(/^[A-Z0-9]+$/)) {
        throw new Error('Invalid symbol format');
      }

      // Validate interval
      const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
      if (!validIntervals.includes(interval)) {
        throw new Error('Invalid interval');
      }

      const params: Record<string, any> = {
        symbol: formattedSymbol,
        interval,
        limit
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const data = await this.request('/v3/klines', params);
      
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from Binance');
      }

      const klines = data.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));

      console.log(`Processed ${klines.length} klines`);
      if (klines.length > 0) {
        console.log('First kline:', klines[0]);
        console.log('Last kline:', klines[klines.length - 1]);
      }

      return klines;
    } catch (error) {
      console.error('Error getting klines:', error);
      console.error('Klines request details:', {
        symbol,
        interval,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        limit
      });
      if (error instanceof Error) {
        throw new Error(`Failed to get klines: ${error.message}`);
      }
      throw new Error('Failed to get klines data');
    }
  }

  async getExchangeInfo(): Promise<any> {
    try {
      return await this.request('/v3/exchangeInfo');
    } catch (error) {
      console.error('Error getting exchange info:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get exchange info: ${error.message}`);
      }
      throw new Error('Failed to get exchange info');
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      return await this.request('/v3/account');
    } catch (error) {
      console.error('Error getting account info:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get account info: ${error.message}`);
      }
      throw new Error('Failed to get account info');
    }
  }
} 