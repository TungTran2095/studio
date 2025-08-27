const { createClient } = require('@supabase/supabase-js');

// Sử dụng environment variables từ .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('💡 Hãy kiểm tra file .env.local có đầy đủ:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function increaseTimeout() {
  try {
    console.log('⏱️ Đang tăng statement timeout...\n');

    // 1. Kiểm tra timeout hiện tại
    console.log('1️⃣ Kiểm tra timeout hiện tại...');
    
    try {
      const { data: currentTimeout, error: timeoutError } = await supabase
        .rpc('exec_sql', { 
          sql: "SHOW statement_timeout;" 
        });
      
      if (timeoutError) {
        console.log('⚠️ Không thể kiểm tra timeout hiện tại (có thể do quyền):', timeoutError.message);
      } else {
        console.log('✅ Timeout hiện tại:', currentTimeout);
      }
    } catch (e) {
      console.log('⚠️ Không thể kiểm tra timeout hiện tại');
    }

    // 2. Tăng statement timeout
    console.log('\n2️⃣ Tăng statement timeout...');
    
    const increaseTimeoutSQL = `
      -- Tăng statement timeout từ 30s lên 300s (5 phút)
      ALTER DATABASE postgres SET statement_timeout = '300s';
      
      -- Tăng statement timeout cho session hiện tại
      SET statement_timeout = '300s';
    `;

    try {
      const { error: timeoutError } = await supabase.rpc('exec_sql', { sql: increaseTimeoutSQL });
      
      if (timeoutError) {
        console.log('❌ Không thể tăng timeout:', timeoutError.message);
        console.log('💡 Có thể do quyền hạn. Hãy thử cách thủ công:');
        console.log('   1. Vào Supabase Dashboard > SQL Editor');
        console.log('   2. Chạy lệnh: ALTER DATABASE postgres SET statement_timeout = \'300s\';');
        return;
      } else {
        console.log('✅ Statement timeout đã được tăng lên 300s (5 phút)');
      }
    } catch (e) {
      console.log('❌ Lỗi khi tăng timeout:', e.message);
      console.log('💡 Hãy thử cách thủ công trong Supabase Dashboard');
      return;
    }

    // 3. Xác nhận timeout mới
    console.log('\n3️⃣ Xác nhận timeout mới...');
    
    try {
      const { data: newTimeout, error: confirmError } = await supabase
        .rpc('exec_sql', { 
          sql: "SHOW statement_timeout;" 
        });
      
      if (confirmError) {
        console.log('⚠️ Không thể xác nhận timeout mới:', confirmError.message);
      } else {
        console.log('✅ Timeout mới:', newTimeout);
      }
    } catch (e) {
      console.log('⚠️ Không thể xác nhận timeout mới');
    }

    console.log('\n🎉 Hoàn thành!');
    console.log('💡 Statement timeout đã được tăng lên 300s');
    console.log('💡 Bây giờ các query phức tạp sẽ có thêm thời gian để hoàn thành');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.log('\n💡 Nếu gặp lỗi, hãy thử cách thủ công:');
    console.log('   1. Vào Supabase Dashboard > SQL Editor');
    console.log('   2. Chạy lệnh: ALTER DATABASE postgres SET statement_timeout = \'300s\';');
    console.log('   3. Kiểm tra: SHOW statement_timeout;');
  }
}

increaseTimeout();
