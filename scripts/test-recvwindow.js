#!/usr/bin/env node

/**
 * Script để test recvWindow mới
 * Sử dụng: node scripts/test-recvwindow.js
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

async function testRecvWindow() {
  log('cyan', '🧪 Testing recvWindow mới...\n');
  
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
    
    // Test 2: Test các recvWindow khác nhau
    log('blue', '\n🛡️ Test 2: Test các recvWindow khác nhau...');
    
    const recvWindows = [30000, 60000, 120000, 180000]; // 30s, 1m, 2m, 3m
    
    for (const recvWindow of recvWindows) {
      // Tạo timestamp với độ trễ khác nhau
      const testTimestamps = [
        serverTime - 10000,  // 10s trước server
        serverTime - 30000,  // 30s trước server
        serverTime - 60000,  // 1m trước server
        serverTime - 120000, // 2m trước server
        serverTime - 180000  // 3m trước server
      ];
      
      log('cyan', `\n📊 RecvWindow: ${recvWindow}ms (${recvWindow/1000}s)`);
      
      for (const timestamp of testTimestamps) {
        const diff = Math.abs(timestamp - serverTime);
        const isWithinWindow = diff <= recvWindow;
        
        log(isWithinWindow ? 'green' : 'red', 
          `  ${isWithinWindow ? '✅' : '❌'} ${diff/1000}s trước server: ${new Date(timestamp).toISOString()}`);
      }
    }
    
    // Test 3: Test timestamp từ log
    log('blue', '\n⚠️ Test 3: Test timestamp từ log...');
    
    const logTimestamps = [1758765468688, 1758765470521, 1758765471406, 1758765473082];
    const recvWindow = 120000; // 2 phút
    
    for (const timestamp of logTimestamps) {
      const age = localTime - timestamp;
      const diff = Math.abs(timestamp - serverTime);
      const isWithinWindow = diff <= recvWindow;
      
      log('yellow', `🕐 Timestamp: ${new Date(timestamp).toISOString()}`);
      log('yellow', `📊 Age: ${age}ms (${Math.round(age/1000)}s)`);
      log('yellow', `📊 Diff vs server: ${diff}ms (${Math.round(diff/1000)}s)`);
      log(isWithinWindow ? 'green' : 'red', 
        `  ${isWithinWindow ? '✅' : '❌'} Within recvWindow (${recvWindow/1000}s)`);
      console.log();
    }
    
    // Kết luận
    log('cyan', '\n💡 Kết luận:');
    log('green', '✅ RecvWindow 120000ms (2 phút) đủ lớn cho hầu hết trường hợp');
    log('green', '✅ useServerTime=true sẽ tự động đồng bộ timestamp');
    log('green', '✅ Timestamp từ log vẫn có thể nằm ngoài recvWindow nếu quá cũ');
    log('blue', '🔧 Khuyến nghị: Sử dụng recvWindow 120000ms + useServerTime=true');
    
  } catch (error) {
    log('red', '❌ Error testing recvWindow:', error.message);
  }
}

// Chạy test
testRecvWindow().catch(console.error);

