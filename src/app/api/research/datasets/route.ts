import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import path from 'path';

// Check if we're in mock mode (when Supabase is not configured)
const MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any = null;
if (!MOCK_MODE) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

// Local datasets info
const getLocalDatasets = () => {
  const datasetsDir = join(process.cwd(), 'data', 'sample_datasets');
  const datasets = [];

  // Crypto Price Data
  const cryptoPath = join(datasetsDir, 'crypto_price_data.csv');
  if (existsSync(cryptoPath)) {
    datasets.push({
      id: 'crypto-price-data',
      name: 'Crypto Price Data',
      description: 'Historical cryptocurrency price data with technical indicators for LSTM training',
      file_path: cryptoPath,
      columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'returns', 'volatility', 'sma_24h', 'ema_12h', 'rsi', 'macd', 'hour', 'day_of_week', 'month'],
      rows: 17520,
      file_size: 2500000,
      file_type: 'csv',
      status: 'uploaded',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Stock Features Data
  const stockPath = join(datasetsDir, 'stock_features_data.csv');
  if (existsSync(stockPath)) {
    datasets.push({
      id: 'stock-features-data',
      name: 'Stock Features Data',
      description: 'Stock market features with financial indicators for ML training',
      file_path: stockPath,
      columns: ['pe_ratio', 'debt_to_equity', 'roe', 'revenue_growth', 'profit_margin', 'current_ratio', 'quick_ratio', 'inventory_turnover', 'asset_turnover', 'equity_multiplier', 'market_cap', 'future_return'],
      rows: 5000,
      file_size: 800000,
      file_type: 'csv',
      status: 'uploaded',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return datasets;
};

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Datasets API] Fetching available datasets...');

    if (MOCK_MODE) {
      console.log('🎭 [Datasets API] Using local datasets (Mock Mode)');
      const localDatasets = getLocalDatasets();
      
      return NextResponse.json({
        success: true,
        datasets: localDatasets,
        total: localDatasets.length,
        mode: 'local'
      });
    }

    // Real Supabase mode
    const { data: datasets, error } = await supabase
      .from('research_datasets')
      .select('*')
      .eq('status', 'uploaded')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Datasets API] Supabase error:', error);
      // Fallback to local datasets
      const localDatasets = getLocalDatasets();
      return NextResponse.json({
        success: true,
        datasets: localDatasets,
        total: localDatasets.length,
        mode: 'local_fallback',
        error: 'Supabase error, using local datasets'
      });
    }

    console.log(`✅ [Datasets API] Found ${datasets?.length || 0} datasets`);

    return NextResponse.json({
      success: true,
      datasets: datasets || [],
      total: datasets?.length || 0,
      mode: 'supabase'
    });

  } catch (error) {
    console.error('❌ [Datasets API] Error:', error);
    
    // Fallback to local datasets
    const localDatasets = getLocalDatasets();
    return NextResponse.json({
      success: true,
      datasets: localDatasets,
      total: localDatasets.length,
      mode: 'local_fallback',
      error: (error as Error).message
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, file_path, columns, rows, file_size, file_type } = body;

    if (MOCK_MODE) {
      // In mock mode, just return success
      return NextResponse.json({
        success: true,
        dataset: {
          id: `local-${Date.now()}`,
          name,
          description,
          file_path,
          columns,
          rows,
          file_size,
          file_type,
          status: 'uploaded',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        mode: 'local'
      });
    }

    // Real Supabase mode
    const { data: dataset, error } = await supabase
      .from('research_datasets')
      .insert({
        name,
        description,
        file_path,
        columns,
        rows,
        file_size,
        file_type,
        status: 'uploaded'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [Datasets API] Error creating dataset:', error);
      const errorMessage = error?.message || 'Unknown Supabase error. The table might not exist.';
      return NextResponse.json(
        { error: `Failed to create dataset: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      dataset,
      mode: 'supabase'
    });

  } catch (error) {
    console.error('❌ [Datasets API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 