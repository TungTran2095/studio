#!/usr/bin/env node

/**
 * Script để test timestamp synchronization với Binance API
 * Sử dụng: node scripts/test-timestamp-sync.js
 */

const https = require('https');
const http = require('http');

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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
  });
}

async function testTimestampSync() {
  log('cyan', '🕐 Testing Timestamp Synchronization với Binance API...\n');
  
  const endpoints = [
    'https://api.binance.com/api/v3/time',
    'https://api1.binance.com/api/v3/time',
    'https://api2.binance.com/api/v3/time',
    'https://api3.binance.com/api/v3/time'
  ];
  
  const localTime = Date.now();
  log('blue', `📱 Local Time: ${new Date(localTime).toISOString()}`);
  log('blue', `📱 Local Timestamp: ${localTime}\n`);
  
  let bestEndpoint = null;
  let bestServerTime = null;
  let minLatency = Infinity;
  
  // Test tất cả endpoints
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    log('yellow', `🔍 Testing ${endpoint}...`);
    
    try {
      const startTime = Date.now();
      const response = await makeRequest(endpoint);
      const endTime = Date.now();
      
      const latency = endTime - startTime;
      const serverTime = response.serverTime;
      
      log('green', `  ✅ Success! Latency: ${latency}ms`);
      log('blue', `  🕐 Server Time: ${new Date(serverTime).toISOString()}`);
      log('blue', `  🕐 Server Timestamp: ${serverTime}`);
      
      const timeDiff = localTime - serverTime;
      const timeDiffAbs = Math.abs(timeDiff);
      
      if (timeDiff > 0) {
        log('yellow', `  ⏰ Local is ${timeDiff}ms ahead of server`);
      } else {
        log('yellow', `  ⏰ Local is ${Math.abs(timeDiff)}ms behind server`);
      }
      
      // Chọn endpoint có latency thấp nhất
      if (latency < minLatency) {
        minLatency = latency;
        bestEndpoint = endpoint;
        bestServerTime = serverTime;
      }
      
      console.log();
      
    } catch (error) {
      log('red', `  ❌ Failed: ${error.message}`);
      console.log();
    }
  }
  
  if (!bestEndpoint) {
    log('red', '❌ Tất cả endpoints đều thất bại!');
    return;
  }
  
  // Tính toán offset tối ưu
  log('magenta', '📊 Kết quả phân tích:');
  log('blue', `🏆 Best Endpoint: ${bestEndpoint}`);
  log('blue', `⚡ Best Latency: ${minLatency}ms`);
  log('blue', `🕐 Best Server Time: ${new Date(bestServerTime).toISOString()}`);
  
  const timeDiff = localTime - bestServerTime;
  log('yellow', `⏰ Time Difference: ${timeDiff}ms (${timeDiff > 0 ? 'local ahead' : 'local behind'})`);
  
  // Tính offset khuyến nghị
  const recommendedOffset = bestServerTime - localTime - 30000; // 30 giây margin
  log('green', `💡 Recommended Offset: ${recommendedOffset}ms`);
  
  // Tính các timestamp an toàn
  const safeTimestamp = localTime - 10000;
  const tradingTimestamp = localTime - 400000;
  
  log('cyan', '\n📋 Timestamp Recommendations:');
  log('blue', `🔒 Safe Timestamp: ${safeTimestamp} (${new Date(safeTimestamp).toISOString()})`);
  log('blue', `💰 Trading Timestamp: ${tradingTimestamp} (${new Date(tradingTimestamp).toISOString()})`);
  
  // Kiểm tra độ an toàn
  log('cyan', '\n🛡️ Safety Analysis:');
  
  const safeVsServer = safeTimestamp - bestServerTime;
  const tradingVsServer = tradingTimestamp - bestServerTime;
  
  if (safeVsServer < -10000) {
    log('green', `✅ Safe Timestamp: OK (${safeVsServer}ms vs server)`);
  } else {
    log('red', `⚠️ Safe Timestamp: Risky (${safeVsServer}ms vs server)`);
  }
  
  if (tradingVsServer < -300000) {
    log('green', `✅ Trading Timestamp: Very Safe (${tradingVsServer}ms vs server)`);
  } else {
    log('red', `⚠️ Trading Timestamp: Risky (${tradingVsServer}ms vs server)`);
  }
  
  // Khuyến nghị
  log('cyan', '\n💡 Recommendations:');
  
  if (Math.abs(timeDiff) > 5000) {
    log('yellow', '⚠️ Chênh lệch thời gian lớn. Cần đồng bộ thời gian hệ thống.');
  } else {
    log('green', '✅ Chênh lệch thời gian trong phạm vi chấp nhận được.');
  }
  
  if (minLatency > 2000) {
    log('yellow', '⚠️ Latency cao. Có thể ảnh hưởng đến hiệu suất trading.');
  } else {
    log('green', '✅ Latency tốt cho trading.');
  }
  
  log('blue', `🔧 Sử dụng offset ${recommendedOffset}ms trong TimeSync class.`);
}

// Chạy test
testTimestampSync().catch(console.error);

