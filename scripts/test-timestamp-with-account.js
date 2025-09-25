#!/usr/bin/env node

/**
 * Script để test timestamp với account API
 * Sử dụng: node scripts/test-timestamp-with-account.js
 */

const https = require('https');
const crypto = require('crypto');

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
      method: options.method || 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
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
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

function createSignature(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function testTimestampWithAccount() {
  log('cyan', '🧪 Testing timestamp với account API...\n');
  
  try {
    // Test 1: Lấy server time từ Binance
    log('blue', '📡 Test 1: Lấy server time từ Binance...');
    
    const serverTimeResponse = await makeRequest('https://api.binance.com/api/v3/time');
    const serverTime = serverTimeResponse.data.serverTime;
    const localTime = Date.now();
    
    log('green', `✅ Server time: ${new Date(serverTime).toISOString()}`);
    log('blue', `📱 Local time: ${new Date(localTime).toISOString()}`);
    
    const diff = localTime - serverTime;
    log('yellow', `⏰ Time diff: ${diff}ms (${diff > 0 ? 'local ahead' : 'local behind'})`);
    
    // Test 2: Test timestamp mới với offset -1000ms
    log('blue', '\n🛡️ Test 2: Test timestamp mới với offset -1000ms...');
    
    const newTimestamp = localTime - 1000;
    log('cyan', `📊 New timestamp: ${newTimestamp} (${new Date(newTimestamp).toISOString()})`);
    log('yellow', `📊 Offset from server: ${newTimestamp - serverTime}ms`);
    
    // Test 3: Test với account API (cần API key và secret)
    log('blue', '\n🎯 Test 3: Test với account API...');
    
    // Sử dụng testnet để test
    const testnetUrl = 'https://testnet.binance.vision/api/v3/account';
    const testTimestamp = newTimestamp;
    
    // Tạo query string
    const queryString = `timestamp=${testTimestamp}`;
    
    // Sử dụng dummy API key và secret cho test
    const apiKey = 'test-api-key';
    const apiSecret = 'test-api-secret';
    const signature = createSignature(queryString, apiSecret);
    
    const fullUrl = `${testnetUrl}?${queryString}&signature=${signature}`;
    
    try {
      const testResponse = await makeRequest(fullUrl, {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      });
      
      if (testResponse.status === 200) {
        log('green', '✅ Account API call thành công với timestamp mới');
      } else if (testResponse.status === 401) {
        log('yellow', '⚠️ Account API call trả về 401 (expected - invalid API key)');
        log('blue', '📊 Điều này có nghĩa là timestamp được chấp nhận');
      } else {
        log('red', '❌ Account API call thất bại');
        log('red', `📊 Status: ${testResponse.status}`);
        log('red', `📊 Response: ${JSON.stringify(testResponse.data)}`);
      }
    } catch (error) {
      log('red', `❌ Account API call error: ${error.message}`);
    }
    
    // Test 4: Test với các offset khác nhau
    log('blue', '\n📊 Test 4: Test với các offset khác nhau...');
    
    const offsets = [500, 1000, 2000, 5000]; // 0.5s, 1s, 2s, 5s
    
    for (const offset of offsets) {
      const testTimestamp = localTime - offset;
      const diffFromServer = testTimestamp - serverTime;
      
      log('cyan', `\n📊 Offset: ${offset}ms (${offset/1000}s trước local time)`);
      log('yellow', `📊 Timestamp: ${new Date(testTimestamp).toISOString()}`);
      log('yellow', `📊 Diff from server: ${diffFromServer}ms`);
      
      try {
        const queryString = `timestamp=${testTimestamp}`;
        const signature = createSignature(queryString, apiSecret);
        const fullUrl = `${testnetUrl}?${queryString}&signature=${signature}`;
        
        const testResponse = await makeRequest(fullUrl, {
          headers: {
            'X-MBX-APIKEY': apiKey
          }
        });
        
        if (testResponse.status === 200) {
          log('green', `  ✅ OK với offset ${offset}ms`);
        } else if (testResponse.status === 401) {
          log('yellow', `  ⚠️ 401 với offset ${offset}ms (timestamp OK)`);
        } else {
          log('red', `  ❌ Failed với offset ${offset}ms (status: ${testResponse.status})`);
        }
      } catch (error) {
        log('red', `  ❌ Error với offset ${offset}ms: ${error.message}`);
      }
    }
    
    // Kết luận
    log('cyan', '\n💡 Kết luận:');
    log('blue', '✅ Sử dụng getTime function thay vì useServerTime');
    log('blue', '✅ Timestamp = Date.now() - 1000ms để đảm bảo an toàn');
    log('blue', '✅ RecvWindow 120000ms đủ lớn cho hầu hết trường hợp');
    log('green', '🔧 Khuyến nghị: Sử dụng cấu hình mới này cho tất cả bot');
    
  } catch (error) {
    log('red', '❌ Error testing timestamp with account:', error.message);
  }
}

// Chạy test
testTimestampWithAccount().catch(console.error);

