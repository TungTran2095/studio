import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  OHLCData, 
  VolumeData, 
  AlternativeData, 
  MacroEconomicData,
  DataSource,
  DataCollectionJob,
  DataQualityMetrics 
} from '@/types/market-data';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Ưu tiên SERVICE_ROLE ở server-side, fallback sang ANON nếu có
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Service Role Key are required.');
  }

  cachedClient = createClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

export class MarketDataService {
  // OHLC Data Management
  async saveOHLCData(data: OHLCData[]): Promise<{ success: boolean; error?: string }> {
    if (!data || data.length === 0) {
      return { success: true }; // Nothing to save
    }

    try {
      // Lấy symbol từ bản ghi đầu tiên để xác định tên bảng
      const symbol = data[0].symbol;
      if (!symbol) {
        return { success: false, error: 'Symbol not found in data' };
      }
      // Xây dựng tên bảng động, ví dụ: 'OHLCV_BTCUSDT_1m'
      const tableName = `OHLCV_${symbol.replace('/', '')}_1m`;

      // Chuyển đổi dữ liệu để chèn
      const recordsToInsert = data.map(d => ({
        symbol: d.symbol,
        timestamp: d.timestamp.toISOString(),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
        interval: d.interval
      }));

      // Upsert dữ liệu
      const client = getSupabaseClient();
      const { error } = await client
        .from(tableName)
        .upsert(recordsToInsert, { onConflict: 'timestamp,symbol,interval' });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getOHLCData(
    symbol: string, 
    interval: string, 
    from?: Date, 
    to?: Date
  ): Promise<OHLCData[]> {
    try {
      const client = getSupabaseClient();
      let query = client
        .from('ohlc_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('interval', interval)
        .order('timestamp', { ascending: true });

      if (from) {
        query = query.gte('timestamp', from.toISOString());
      }
      if (to) {
        query = query.lte('timestamp', to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(d => ({
        ...d,
        timestamp: new Date(d.timestamp)
      })) || [];
    } catch (error) {
      console.error('Error fetching OHLC data:', error);
      return [];
    }
  }

  // Data Sources Management
  async saveDataSource(source: DataSource): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('data_sources')
        .upsert({
          id: source.id,
          name: source.name,
          type: source.type,
          endpoint: source.endpoint,
          is_active: source.isActive,
          last_sync: source.lastSync?.toISOString(),
          config: source.config,
          status: source.status
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getDataSources(): Promise<DataSource[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('data_sources')
        .select('*')
        .order('name');

      if (error) throw error;

      return data?.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        endpoint: d.endpoint,
        isActive: d.is_active,
        lastSync: d.last_sync ? new Date(d.last_sync) : undefined,
        config: d.config || { apiKey: '' },
        status: d.status || 'unknown',
        lastConnected: undefined,
        responseTime: undefined,
        isSecure: undefined,
      } as DataSource)) || [];
    } catch (error) {
      console.error('Error fetching data sources:', error);
      return [];
    }
  }

  // Data Collection Jobs Management
  async saveDataCollectionJob(job: DataCollectionJob): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('data_collection_jobs')
        .upsert({
          id: job.id,
          name: job.name,
          description: job.description,
          data_type: job.dataType,
          source: job.source,
          symbols: job.symbols,
          interval: job.interval,
          is_active: job.isActive,
          last_run: job.lastRun?.toISOString(),
          next_run: job.nextRun?.toISOString(),
          config: job.config,
          status: job.status
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getDataCollectionJobs(): Promise<DataCollectionJob[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('data_collection_jobs')
        .select('*')
        .order('name');

      if (error) throw error;

      return data?.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        dataType: d.data_type,
        source: d.source,
        symbols: d.symbols || [],
        interval: d.interval,
        isActive: d.is_active,
        lastRun: d.last_run ? new Date(d.last_run) : undefined,
        nextRun: d.next_run ? new Date(d.next_run) : undefined,
        config: d.config || {},
        status: d.status
      })) || [];
    } catch (error) {
      console.error('Error fetching data collection jobs:', error);
      return [];
    }
  }

  // Alternative Data Management
  async saveAlternativeData(data: AlternativeData[]): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('alternative_data')
        .upsert(data.map(d => ({
          id: d.id,
          type: d.type,
          symbol: d.symbol,
          timestamp: d.timestamp.toISOString(),
          value: d.value,
          metadata: d.metadata,
          source: d.source
        })));

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Macro Economic Data Management
  async saveMacroEconomicData(data: MacroEconomicData[]): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('macro_economic_data')
        .upsert(data.map(d => ({
          id: d.id,
          indicator: d.indicator,
          country: d.country,
          timestamp: d.timestamp.toISOString(),
          value: d.value,
          unit: d.unit,
          source: d.source
        })));

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Data Quality Metrics
  async saveDataQualityMetrics(metrics: DataQualityMetrics): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('data_quality_metrics')
        .insert({
          symbol: metrics.symbol,
          data_type: metrics.dataType,
          timestamp: metrics.timestamp.toISOString(),
          completeness: metrics.completeness,
          accuracy: metrics.accuracy,
          consistency: metrics.consistency,
          timeliness: metrics.timeliness,
          anomalies: metrics.anomalies,
          missing_points: metrics.missingPoints
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Real-time subscriptions
  subscribeToDataUpdates(callback: (payload: any) => void) {
    const client = getSupabaseClient();
    return client
      .channel('market-data-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ohlc_data' }, 
        callback
      )
      .subscribe();
  }
} 