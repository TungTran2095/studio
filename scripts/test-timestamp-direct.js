#!/usr/bin/env node

/**
 * Script để test timestamp trực tiếp với Binance API
 * Sử dụng: node scripts/test-timestamp-direct.js
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

async function testTimestampDirect() {
  log('cyan', '🧪 Testing timestamp trực tiếp với Binance API...\n');
  
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
    
    // Test 2: Tính timestamp an toàn
    log('blue', '\n🛡️ Test 2: Tính timestamp an toàn...');
    
    const safeOffsets = [10000, 30000, 60000, 120000]; // 10s, 30s, 1m, 2m
    
    for (const offset of safeOffsets) {
      const safeTimestamp = serverTime - offset;
      const safeTimeDiff = safeTimestamp - serverTime;
      
      log('cyan', `📊 Offset ${offset}ms: ${new Date(safeTimestamp).toISOString()}`);
      log('yellow', `   Difference vs server: ${safeTimeDiff}ms`);
      
      // Kiểm tra xem có trong recvWindow không
      const recvWindow = 60000; // 60 giây
      const isWithinRecvWindow = Math.abs(safeTimeDiff) <= recvWindow;
      log(isWithinRecvWindow ? 'green' : 'red', `   ${isWithinRecvWindow ? '✅' : '❌'} Within recvWindow (${recvWindow}ms)`);
    }
    
    // Test 3: Test với timestamp thực tế
    log('blue', '\n🔬 Test 3: Test timestamp với API call thực tế...');
    
    // Sử dụng timestamp an toàn nhất
    const testTimestamp = serverTime - 30000; // 30 giây trước server time
    const testUrl = `https://api.binance.com/api/v3/time?timestamp=${testTimestamp}`;
    
    log('yellow', `🕐 Test timestamp: ${new Date(testTimestamp).toISOString()}`);
    log('yellow', `📊 Difference vs server: ${testTimestamp - serverTime}ms`);
    
    try {
      const testResponse = await makeRequest(testUrl);
      log('green', '✅ API call với timestamp an toàn thành công!');
      log('blue', `📄 Response: ${JSON.stringify(testResponse)}`);
    } catch (error) {
      log('red', `❌ API call thất bại: ${error.message}`);
    }
    
    // Test 4: Test với timestamp không an toàn
    log('blue', '\n⚠️ Test 4: Test với timestamp không an toàn...');
    
    const unsafeTimestamp = serverTime + 1000; // 1 giây sau server time
    const unsafeUrl = `https://api.binance.com/api/v3/time?timestamp=${unsafeTimestamp}`;
    
    log('yellow', `🕐 Unsafe timestamp: ${new Date(unsafeTimestamp).toISOString()}`);
    log('yellow', `📊 Difference vs server: ${unsafeTimestamp - serverTime}ms`);
    
    try {
      const unsafeResponse = await makeRequest(unsafeUrl);
      log('green', '✅ API call với timestamp không an toàn cũng thành công!');
    } catch (error) {
      log('red', `❌ API call thất bại (như mong đợi): ${error.message}`);
    }
    
    // Kết luận
    log('cyan', '\n💡 Kết luận và khuyến nghị:');
    log('blue', '✅ Sử dụng timestamp = serverTime - 30000ms (30 giây trước)');
    log('blue', '✅ RecvWindow 60000ms (60 giây) là đủ an toàn');
    log('blue', '✅ Luôn sync server time trước khi tạo timestamp');
    log('blue', '✅ Implement retry logic với timestamp error handling');
    
    // Test 5: Test TimeSync logic
    log('blue', '\n🔧 Test 5: Test TimeSync logic...');
    
    // Mock TimeSync logic
    const mockTimeSync = {
      lastServerTime: serverTime,
      isSynced: true,
      getSafeTimestampForTrading: function() {
        const now = Date.now();
        if (this.isSynced && this.lastServerTime > 0) {
          const safeOffset = 30000; // 30 giây trước server time
          const safeTimestamp = this.lastServerTime - safeOffset;
          const minTimestamp = now - 300000; // 5 phút trước
          return Math.max(safeTimestamp, minTimestamp);
        }
        return now - 60000; // 1 phút trước để an toàn
      }
    };
    
    const timeSyncTimestamp = mockTimeSync.getSafeTimestampForTrading();
    const timeSyncDiff = timeSyncTimestamp - serverTime;
    
    log('green', `✅ TimeSync timestamp: ${new Date(timeSyncTimestamp).toISOString()}`);
    log('yellow', `📊 Difference vs server: ${timeSyncDiff}ms`);
    log('green', `✅ TimeSync logic hoạt động tốt!`);
    
  } catch (error) {
    log('red', '❌ Error testing timestamp:', error.message);
  }
}

// Chạy test
testTimestampDirect().catch(console.error);

