import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST() {
  // Check if Supabase client is available
  if (!supabase) {
    console.log('⚠️ Supabase client not available - environment variables missing');
    return NextResponse.json(
      { 
        error: 'Database connection not available',
        details: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
        success: false
      },
      { status: 503 }
    );
  }

  try {
    console.log('🔧 Adding indicators column to research_experiments table...');

    // SQL để thêm column indicators
    const sql = `
      -- Thêm column indicators để lưu trữ dữ liệu indicator cho chart
      ALTER TABLE research_experiments 
      ADD COLUMN IF NOT EXISTS indicators JSONB DEFAULT NULL;

      -- Thêm comment để giải thích column
      COMMENT ON COLUMN research_experiments.indicators IS 'Lưu trữ dữ liệu indicator cho chart (RSI, MACD, MA, Bollinger Bands, etc.)';

      -- Tạo index cho column indicators để tối ưu query
      CREATE INDEX IF NOT EXISTS idx_research_experiments_indicators 
      ON research_experiments USING GIN (indicators);
    `;

    // Thực thi SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error adding indicators column:', error);
      return NextResponse.json(
        { error: 'Failed to add indicators column', details: error.message },
        { status: 500 }
      );
    }

    // Kiểm tra xem column đã được thêm chưa
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'research_experiments')
      .eq('column_name', 'indicators');

    if (checkError) {
      console.error('Error checking column:', checkError);
      return NextResponse.json(
        { error: 'Failed to verify column addition', details: checkError.message },
        { status: 500 }
      );
    }

    console.log('✅ Indicators column added successfully!');

    return NextResponse.json({
      success: true,
      message: 'Indicators column added to research_experiments table successfully! 📊',
      column_exists: columns && columns.length > 0
    });
  } catch (error) {
    console.error('Error in setup indicators:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}