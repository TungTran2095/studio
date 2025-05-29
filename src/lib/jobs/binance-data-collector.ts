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
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export class BinanceDataCollector {
  private baseUrl = 'https://api.binance.com/api/v3';

  /**
   * Lấy dữ liệu OHLCV từ Binance API
   */
  async fetchKlineData(
    symbol: string, 
    interval: string = '1m', 
    limit: number = 100,
    startTime?: Date,
    endTime?: Date
  ): Promise<BinanceKlineData[]> {
    try {
      let url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      // Add time filters if provided
      if (startTime) {
        url += `&startTime=${startTime.getTime()}`;
      }
      if (endTime) {
        url += `&endTime=${endTime.getTime()}`;
      }
      
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
        trades: item[8],
        takerBuyBaseAssetVolume: item[9],
        takerBuyQuoteAssetVolume: item[10]
      }));

      console.log(`✅ [BinanceCollector] Successfully fetched ${klineData.length} records for ${symbol}`);
      if (startTime || endTime) {
        console.log(`📅 [BinanceCollector] Time range: ${startTime?.toISOString()} to ${endTime?.toISOString()}`);
      }
      return klineData;

    } catch (error) {
      console.error(`❌ [BinanceCollector] Error fetching ${symbol} data:`, error);
      throw error;
    }
  }

  /**
   * Lưu dữ liệu vào Supabase
   */
  async saveToSupabase(data: BinanceKlineData[], targetOptions?: {
    targetDatabase?: string;
    targetTable?: string;
  }): Promise<boolean> {
    if (!supabase) {
      console.error('❌ [BinanceCollector] Supabase client not initialized');
      return false;
    }

    try {
      // Determine table name based on symbol and interval
      const tableName = targetOptions?.targetTable || `OHLCV_${data[0].symbol}_${data[0].interval}`.replace('USDT', '_USDT');
      
      // Check if table is specific to a symbol (contains symbol in name)
      const isSymbolSpecificTable = /OHLCV_[A-Z]+_USDT_\d+[mhd]/.test(tableName);
      
      console.log(`🔍 [BinanceCollector] Processing ${data.length} records for table: ${tableName}`);
      console.log(`📊 [BinanceCollector] Table type: ${isSymbolSpecificTable ? 'Symbol-specific' : 'Generic'}`);
      
      // Transform data to match Supabase table structure
      const supabaseData = data.map(item => {
        const baseData = {
          open_time: new Date(item.openTime).toISOString(),
          close_time: new Date(item.closeTime).toISOString(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
          quote_asset_volume: parseFloat(item.quoteAssetVolume),
          number_of_trades: item.trades,
          taker_buy_base_asset_volume: parseFloat(item.takerBuyBaseAssetVolume),
          taker_buy_quote_asset_volume: parseFloat(item.takerBuyQuoteAssetVolume),
          inserted_at: new Date().toISOString()
        };

        // Only add symbol column if table is NOT symbol-specific
        if (!isSymbolSpecificTable) {
          return {
            symbol: item.symbol,
            ...baseData
          };
        }

        return baseData;
      });
      
      console.log(`💾 [BinanceCollector] Saving ${supabaseData.length} records to table: ${tableName}`);
      console.log(`📊 [BinanceCollector] Sample record structure:`, JSON.stringify(supabaseData[0], null, 2));

      const { data: insertedData, error } = await supabase
        .from(tableName)
        .upsert(supabaseData, { 
          onConflict: 'open_time',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('❌ [BinanceCollector] Supabase insert error:', error);
        console.error('❌ [BinanceCollector] Failed table name:', tableName);
        console.error('❌ [BinanceCollector] Sample data causing error:', JSON.stringify(supabaseData[0], null, 2));
        return false;
      }

      console.log(`✅ [BinanceCollector] Successfully saved ${supabaseData.length} records to ${tableName}`);
      console.log(`📊 [BinanceCollector] Insert completed successfully`);
      return true;

    } catch (error) {
      console.error('❌ [BinanceCollector] Error saving to Supabase:', error);
      return false;
    }
  }

  /**
   * Chạy job thu thập dữ liệu complete
   */
  async runDataCollection(
    symbol: string, 
    interval: string = '1m', 
    limit: number = 100,
    startTime?: Date,
    endTime?: Date,
    targetOptions?: {
      targetDatabase?: string;
      targetTable?: string;
    }
  ): Promise<{
    success: boolean;
    recordsCollected: number;
    error?: string;
  }> {
    try {
      console.log(`🚀 [BinanceCollector] Starting data collection for ${symbol} (${interval})`);
      if (startTime || endTime) {
        console.log(`📅 [BinanceCollector] Collection period: ${startTime?.toISOString()} to ${endTime?.toISOString()}`);
      }
      if (targetOptions?.targetDatabase && targetOptions?.targetTable) {
        console.log(`🎯 [BinanceCollector] Target: ${targetOptions.targetDatabase}/${targetOptions.targetTable}`);
      }

      // 1. Fetch data from Binance
      const klineData = await this.fetchKlineData(symbol, interval, limit, startTime, endTime);

      if (klineData.length === 0) {
        return {
          success: false,
          recordsCollected: 0,
          error: 'No data received from Binance API'
        };
      }

      // 2. Save to Supabase with target options
      const saveSuccess = await this.saveToSupabase(klineData, targetOptions);

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