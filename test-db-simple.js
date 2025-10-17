// Simple database connection test
console.log('🔍 Testing environment variables...\n');

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ File .env không tồn tại!');
  console.log('\n📋 Cách tạo file .env:');
  console.log('1. Tạo file .env trong thư mục gốc');
  console.log('2. Thêm nội dung:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
  console.log('   SUPABASE_SERVICE_KEY=your_service_key');
  console.log('   OPENAI_API_KEY=your_openai_key');
  console.log('\n📖 Xem hướng dẫn chi tiết: docs/environment-setup.md');
  process.exit(1);
}

console.log('✅ File .env tồn tại');

// Load environment variables
require('dotenv').config();

// Check environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_KEY',
  'OPENAI_API_KEY'
];

console.log('\n🔍 Kiểm tra environment variables:');
let allVarsPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== `your_${varName.toLowerCase()}_here`) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: Missing or placeholder`);
    allVarsPresent = false;
  }
});

if (!allVarsPresent) {
  console.log('\n❌ Một số environment variables chưa được cấu hình!');
  console.log('📖 Xem hướng dẫn: docs/environment-setup.md');
  process.exit(1);
}

console.log('\n✅ Tất cả environment variables đã được cấu hình!');
console.log('🚀 Bây giờ có thể chạy: npm run dev');


