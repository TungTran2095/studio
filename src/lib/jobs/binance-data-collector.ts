import { supabase } from '@/lib/supabase-client';

export interface BinanceKlineData {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  quoteAssetVolume: string;
  trades: number;
}

export class BinanceDataCollector {
  private baseUrl = 'https://api.binance.com/api/v3';

  /**
   * Lấy dữ liệu OHLCV từ Binance API
   */
  async fetchKlineData(symbol: string, interval: string = '1m', limit: number = 100): Promise<BinanceKlineData[]> {
    try {
      const url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      console.log(`🔍 [BinanceCollector] Fetching data from: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      
      // Transform raw data to our format
      const klineData: BinanceKlineData[] = rawData.map((item: any[]) => ({
        symbol,
        interval,
        openTime: item[0],
        closeTime: item[6],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5],
        quoteAssetVolume: item[7],
        trades: item[8]
      }));

      console.log(`✅ [BinanceCollector] Successfully fetched ${klineData.length} records for ${symbol}`);
      return klineData;

    } catch (error) {
      console.error(`❌ [BinanceCollector] Error fetching ${symbol} data:`, error);
      throw error;
    }
  }

  /**
   * Lưu dữ liệu vào Supabase
   */
  async saveToSupabase(data: BinanceKlineData[]): Promise<boolean> {
    if (!supabase) {
      console.error('❌ [BinanceCollector] Supabase client not initialized');
      return false;
    }

    try {
      // Transform data to match Supabase table structure
      const supabaseData = data.map(item => ({
        symbol: item.symbol,
        open_time: new Date(item.openTime).toISOString(),
        close_time: new Date(item.closeTime).toISOString(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume),
        quote_asset_volume: parseFloat(item.quoteAssetVolume),
        number_of_trades: item.trades,
        inserted_at: new Date().toISOString()
      }));

      // Determine table name based on symbol and interval
      const tableName = `OHLCV_${data[0].symbol}_${data[0].interval}`.replace('USDT', '_USDT');
      
      console.log(`💾 [BinanceCollector] Saving ${supabaseData.length} records to table: ${tableName}`);

      const { data: insertedData, error } = await supabase
        .from(tableName)
        .upsert(supabaseData, { 
          onConflict: 'open_time',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('❌ [BinanceCollector] Supabase insert error:', error);
        return false;
      }

      console.log(`✅ [BinanceCollector] Successfully saved ${supabaseData.length} records to ${tableName}`);
      return true;

    } catch (error) {
      console.error('❌ [BinanceCollector] Error saving to Supabase:', error);
      return false;
    }
  }

  /**
   * Chạy job thu thập dữ liệu complete
   */
  async runDataCollection(symbol: string, interval: string = '1m', limit: number = 100): Promise<{
    success: boolean;
    recordsCollected: number;
    error?: string;
  }> {
    try {
      console.log(`🚀 [BinanceCollector] Starting data collection for ${symbol} (${interval})`);

      // 1. Fetch data from Binance
      const klineData = await this.fetchKlineData(symbol, interval, limit);

      if (klineData.length === 0) {
        return {
          success: false,
          recordsCollected: 0,
          error: 'No data received from Binance API'
        };
      }

      // 2. Save to Supabase
      const saveSuccess = await this.saveToSupabase(klineData);

      if (!saveSuccess) {
        return {
          success: false,
          recordsCollected: klineData.length,
          error: 'Failed to save data to Supabase'
        };
      }

      console.log(`🎉 [BinanceCollector] Data collection completed successfully for ${symbol}`);
      
      return {
        success: true,
        recordsCollected: klineData.length
      };

    } catch (error) {
      console.error(`❌ [BinanceCollector] Data collection failed for ${symbol}:`, error);
      return {
        success: false,
        recordsCollected: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Kiểm tra kết nối Binance API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const binanceDataCollector = new BinanceDataCollector(); 