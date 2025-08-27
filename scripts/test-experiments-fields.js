#!/usr/bin/env node

/**
 * Script test đơn giản để kiểm tra experiments fields
 * Không cần server chạy, chỉ kiểm tra logic
 */

require('dotenv').config();

console.log('🧪 Test experiments fields...\n');

// Kiểm tra environment variables
console.log('📋 Environment Variables:');
const envVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.slice(0, 20)}...${value.slice(-10)}`);
  } else {
    console.log(`❌ ${key}: MISSING`);
  }
});

console.log('');

// Kiểm tra Supabase connection
console.log('🔌 Kiểm tra Supabase connection...');

const { createClient } = require('@supabase/supabase-js');

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Thiếu Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test connection và kiểm tra experiments table
  supabase
    .from('research_experiments')
    .select('id, name, type, status, total_trades, win_rate, total_return, avg_win_net, avg_loss_net, max_drawdown, sharpe_ratio, profit_factor')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Lỗi kết nối Supabase:', error.message);
        
        // Kiểm tra xem có phải lỗi column không tồn tại không
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          console.log('💡 Cần setup trading metrics columns');
          console.log('💡 Chạy: node scripts/setup-trading-metrics.js');
        }
      } else {
        console.log('✅ Kết nối Supabase thành công!');
        
        if (data && data.length > 0) {
          const experiment = data[0];
          console.log('📊 Experiment mẫu:', {
            id: experiment.id,
            name: experiment.name,
            type: experiment.type,
            status: experiment.status
          });
          
          // Kiểm tra các trading metrics fields
          console.log('\n🔍 Kiểm tra trading metrics fields:');
          const tradingFields = [
            'total_trades', 'win_rate', 'total_return', 
            'avg_win_net', 'avg_loss_net', 'max_drawdown',
            'sharpe_ratio', 'profit_factor'
          ];
          
          tradingFields.forEach(field => {
            const value = experiment[field];
            if (value !== undefined && value !== null) {
              console.log(`  ✅ ${field}: ${value}`);
            } else {
              console.log(`  ❌ ${field}: ${value}`);
            }
          });
          
          // Đếm số fields có sẵn
          const availableFields = tradingFields.filter(field => 
            experiment[field] !== undefined && experiment[field] !== null
          );
          
          console.log(`\n📊 Tổng kết: ${availableFields.length}/${tradingFields.length} fields có sẵn`);
          
          if (availableFields.length < tradingFields.length) {
            console.log('💡 Cần setup thêm trading metrics columns');
            console.log('💡 Chạy: node scripts/setup-trading-metrics.js');
          }
        }
      }
    })
    .catch(err => {
      console.log('❌ Lỗi không mong muốn:', err.message);
    });
    
} catch (error) {
  console.log('❌ Lỗi khởi tạo Supabase client:', error.message);
}

console.log('\n📝 Hướng dẫn:');
console.log('1. Kiểm tra Supabase connection');
console.log('2. Kiểm tra experiments table có đầy đủ fields không');
console.log('3. Nếu thiếu fields, chạy setup script');
console.log('4. Restart server để áp dụng thay đổi');
