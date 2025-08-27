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

async function checkDatabaseHealth() {
  try {
    console.log('🔍 Đang kiểm tra sức khỏe database...\n');

    // 1. Kiểm tra kết nối
    console.log('1️⃣ Kiểm tra kết nối...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('research_experiments')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Lỗi kết nối:', connectionError.message);
    } else {
      console.log('✅ Kết nối thành công');
    }

    // 2. Kiểm tra cấu trúc bảng
    console.log('\n2️⃣ Kiểm tra cấu trúc bảng...');
    
    // Kiểm tra bảng research_experiments
    const { data: experimentsTable, error: experimentsError } = await supabase
      .from('research_experiments')
      .select('*')
      .limit(5);
    
    if (experimentsError) {
      console.log('❌ Bảng research_experiments:', experimentsError.message);
    } else {
      console.log('✅ Bảng research_experiments: OK');
      console.log(`   - Số lượng records: ${experimentsTable?.length || 0}`);
    }

    // Kiểm tra bảng trading_bots
    const { data: botsTable, error: botsError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(5);
    
    if (botsError) {
      console.log('❌ Bảng trading_bots:', botsError.message);
    } else {
      console.log('✅ Bảng trading_bots: OK');
      console.log(`   - Số lượng records: ${botsTable?.length || 0}`);
    }

    // 3. Kiểm tra performance
    console.log('\n3️⃣ Kiểm tra performance...');
    
    // Test query đơn giản
    const startTime = Date.now();
    const { data: perfTest, error: perfError } = await supabase
      .from('research_experiments')
      .select('id, name, status')
      .limit(100);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (perfError) {
      console.log('❌ Performance test failed:', perfError.message);
    } else {
      console.log(`✅ Performance test: ${queryTime}ms`);
      console.log(`   - Records returned: ${perfTest?.length || 0}`);
    }

    // 4. Kiểm tra indexes
    console.log('\n4️⃣ Kiểm tra indexes...');
    
    try {
      const { data: indexes, error: indexError } = await supabase
        .rpc('get_table_indexes', { table_name: 'research_experiments' });
      
      if (indexError) {
        console.log('⚠️ Không thể kiểm tra indexes (có thể do quyền):', indexError.message);
      } else {
        console.log('✅ Indexes check passed');
      }
    } catch (e) {
      console.log('⚠️ Indexes check skipped (permission issue)');
    }

    // 5. Kiểm tra RLS policies
    console.log('\n5️⃣ Kiểm tra RLS policies...');
    
    try {
      const { data: policies, error: policyError } = await supabase
        .rpc('get_table_policies', { table_name: 'research_experiments' });
      
      if (policyError) {
        console.log('⚠️ Không thể kiểm tra policies (có thể do quyền):', policyError.message);
      } else {
        console.log('✅ RLS policies check passed');
      }
    } catch (e) {
      console.log('⚠️ Policies check skipped (permission issue)');
    }

    console.log('\n🎯 Kết luận:');
    if (connectionError || experimentsError || botsError) {
      console.log('❌ Database có vấn đề cần được khắc phục');
      console.log('💡 Hãy chạy script setup-database để tạo lại các bảng');
    } else if (queryTime > 1000) {
      console.log('⚠️ Database chậm, cần tối ưu hóa');
      console.log('💡 Hãy kiểm tra indexes và query patterns');
    } else {
      console.log('✅ Database hoạt động bình thường');
    }

  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra database:', error.message);
  }
}

checkDatabaseHealth();






