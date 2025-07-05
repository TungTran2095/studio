const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function checkRSI() {
  try {
    console.log('🔍 Checking RSI for bot Real23...');
    
    const botId = '7cb1750a-3357-4c74-aa3c-b92abf23764e';
    const url = `http://localhost:9002/api/trading/bot/indicator-history?botId=${botId}`;
    const result = await makeRequest(url);
    
    console.log('\n📊 RSI Info:');
    console.log('Indicator Name:', result.indicatorName);
    console.log('Trigger Value (Overbought):', result.triggerValue);
    console.log('Oversold Value:', result.oversold);
    
    if (result.history && result.history.length > 0) {
      const latest = result.history[result.history.length - 1];
      console.log('\n📈 Latest RSI Value:', latest.value);
      console.log('Time:', new Date(Number(latest.time)).toLocaleString('vi-VN'));
      
      console.log('\n🎯 Trigger Analysis:');
      console.log('Current RSI:', latest.value);
      console.log('Oversold threshold:', result.oversold);
      console.log('Overbought threshold:', result.triggerValue);
      
      if (latest.value <= result.oversold) {
        console.log('✅ RSI đã đạt điều kiện OVERSOLD - nên MUA');
      } else if (latest.value >= result.triggerValue) {
        console.log('✅ RSI đã đạt điều kiện OVERBOUGHT - nên BÁN');
      } else {
        console.log('⏳ RSI đang trong khoảng trung tính, chưa trigger');
        console.log(`   Cần RSI ≤ ${result.oversold} để MUA hoặc RSI ≥ ${result.triggerValue} để BÁN`);
      }
      
      // Hiển thị 10 giá trị RSI gần nhất
      console.log('\n📊 Recent RSI Values:');
      result.history.slice(-10).forEach((item, index) => {
        const time = new Date(Number(item.time)).toLocaleTimeString('vi-VN');
        console.log(`  ${index + 1}. ${item.value} at ${time}`);
      });
    } else {
      console.log('❌ Không có dữ liệu RSI');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRSI(); 