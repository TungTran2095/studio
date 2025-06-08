import { OHLCV } from '@/modules/backtesting/types';

export class BinanceService {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string, isTestnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = isTestnet 
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';
  }

  async getKlines(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number = 1000
  ): Promise<OHLCV[]> {
    try {
      // Kiểm tra tham số
      if (!symbol) throw new Error('Symbol không được để trống');
      if (!interval) throw new Error('Interval không được để trống');
      if (!startTime) throw new Error('Start time không được để trống');
      if (!endTime) throw new Error('End time không được để trống');

      // Chuẩn hóa symbol
      const normalizedSymbol = symbol.toUpperCase();
      if (!normalizedSymbol.endsWith('USDT')) {
        throw new Error('Symbol phải kết thúc bằng USDT (ví dụ: BTCUSDT)');
      }

      console.log(`Đang lấy dữ liệu cho ${normalizedSymbol} từ ${new Date(startTime).toLocaleString()} đến ${new Date(endTime).toLocaleString()}`);

      const response = await fetch(
        `${this.baseUrl}/klines?symbol=${normalizedSymbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Binance API error: ${errorData.msg || response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Dữ liệu trả về không đúng định dạng');
      }

      const klines = data.map((kline: any[]) => {
        if (!Array.isArray(kline) || kline.length < 6) {
          throw new Error('Dữ liệu nến không đúng định dạng');
        }

        return {
          timestamp: kline[0],
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        };
      });

      console.log(`Đã lấy được ${klines.length} nến dữ liệu`);
      return klines;
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }

  async getHistoricalData(
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string
  ): Promise<OHLCV[]> {
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      const allKlines: OHLCV[] = [];
      let currentStartTime = startTime;

      console.log(`Bắt đầu lấy dữ liệu lịch sử cho ${symbol} từ ${startDate} đến ${endDate}`);

      while (currentStartTime < endTime) {
        const klines = await this.getKlines(
          symbol,
          interval,
          currentStartTime,
          endTime
        );
        
        allKlines.push(...klines);
        
        if (klines.length < 1000) {
          break;
        }
        
        currentStartTime = klines[klines.length - 1].timestamp + 1;
      }

      console.log(`Tổng cộng đã lấy được ${allKlines.length} nến dữ liệu`);
      return allKlines;
    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }
} 