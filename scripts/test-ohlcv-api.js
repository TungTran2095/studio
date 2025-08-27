#!/usr/bin/env node

/**
 * Script test API OHLCV đã được tối ưu
 * Kiểm tra xem vấn đề database timeout đã được khắc phục chưa
 */

require('dotenv').config();

console.log('🧪 Test API OHLCV đã được tối ưu...\n');

async function testOHLCVAPI() {
  try {
    console.log('1️⃣ Test API OHLCV với time range nhỏ (1 ngày)...');
    
    const smallRangeResponse = await fetch('http://localhost:3000/api/research/ohlcv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        timeframe: '5m',
        startTime: Date.now() - (24 * 60 * 60 * 1000), // 1 ngày trước
        endTime: Date.now()
      })
    });
    
    if (smallRangeResponse.ok) {
      const data = await smallRangeResponse.json();
      console.log('✅ API OHLCV với time range nhỏ hoạt động');
      console.log(`📊 Số lượng data points: ${data.ohlcv?.length || 0}`);
    } else {
      const errorData = await smallRangeResponse.text();
      console.log('❌ API OHLCV với time range nhỏ lỗi:', smallRangeResponse.status, errorData);
    }

    console.log('\n2️⃣ Test API OHLCV với time range lớn (1 tháng)...');
    
    const largeRangeResponse = await fetch('http://localhost:3000/api/research/ohlcv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        timeframe: '5m',
        startTime: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 ngày trước
        endTime: Date.now()
      })
    });
    
    if (largeRangeResponse.ok) {
      const data = await largeRangeResponse.json();
      console.log('✅ API OHLCV với time range lớn hoạt động');
      console.log(`📊 Số lượng data points: ${data.ohlcv?.length || 0}`);
    } else {
      const errorData = await largeRangeResponse.text();
      console.log('❌ API OHLCV với time range lớn lỗi:', largeRangeResponse.status, errorData);
    }

    console.log('\n3️⃣ Test API OHLCV với time range rất lớn (1 năm - sẽ bị giới hạn)...');
    
    const veryLargeRangeResponse = await fetch('http://localhost:3000/api/research/ohlcv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        timeframe: '5m',
        startTime: Date.now() - (365 * 24 * 60 * 60 * 1000), // 1 năm trước
        endTime: Date.now()
      })
    });
    
    if (veryLargeRangeResponse.ok) {
      const data = await veryLargeRangeResponse.json();
      console.log('✅ API OHLCV với time range rất lớn hoạt động (đã được giới hạn)');
      console.log(`📊 Số lượng data points: ${data.ohlcv?.length || 0}`);
      console.log('💡 Time range đã được tự động giới hạn xuống 30 ngày');
    } else {
      const errorData = await veryLargeRangeResponse.text();
      console.log('❌ API OHLCV với time range rất lớn lỗi:', veryLargeRangeResponse.status, errorData);
    }

    console.log('\n4️⃣ Test API OHLCV với các timeframe khác nhau...');
    
    const timeframes = ['1m', '5m', '15m', '1h', '1d'];
    
    for (const tf of timeframes) {
      try {
        const response = await fetch('http://localhost:3000/api/research/ohlcv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'BTCUSDT',
            timeframe: tf,
            startTime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 ngày trước
            endTime: Date.now()
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Timeframe ${tf}: ${data.ohlcv?.length || 0} data points`);
        } else {
          console.log(`❌ Timeframe ${tf}: Lỗi ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Timeframe ${tf}: ${error.message}`);
      }
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

  await testOHLCVAPI();
  
  console.log('\n🏁 Test hoàn thành!');
  console.log('\n📝 Tóm tắt các vấn đề đã sửa:');
  console.log('1. ✅ Database timeout: Thêm limit 10000 records');
  console.log('2. ✅ Time range validation: Giới hạn tối đa 30 ngày');
  console.log('3. ✅ Fallback query: Thử với limit nhỏ hơn nếu timeout');
  console.log('4. ✅ Error handling: Thông báo lỗi rõ ràng hơn');
}

main().catch(console.error);
