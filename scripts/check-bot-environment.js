#!/usr/bin/env node

/**
 * Script kiểm tra environment variables và Supabase connection
 * Giúp debug vấn đề bot bị dừng ngay lập tức
 */

require('dotenv').config();

console.log('🔍 Kiểm tra environment variables và Supabase connection...\n');

// Kiểm tra environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

console.log('📋 Environment Variables:');
let allEnvVarsPresent = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.slice(0, 20)}...${value.slice(-10)}`);
  } else {
    console.log(`❌ ${envVar}: MISSING`);
    allEnvVarsPresent = false;
  }
});

console.log('');

if (!allEnvVarsPresent) {
  console.log('🚨 Vấn đề: Thiếu environment variables cần thiết!');
  console.log('Hãy tạo file .env.local với các biến sau:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

// Kiểm tra Supabase connection
console.log('🔌 Kiểm tra Supabase connection...');

const { createClient } = require('@supabase/supabase-js');

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test connection bằng cách query bảng trading_bots
  supabase
    .from('trading_bots')
    .select('id, name, status')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Lỗi kết nối Supabase:', error.message);
        console.log('💡 Kiểm tra:');
        console.log('  - URL Supabase có đúng không?');
        console.log('  - Anon key có hợp lệ không?');
        console.log('  - Database có bảng trading_bots không?');
      } else {
        console.log('✅ Kết nối Supabase thành công!');
        console.log('📊 Dữ liệu mẫu:', data);
      }
    })
    .catch(err => {
      console.log('❌ Lỗi không mong muốn:', err.message);
    });
    
} catch (error) {
  console.log('❌ Lỗi khởi tạo Supabase client:', error.message);
}

console.log('\n📝 Hướng dẫn khắc phục:');
console.log('1. Kiểm tra file .env.local có tồn tại không');
console.log('2. Kiểm tra environment variables có đúng không');
console.log('3. Kiểm tra Supabase project có hoạt động không');
console.log('4. Kiểm tra bảng trading_bots có tồn tại không');
console.log('5. Restart development server sau khi sửa .env');

