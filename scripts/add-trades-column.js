const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTradesColumn() {
  try {
    console.log('🔧 Adding trades column to research_experiments table...');

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
      console.error('❌ Error adding trades column:', error);
      process.exit(1);
    }

    // Kiểm tra xem column đã được thêm chưa
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'research_experiments')
      .eq('column_name', 'trades');

    if (checkError) {
      console.error('❌ Error checking column:', checkError);
      process.exit(1);
    }

    if (columns && columns.length > 0) {
      console.log('✅ Trades column added successfully!');
      console.log('📊 Column exists:', columns[0].column_name);
    } else {
      console.log('⚠️ Column may not have been added properly');
    }

  } catch (error) {
    console.error('❌ Error in addTradesColumn:', error);
    process.exit(1);
  }
}

// Chạy script
addTradesColumn();

