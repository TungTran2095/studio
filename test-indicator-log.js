const https = require('https');
const http = require('http');

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const req = client.request(url, options, (res) => {
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
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testIndicatorLog() {
  try {
    console.log('🧪 Testing indicator log functionality...');
    
    const botId = '7cb1750a-3357-4c74-aa3c-b92abf23764e';
    
    // 1. Test ghi log indicator thủ công
    console.log('\n📝 Testing manual indicator log insertion...');
    
    const testLogData = {
      botId: botId,
      indicator: 'RSI',
      value: 34.82,
      time: new Date().toISOString()
    };
    
    console.log('Test data:', testLogData);
    
    // Gọi API để test ghi log
    try {
      const testUrl = `http://localhost:9002/api/trading/bot/test-log`;
      const testResult = await makeRequest(testUrl, 'POST', testLogData);
      console.log('✅ Test result:', testResult);
      
      if (testResult.success) {
        console.log('🎉 Successfully inserted indicator log!');
        console.log('Total logs now:', testResult.totalLogs);
        console.log('Recent logs:', testResult.recentLogs.length);
      }
    } catch (error) {
      console.log('❌ Test API error:', error.message);
    }
    
    // 2. Kiểm tra logs hiện tại
    console.log('\n📊 Checking current indicator logs...');
    const debugUrl = 'http://localhost:9002/api/trading/bot/debug?botName=real23';
    const debugResult = await makeRequest(debugUrl);
    
    console.log('Current indicator logs count:', debugResult.indicator_logs.length);
    
    if (debugResult.indicator_logs.length === 0) {
      console.log('⚠️ No indicator logs found');
      console.log('Possible issues:');
      console.log('1. bot_indicator_logs table does not exist');
      console.log('2. Bot is not calling logIndicator function');
      console.log('3. Error when inserting logs');
    } else {
      console.log('✅ Found indicator logs:');
      debugResult.indicator_logs.slice(0, 5).forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.indicator}: ${log.value} at ${log.time}`);
      });
    }
    
    // 3. Kiểm tra RSI hiện tại
    console.log('\n📈 Checking current RSI...');
    const rsiUrl = `http://localhost:9002/api/trading/bot/indicator-history?botId=${botId}`;
    const rsiResult = await makeRequest(rsiUrl);
    
    if (rsiResult.history && rsiResult.history.length > 0) {
      const latest = rsiResult.history[rsiResult.history.length - 1];
      console.log('Current RSI:', latest.value);
      console.log('Should trigger:', latest.value <= rsiResult.oversold || latest.value >= rsiResult.triggerValue);
    }
    
    // 4. Đề xuất giải pháp
    console.log('\n🔧 Suggested solutions:');
    console.log('1. Check if bot_indicator_logs table exists in Supabase');
    console.log('2. Verify RLS policies allow insertion');
    console.log('3. Check if BotExecutor is actually running');
    console.log('4. Add more logging to BotExecutor.logIndicator function');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testIndicatorLog(); 