#!/usr/bin/env node

/**
 * Script để test restart bot Farmer02
 * Sử dụng: node scripts/test-restart-farmer02.js
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

async function testRestartFarmer02() {
  log('cyan', '🧪 Testing restart bot Farmer02...\n');
  
  try {
    // Test 1: Kiểm tra timestamp sync
    log('blue', '📡 Test 1: Kiểm tra timestamp sync...');
    
    const timestampResponse = await makeRequest('http://localhost:3000/api/timestamp-monitor');
    
    if (timestampResponse.status === 200) {
      const timestampData = timestampResponse.data;
      log('green', '✅ Timestamp monitor API hoạt động');
      log('blue', `📊 Local time: ${timestampData.info.local.formatted}`);
      log('blue', `📊 Server time: ${timestampData.info.server.formatted || 'N/A'}`);
      log('blue', `📊 Offset: ${timestampData.info.offset.value}ms`);
      log('blue', `📊 Sync status: ${timestampData.info.sync.isSynchronized ? 'Synchronized' : 'Not synchronized'}`);
    } else {
      log('red', '❌ Timestamp monitor API không hoạt động');
    }
    
    // Test 2: Force sync timestamp
    log('blue', '\n🔄 Test 2: Force sync timestamp...');
    
    try {
      const syncResponse = await makeRequest('http://localhost:3000/api/timestamp-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' })
      });
      
      if (syncResponse.status === 200) {
        const syncData = syncResponse.data;
        log('green', '✅ Force sync thành công');
        log('blue', `📊 New offset: ${syncData.newOffset}ms`);
        log('blue', `📊 Is synchronized: ${syncData.isSynchronized}`);
      } else {
        log('red', '❌ Force sync thất bại');
      }
    } catch (error) {
      log('red', `❌ Force sync error: ${error.message}`);
    }
    
    // Test 3: Restart bot Farmer02
    log('blue', '\n🤖 Test 3: Restart bot Farmer02...');
    
    try {
      const restartResponse = await makeRequest('http://localhost:3000/api/timestamp-monitor/restart-bot', {
        method: 'POST',
        body: JSON.stringify({ botName: 'Farmer02' })
      });
      
      if (restartResponse.status === 200) {
        const restartData = restartResponse.data;
        log('green', '✅ Restart bot Farmer02 thành công');
        log('blue', `📊 Bot ID: ${restartData.bot.id}`);
        log('blue', `📊 Bot name: ${restartData.bot.name}`);
        log('blue', `📊 Bot status: ${restartData.bot.status}`);
        log('blue', `📊 New offset: ${restartData.newOffset}ms`);
        log('blue', `📊 Is synchronized: ${restartData.isSynchronized}`);
      } else {
        log('red', '❌ Restart bot Farmer02 thất bại');
        log('red', `📊 Error: ${restartData.error || 'Unknown error'}`);
      }
    } catch (error) {
      log('red', `❌ Restart bot error: ${error.message}`);
    }
    
    // Test 4: Kiểm tra trạng thái bot
    log('blue', '\n📊 Test 4: Kiểm tra trạng thái bot...');
    
    try {
      const botsResponse = await makeRequest('http://localhost:3000/api/trading/bot?projectId=all');
      
      if (botsResponse.status === 200) {
        const botsData = botsResponse.data;
        log('green', '✅ Lấy danh sách bot thành công');
        
        const farmer02 = botsData.find(bot => bot.name === 'Farmer02');
        if (farmer02) {
          log('blue', `📊 Farmer02 status: ${farmer02.status}`);
          log('blue', `📊 Farmer02 ID: ${farmer02.id}`);
        } else {
          log('yellow', '⚠️ Không tìm thấy bot Farmer02');
        }
        
        const farmer01 = botsData.find(bot => bot.name === 'Farmer01');
        if (farmer01) {
          log('blue', `📊 Farmer01 status: ${farmer01.status}`);
        }
      } else {
        log('red', '❌ Không thể lấy danh sách bot');
      }
    } catch (error) {
      log('red', `❌ Get bots error: ${error.message}`);
    }
    
    // Kết luận
    log('cyan', '\n💡 Kết luận:');
    log('blue', '✅ Sử dụng API endpoints để restart bot');
    log('blue', '✅ Force sync timestamp trước khi restart');
    log('blue', '✅ Monitor trạng thái bot sau khi restart');
    
  } catch (error) {
    log('red', '❌ Error testing restart Farmer02:', error.message);
  }
}

// Chạy test
testRestartFarmer02().catch(console.error);

