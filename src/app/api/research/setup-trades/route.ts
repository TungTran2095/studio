import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  // Check if Supabase client is available
  if (!createClient) {
    return NextResponse.json(
      {
        error: 'Supabase client not available',
        message: 'Please check your Supabase configuration',
        success: false
      },
      { status: 503 }
    );
  }

  try {
    console.log('🔧 Adding trades column to research_experiments table...');

    const supabase = createClient();

    // SQL để thêm column trades
    const sql = `
      -- Thêm column trades để lưu trữ dữ liệu trades
      ALTER TABLE research_experiments 
      ADD COLUMN IF NOT EXISTS trades JSONB DEFAULT NULL;

      -- Thêm comment để giải thích column
      COMMENT ON COLUMN research_experiments.trades IS 'Lưu trữ dữ liệu trades từ backtest (entry/exit, PnL, fees, etc.)';

      -- Tạo index cho column trades để tối ưu query
      CREATE INDEX IF NOT EXISTS idx_research_experiments_trades 
      ON research_experiments USING GIN (trades);
    `;

    // Thực thi SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error adding trades column:', error);
      return NextResponse.json(
        { error: 'Failed to add trades column', details: error.message },
        { status: 500 }
      );
    }

    // Kiểm tra xem column đã được thêm chưa
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'research_experiments')
      .eq('column_name', 'trades');

    if (checkError) {
      console.error('Error checking column:', checkError);
      return NextResponse.json(
        { error: 'Failed to verify column addition', details: checkError.message },
        { status: 500 }
      );
    }

    console.log('✅ Trades column added successfully!');

    return NextResponse.json({
      success: true,
      message: 'Trades column added to research_experiments table successfully! 📈',
      column_exists: columns && columns.length > 0
    });
  } catch (error) {
    console.error('Error in setup trades:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}