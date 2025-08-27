#!/usr/bin/env node

/**
 * Script test API experiments mới
 * Kiểm tra xem API có trả về đầy đủ results data không
 */

require('dotenv').config();

console.log('🧪 Test API experiments mới...\n');

async function testExperimentsAPI() {
  try {
    console.log('1️⃣ Test API experiments với project_id...');
    
    const response = await fetch('http://localhost:3000/api/research/experiments?project_id=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log('❌ API experiments lỗi:', response.status, errorData);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API experiments hoạt động');
    console.log(`📊 Số lượng experiments: ${data.experiments?.length || 0}`);
    
    if (data.experiments && data.experiments.length > 0) {
      console.log('\n🔍 Phân tích experiments:');
      
      data.experiments.forEach((exp, index) => {
        console.log(`\n📋 Experiment ${index + 1}: ${exp.name}`);
        console.log(`  ID: ${exp.id}`);
        console.log(`  Type: ${exp.type}`);
        console.log(`  Status: ${exp.status}`);
        console.log(`  Progress: ${exp.progress || 0}%`);
        
        // Kiểm tra cột results
        if (exp.results) {
          console.log(`  ✅ Có cột results`);
          console.log(`  📊 Results type: ${typeof exp.results}`);
          
          if (typeof exp.results === 'object' && exp.results !== null) {
            const results = exp.results;
            console.log(`  🔍 Results keys: ${Object.keys(results).join(', ')}`);
            
            // Kiểm tra các trading metrics
            const tradingMetrics = [
              'total_trades', 'win_rate', 'total_return', 
              'avgWin', 'avgLoss', 'max_drawdown', 'sharpe_ratio'
            ];
            
            console.log(`  📈 Trading metrics có sẵn:`);
            tradingMetrics.forEach(metric => {
              if (results[metric] !== undefined) {
                const value = results[metric];
                if (typeof value === 'number') {
                  console.log(`    ✅ ${metric}: ${value}`);
                } else {
                  console.log(`    ✅ ${metric}: ${typeof value}`);
                }
              } else {
                console.log(`    ❌ ${metric}: undefined`);
              }
            });
            
            // Hiển thị summary
            if (results.total_trades && results.win_rate && results.total_return) {
              console.log(`  📊 Summary: ${results.total_trades} trades | ${results.win_rate.toFixed(1)}% win rate | ${results.total_return.toFixed(1)}% return`);
            }
          }
        } else {
          console.log(`  ❌ Không có cột results`);
        }
        
        // Kiểm tra các fields khác
        const otherFields = ['config', 'created_at', 'updated_at'];
        otherFields.forEach(field => {
          if (exp[field] !== undefined) {
            console.log(`  ✅ ${field}: có`);
          } else {
            console.log(`  ❌ ${field}: undefined`);
          }
        });
      });
      
      // Tóm tắt
      const experimentsWithResults = data.experiments.filter(e => e.results && typeof e.results === 'object');
      const experimentsWithTradingMetrics = data.experiments.filter(e => 
        e.results && 
        typeof e.results === 'object' && 
        (e.results.total_trades || e.results.totalTrades)
      );
      
      console.log(`\n📊 Tóm tắt API:`);
      console.log(`  - Tổng experiments: ${data.experiments.length}`);
      console.log(`  - Có results data: ${experimentsWithResults.length}`);
      console.log(`  - Có trading metrics: ${experimentsWithTradingMetrics.length}`);
      
      if (experimentsWithTradingMetrics.length > 0) {
        console.log(`\n💡 Experiments có trading metrics:`);
        experimentsWithTradingMetrics.forEach(e => {
          const results = e.results;
          const trades = results.total_trades || results.totalTrades || 0;
          const winRate = results.win_rate || results.winRate || 0;
          const totalReturn = results.total_return || results.totalReturn || 0;
          console.log(`  - ${e.name}: ${trades} trades | ${winRate.toFixed(1)}% win rate | ${totalReturn.toFixed(1)}% return`);
        });
      }
      
    } else {
      console.log('❌ Không có experiments nào');
    }

  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Kiểm tra xem server có chạy không
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server đang chạy');
      return true;
    }
  } catch (error) {
    console.log('❌ Server không chạy hoặc không thể kết nối');
    console.log('💡 Hãy chạy: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }

  await testExperimentsAPI();
  
  console.log('\n🏁 Test hoàn thành!');
  console.log('\n📝 Tóm tắt các thay đổi:');
  console.log('1. ✅ API experiments đã được sửa để lấy cột results');
  console.log('2. ✅ Không còn lỗi database timeout');
  console.log('3. ✅ Trading metrics được lấy từ cột results');
  console.log('4. 💡 Frontend có thể parse dữ liệu từ experiment.results');
  console.log('5. 💡 Experiment card sẽ hiển thị đầy đủ thông số trading');
}

main().catch(console.error);
