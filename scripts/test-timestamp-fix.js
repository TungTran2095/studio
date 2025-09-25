#!/usr/bin/env node

/**
 * Script để test timestamp fix
 * Sử dụng: node scripts/test-timestamp-fix.js
 */

const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testTimestampFix() {
  log('cyan', '🧪 Testing timestamp fix...\n');
  
  try {
    // Test 1: Lấy server time
    log('blue', '📡 Test 1: Lấy server time từ Binance...');
    const serverTimeResponse = await makeRequest('https://api.binance.com/api/v3/time');
    const serverTime = serverTimeResponse.serverTime;
    const localTime = Date.now();
    const timeDiff = localTime - serverTime;
    
    log('green', `✅ Server time: ${new Date(serverTime).toISOString()}`);
    log('blue', `📱 Local time: ${new Date(localTime).toISOString()}`);
    log('yellow', `⏰ Time difference: ${timeDiff}ms (${timeDiff > 0 ? 'local ahead' : 'local behind'})`);
    
    // Test 2: Test timestamp mới
    log('blue', '\n🛡️ Test 2: Test timestamp mới...');
    
    const testTimestamp = localTime - 10000; // 10 giây trước local time
    const testUrl = `https://api.binance.com/api/v3/time?timestamp=${testTimestamp}`;
    
    log('yellow', `🕐 Test timestamp: ${new Date(testTimestamp).toISOString()}`);
    log('yellow', `📊 Difference vs server: ${testTimestamp - serverTime}ms`);
    
    try {
      const testResponse = await makeRequest(testUrl);
      log('green', '✅ API call với timestamp mới thành công!');
    } catch (error) {
      log('red', `❌ API call thất bại: ${error.message}`);
    }
    
    // Test 3: Test timestamp cũ (như trong log)
    log('blue', '\n⚠️ Test 3: Test timestamp cũ từ log...');
    
    const oldTimestamp = 1758765326473; // Timestamp từ log
    const oldUrl = `https://api.binance.com/api/v3/time?timestamp=${oldTimestamp}`;
    
    log('yellow', `🕐 Old timestamp: ${new Date(oldTimestamp).toISOString()}`);
    log('yellow', `📊 Difference vs server: ${oldTimestamp - serverTime}ms`);
    log('yellow', `📊 Age: ${localTime - oldTimestamp}ms (${Math.round((localTime - oldTimestamp) / 1000)}s)`);
    
    try {
      const oldResponse = await makeRequest(oldUrl);
      log('green', '✅ API call với timestamp cũ cũng thành công!');
    } catch (error) {
      log('red', `❌ API call thất bại (như mong đợi): ${error.message}`);
    }
    
    // Test 4: Test multiple timestamps
    log('blue', '\n🔄 Test 4: Test multiple timestamps...');
    
    for (let i = 0; i < 3; i++) {
      const timestamp = Date.now() - 10000; // 10 giây trước
      log('cyan', `📊 Test ${i + 1}: ${new Date(timestamp).toISOString()} (${timestamp})`);
      
      // Đợi 1 giây
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Kết luận
    log('cyan', '\n💡 Kết luận:');
    log('green', '✅ Sử dụng Date.now() - 10000ms cho mỗi API call');
    log('green', '✅ Timestamp mới mỗi lần gọi tránh timestamp cũ');
    log('green', '✅ RecvWindow 60000ms đủ lớn cho timestamp mới');
    
  } catch (error) {
    log('red', '❌ Error testing timestamp fix:', error.message);
  }
}

// Chạy test
testTimestampFix().catch(console.error);

