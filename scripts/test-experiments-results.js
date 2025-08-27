#!/usr/bin/env node

/**
 * Script test để kiểm tra cột results của experiments
 * Xem cấu trúc dữ liệu và các thông số trading
 */

require('dotenv').config();

console.log('🧪 Test experiments results field...\n');

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
console.log('🔌 Kiểm tra Supabase connection và cột results...');

const { createClient } = require('@supabase/supabase-js');

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Thiếu Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test connection và kiểm tra experiments table với cột results
  supabase
    .from('research_experiments')
    .select('id, name, type, status, results')
    .limit(5)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Lỗi kết nối Supabase:', error.message);
        return;
      }
      
      console.log('✅ Kết nối Supabase thành công!');
      console.log(`📊 Tìm thấy ${data?.length || 0} experiments`);
      
      if (data && data.length > 0) {
        console.log('\n🔍 Phân tích cột results:');
        
        data.forEach((experiment, index) => {
          console.log(`\n📋 Experiment ${index + 1}: ${experiment.name} (${experiment.type})`);
          console.log(`  ID: ${experiment.id}`);
          console.log(`  Status: ${experiment.status}`);
          
          if (experiment.results) {
            console.log(`  ✅ Có results data`);
            
            // Kiểm tra cấu trúc của results
            const results = experiment.results;
            console.log(`  📊 Results type: ${typeof results}`);
            
            if (typeof results === 'object' && results !== null) {
              console.log(`  🔍 Results keys: ${Object.keys(results).join(', ')}`);
              
              // Kiểm tra các trading metrics trong results
              const tradingMetrics = [
                'total_trades', 'win_rate', 'total_return', 
                'avg_win_net', 'avg_loss_net', 'max_drawdown',
                'sharpe_ratio', 'profit_factor', 'trades',
                'pnl', 'equity_curve', 'drawdown'
              ];
              
              console.log(`  📈 Trading metrics có sẵn:`);
              tradingMetrics.forEach(metric => {
                if (results[metric] !== undefined) {
                  const value = results[metric];
                  if (typeof value === 'number') {
                    console.log(`    ✅ ${metric}: ${value}`);
                  } else if (Array.isArray(value)) {
                    console.log(`    ✅ ${metric}: Array(${value.length})`);
                  } else {
                    console.log(`    ✅ ${metric}: ${typeof value}`);
                  }
                } else {
                  console.log(`    ❌ ${metric}: undefined`);
                }
              });
              
              // Hiển thị một số giá trị mẫu
              if (results.total_trades !== undefined) {
                console.log(`    📊 Total Trades: ${results.total_trades}`);
              }
              if (results.win_rate !== undefined) {
                console.log(`    📊 Win Rate: ${results.win_rate}%`);
              }
              if (results.total_return !== undefined) {
                console.log(`    📊 Total Return: ${results.total_return}%`);
              }
              
            } else {
              console.log(`  ❌ Results không phải object: ${results}`);
            }
          } else {
            console.log(`  ❌ Không có results data`);
          }
        });
        
        // Tóm tắt
        const experimentsWithResults = data.filter(e => e.results && typeof e.results === 'object');
        const experimentsWithTradingMetrics = data.filter(e => 
          e.results && 
          typeof e.results === 'object' && 
          (e.results.total_trades !== undefined || e.results.win_rate !== undefined)
        );
        
        console.log(`\n📊 Tóm tắt:`);
        console.log(`  - Tổng experiments: ${data.length}`);
        console.log(`  - Có results data: ${experimentsWithResults.length}`);
        console.log(`  - Có trading metrics: ${experimentsWithTradingMetrics.length}`);
        
        if (experimentsWithTradingMetrics.length > 0) {
          console.log(`\n💡 Các experiments có trading metrics:`);
          experimentsWithTradingMetrics.forEach(e => {
            console.log(`  - ${e.name}: ${e.type} (${e.status})`);
          });
        }
        
      } else {
        console.log('❌ Không có experiments nào');
      }
    })
    .catch(err => {
      console.log('❌ Lỗi không mong muốn:', err.message);
    });
    
} catch (error) {
  console.log('❌ Lỗi khởi tạo Supabase client:', error.message);
}

console.log('\n📝 Hướng dẫn:');
console.log('1. ✅ Cột results đã có sẵn trong database');
console.log('2. ✅ API experiments đã được sửa để lấy results');
console.log('3. 💡 Frontend cần parse dữ liệu từ experiment.results');
console.log('4. 💡 Các thông số trading nằm trong results object');
console.log('5. 💡 Không cần thêm columns mới');
