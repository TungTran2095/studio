#!/usr/bin/env node

/**
 * Script để test sự khác biệt giữa testnet và realnet
 * Sử dụng: node scripts/test-testnet-vs-realnet.js
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
      timeout: 10000,
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

async function testTestnetVsRealnet() {
  log('cyan', '🧪 Testing sự khác biệt giữa testnet và realnet...\n');
  
  try {
    // Test 1: Lấy server time từ cả testnet và realnet
    log('blue', '📡 Test 1: Lấy server time từ testnet và realnet...');
    
    const testnetTimeResponse = await makeRequest('https://testnet.binance.vision/api/v3/time');
    const realnetTimeResponse = await makeRequest('https://api.binance.com/api/v3/time');
    
    const testnetTime = testnetTimeResponse.serverTime;
    const realnetTime = realnetTimeResponse.serverTime;
    const localTime = Date.now();
    
    log('green', `✅ Testnet time: ${new Date(testnetTime).toISOString()}`);
    log('green', `✅ Realnet time: ${new Date(realnetTime).toISOString()}`);
    log('blue', `📱 Local time: ${new Date(localTime).toISOString()}`);
    
    const testnetDiff = localTime - testnetTime;
    const realnetDiff = localTime - realnetTime;
    
    log('yellow', `⏰ Testnet diff: ${testnetDiff}ms (${testnetDiff > 0 ? 'local ahead' : 'local behind'})`);
    log('yellow', `⏰ Realnet diff: ${realnetDiff}ms (${realnetDiff > 0 ? 'local ahead' : 'local behind'})`);
    
    // Test 2: Test timestamp với các offset khác nhau
    log('blue', '\n🛡️ Test 2: Test timestamp với các offset khác nhau...');
    
    const offsets = [0, 1000, 2000, 5000, 10000, 30000]; // 0ms, 1s, 2s, 5s, 10s, 30s
    
    for (const offset of offsets) {
      const testTimestamp = localTime - offset;
      
      log('cyan', `\n📊 Offset: ${offset}ms (${offset/1000}s trước local time)`);
      log('yellow', `🕐 Test timestamp: ${new Date(testTimestamp).toISOString()}`);
      
      // Test với testnet
      try {
        const testnetUrl = `https://testnet.binance.vision/api/v3/time?timestamp=${testTimestamp}`;
        await makeRequest(testnetUrl);
        log('green', `  ✅ Testnet: OK`);
      } catch (error) {
        log('red', `  ❌ Testnet: ${error.message}`);
      }
      
      // Test với realnet
      try {
        const realnetUrl = `https://api.binance.com/api/v3/time?timestamp=${testTimestamp}`;
        await makeRequest(realnetUrl);
        log('green', `  ✅ Realnet: OK`);
      } catch (error) {
        log('red', `  ❌ Realnet: ${error.message}`);
      }
    }
    
    // Test 3: Test với timestamp chính xác
    log('blue', '\n🎯 Test 3: Test với timestamp chính xác...');
    
    // Sử dụng server time làm base
    const baseTimestamp = realnetTime;
    const testTimestamps = [
      baseTimestamp - 1000,  // 1s trước server
      baseTimestamp - 500,   // 0.5s trước server
      baseTimestamp,         // Chính xác server time
      baseTimestamp + 500,   // 0.5s sau server
      baseTimestamp + 1000   // 1s sau server
    ];
    
    for (const timestamp of testTimestamps) {
      const diff = timestamp - realnetTime;
      
      log('cyan', `\n📊 Timestamp: ${new Date(timestamp).toISOString()}`);
      log('yellow', `📊 Diff vs realnet: ${diff}ms`);
      
      // Test với realnet
      try {
        const realnetUrl = `https://api.binance.com/api/v3/time?timestamp=${timestamp}`;
        await makeRequest(realnetUrl);
        log('green', `  ✅ Realnet: OK`);
      } catch (error) {
        log('red', `  ❌ Realnet: ${error.message}`);
      }
    }
    
    // Kết luận
    log('cyan', '\n💡 Kết luận:');
    log('blue', '✅ Testnet có thể chấp nhận timestamp linh hoạt hơn');
    log('blue', '✅ Realnet yêu cầu timestamp chính xác hơn');
    log('blue', '✅ Cần sử dụng server time chính xác cho realnet');
    log('green', '🔧 Khuyến nghị: Sử dụng server time - 1000ms cho realnet');
    
  } catch (error) {
    log('red', '❌ Error testing testnet vs realnet:', error.message);
  }
}

// Chạy test
testTestnetVsRealnet().catch(console.error);

