const { createClient } = require('@supabase/supabase-js');

// Sử dụng environment variables từ .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function optimizeDatabase() {
  try {
    console.log('🔧 Đang tối ưu hóa database...\n');

    // 1. Tạo lại các bảng với cấu trúc tối ưu
    console.log('1️⃣ Tạo lại bảng research_experiments...');
    
    const createExperimentsTable = `
      -- Xóa bảng cũ nếu tồn tại
      DROP TABLE IF EXISTS research_experiments CASCADE;
      
      -- Tạo bảng mới với cấu trúc tối ưu
      CREATE TABLE research_experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('backtest', 'hypothesis_test', 'optimization', 'monte_carlo')),
        description TEXT,
        config JSONB DEFAULT '{}',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        results JSONB,
        error TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Tạo indexes tối ưu
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_experiments_project_id ON research_experiments(project_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_experiments_status ON research_experiments(status);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_experiments_type ON research_experiments(type);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_experiments_created_at ON research_experiments(created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_experiments_project_status ON research_experiments(project_id, status);
      
      -- Enable RLS
      ALTER TABLE research_experiments ENABLE ROW LEVEL SECURITY;
      
      -- Tạo policy
      DROP POLICY IF EXISTS "Allow all operations on research_experiments" ON research_experiments;
      CREATE POLICY "Allow all operations on research_experiments" 
      ON research_experiments FOR ALL USING (true) WITH CHECK (true);
      
      -- Tạo trigger cho auto-update
      CREATE OR REPLACE FUNCTION update_research_experiments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_research_experiments_updated_at ON research_experiments;
      CREATE TRIGGER update_research_experiments_updated_at 
      BEFORE UPDATE ON research_experiments 
      FOR EACH ROW EXECUTE FUNCTION update_research_experiments_updated_at();
    `;

    const { error: experimentsError } = await supabase.rpc('exec_sql', { sql: createExperimentsTable });
    
    if (experimentsError) {
      console.log('❌ Lỗi khi tạo bảng research_experiments:', experimentsError.message);
      return;
    } else {
      console.log('✅ Bảng research_experiments đã được tạo thành công');
    }

    // 2. Tạo lại bảng trading_bots
    console.log('\n2️⃣ Tạo lại bảng trading_bots...');
    
    const createBotsTable = `
      -- Xóa bảng cũ nếu tồn tại
      DROP TABLE IF EXISTS trading_bots CASCADE;
      
      -- Tạo bảng mới với cấu trúc tối ưu
      CREATE TABLE trading_bots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID,
        name TEXT NOT NULL,
        description TEXT,
        config JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'stopped', 'error')),
        total_trades INTEGER NOT NULL DEFAULT 0,
        total_profit DECIMAL(20,8) NOT NULL DEFAULT 0,
        win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        last_run_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      -- Tạo indexes tối ưu
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trading_bots_project_id ON trading_bots(project_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trading_bots_status ON trading_bots(status);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trading_bots_created_at ON trading_bots(created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trading_bots_project_status ON trading_bots(project_id, status);
      
      -- Enable RLS
      ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
      
      -- Tạo policy
      DROP POLICY IF EXISTS "Allow all operations on trading_bots" ON trading_bots;
      CREATE POLICY "Allow all operations on trading_bots" 
      ON trading_bots FOR ALL USING (true) WITH CHECK (true);
      
      -- Tạo trigger cho auto-update
      CREATE OR REPLACE FUNCTION update_trading_bots_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_trading_bots_updated_at ON trading_bots;
      CREATE TRIGGER update_trading_bots_updated_at 
      BEFORE UPDATE ON trading_bots 
      FOR EACH ROW EXECUTE FUNCTION update_trading_bots_updated_at();
    `;

    const { error: botsError } = await supabase.rpc('exec_sql', { sql: createBotsTable });
    
    if (botsError) {
      console.log('❌ Lỗi khi tạo bảng trading_bots:', botsError.message);
      return;
    } else {
      console.log('✅ Bảng trading_bots đã được tạo thành công');
    }

    // 3. Tạo bảng research_projects nếu chưa có
    console.log('\n3️⃣ Kiểm tra bảng research_projects...');
    
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS research_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        objective TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Tạo indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_projects_status ON research_projects(status);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_projects_created_at ON research_projects(created_at DESC);
      
      -- Enable RLS
      ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
      
      -- Tạo policy
      DROP POLICY IF EXISTS "Allow all operations on research_projects" ON research_projects;
      CREATE POLICY "Allow all operations on research_projects" 
      ON research_projects FOR ALL USING (true) WITH CHECK (true);
    `;

    const { error: projectsError } = await supabase.rpc('exec_sql', { sql: createProjectsTable });
    
    if (projectsError) {
      console.log('❌ Lỗi khi tạo bảng research_projects:', projectsError.message);
      return;
    } else {
      console.log('✅ Bảng research_projects đã được kiểm tra/tạo');
    }

    // 4. Tối ưu hóa database settings
    console.log('\n4️⃣ Tối ưu hóa database settings...');
    
    const optimizeSettings = `
      -- Tăng statement timeout
      ALTER DATABASE postgres SET statement_timeout = '300s';
      
      -- Tối ưu hóa work_mem cho các query phức tạp
      ALTER DATABASE postgres SET work_mem = '256MB';
      
      -- Tối ưu hóa shared_buffers
      ALTER DATABASE postgres SET shared_buffers = '256MB';
      
      -- Tối ưu hóa effective_cache_size
      ALTER DATABASE postabase SET effective_cache_size = '1GB';
      
      -- Tối ưu hóa maintenance_work_mem
      ALTER DATABASE postabase SET maintenance_work_mem = '128MB';
    `;

    try {
      const { error: optimizeError } = await supabase.rpc('exec_sql', { sql: optimizeSettings });
      if (optimizeError) {
        console.log('⚠️ Không thể tối ưu hóa database settings (có thể do quyền):', optimizeError.message);
      } else {
        console.log('✅ Database settings đã được tối ưu hóa');
      }
    } catch (e) {
      console.log('⚠️ Database settings optimization skipped (permission issue)');
    }

    // 5. Tạo sample data để test
    console.log('\n5️⃣ Tạo sample data...');
    
    const insertSampleData = `
      -- Tạo project mẫu
      INSERT INTO research_projects (id, name, description, objective, status, progress) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'Trading Bot Research', 'Nghiên cứu và phát triển trading bot', 'Tạo ra hệ thống giao dịch tự động hiệu quả', 'active', 25)
      ON CONFLICT (id) DO NOTHING;
      
      -- Tạo backtest mẫu
      INSERT INTO research_experiments (project_id, name, type, description, config, status, progress, results) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'Backtest Chiến lược Momentum BTC/USDT', 'backtest', 'Backtest mẫu cho chiến lược momentum trading', 
       '{"strategy": {"type": "momentum", "lookback_period": 20, "threshold": 0.02}, "backtest": {"start_date": "2023-01-01", "end_date": "2023-12-31", "initial_capital": 10000, "symbol": "BTCUSDT", "timeframe": "1h"}}',
       'completed', 100,
       '{"total_return": 15.67, "sharpe_ratio": 1.23, "max_drawdown": -8.45, "win_rate": 58.3, "total_trades": 127, "avg_win": 2.1, "avg_loss": -1.8}')
      ON CONFLICT DO NOTHING;
    `;

    const { error: sampleDataError } = await supabase.rpc('exec_sql', { sql: insertSampleData });
    
    if (sampleDataError) {
      console.log('⚠️ Không thể tạo sample data:', sampleDataError.message);
    } else {
      console.log('✅ Sample data đã được tạo');
    }

    console.log('\n🎉 Database optimization completed!');
    console.log('💡 Bây giờ hãy chạy script check-database-health.js để kiểm tra kết quả');

  } catch (error) {
    console.error('❌ Lỗi khi tối ưu hóa database:', error.message);
  }
}

optimizeDatabase();






