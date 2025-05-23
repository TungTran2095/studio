import { OHLCData, VolumeData } from '@/types/market-data';

export interface BinanceKlineData {
  symbol: string;
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export class BinanceDataCollector {
  private baseUrl = 'https://api.binance.com/api/v3';
  
  constructor() {}

  async getKlineData(
    symbol: string,
    interval: string,
    limit: number = 500,
    startTime?: number,
    endTime?: number
  ): Promise<OHLCData[]> {
    try {
      let url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      if (startTime) url += `&startTime=${startTime}`;
      if (endTime) url += `&endTime=${endTime}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.map((kline: any[]) => ({
        symbol,
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        interval
      }));
    } catch (error) {
      console.error('Error fetching Binance kline data:', error);
      throw error;
    }
  }

  async get24hrTicker(symbol?: string): Promise<any[]> {
    try {
      let url = `${this.baseUrl}/ticker/24hr`;
      if (symbol) url += `?symbol=${symbol}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Binance 24hr ticker:', error);
      throw error;
    }
  }

  async getSymbolInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/exchangeInfo`);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.symbols;
    } catch (error) {
      console.error('Error fetching Binance symbol info:', error);
      throw error;
    }
  }

  async getRecentTrades(symbol: string, limit: number = 500): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/trades?symbol=${symbol}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Binance recent trades:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time data
  createWebSocketConnection(
    symbol: string,
    intervals: string[],
    onMessage: (data: any) => void,
    onError?: (error: any) => void
  ): WebSocket {
    const streams = intervals.map(interval => `${symbol.toLowerCase()}@kline_${interval}`);
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Binance WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
      if (onError) onError(error);
    };

    ws.onclose = () => {
      console.log('Binance WebSocket disconnected');
    };

    return ws;
  }

  // Data cleaning and validation
  validateOHLCData(data: OHLCData[]): { valid: OHLCData[]; invalid: any[] } {
    const valid: OHLCData[] = [];
    const invalid: any[] = [];

    data.forEach(item => {
      // Basic validation
      if (
        item.open > 0 &&
        item.high > 0 &&
        item.low > 0 &&
        item.close > 0 &&
        item.volume >= 0 &&
        item.high >= item.low &&
        item.high >= Math.max(item.open, item.close) &&
        item.low <= Math.min(item.open, item.close)
      ) {
        valid.push(item);
      } else {
        invalid.push(item);
      }
    });

    return { valid, invalid };
  }

  // Data normalization
  normalizeData(data: OHLCData[]): OHLCData[] {
    return data.map(item => ({
      ...item,
      // Round to appropriate decimal places
      open: Math.round(item.open * 100000000) / 100000000,
      high: Math.round(item.high * 100000000) / 100000000,
      low: Math.round(item.low * 100000000) / 100000000,
      close: Math.round(item.close * 100000000) / 100000000,
      volume: Math.round(item.volume * 100000000) / 100000000,
    }));
  }

  // Detect anomalies in data
  detectAnomalies(data: OHLCData[]): { anomalies: OHLCData[]; clean: OHLCData[] } {
    if (data.length < 10) return { anomalies: [], clean: data };

    const anomalies: OHLCData[] = [];
    const clean: OHLCData[] = [];

    for (let i = 1; i < data.length - 1; i++) {
      const current = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];

      // Check for price spike anomalies (more than 50% change)
      const priceChange = Math.abs(current.close - prev.close) / prev.close;
      const nextPriceChange = Math.abs(next.close - current.close) / current.close;

      if (priceChange > 0.5 && nextPriceChange > 0.3) {
        anomalies.push(current);
      } else {
        clean.push(current);
      }
    }

    // Add first and last items if not anomalous
    if (data.length > 0) {
      clean.unshift(data[0]);
      clean.push(data[data.length - 1]);
    }

    return { anomalies, clean };
  }
} 