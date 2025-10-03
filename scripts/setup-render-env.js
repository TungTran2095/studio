#!/usr/bin/env node

/**
 * Script để tự động setup environment variables trên Render.com
 * Chạy: node scripts/setup-render-env.js
 */

const https = require('https');
const readline = require('readline');

class RenderEnvironmentSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.environmentVariables = {
      // Binance API Rate Limits
      'BINANCE_USED_WEIGHT_PER_MIN': '1000',
      'BINANCE_ORDERS_PER_10S': '40',
      'BINANCE_ORDERS_PER_1M': '1500',
      
      // Cache Settings
      'CACHE_DEFAULT_TTL': '30000',
      'CACHE_MAX_SIZE': '1000',
      
      // WebSocket Settings
      'WEBSOCKET_RECONNECT_ATTEMPTS': '5',
      'WEBSOCKET_RECONNECT_INTERVAL': '5000',
      
      // Next.js Public Variables
      'NEXT_PUBLIC_BINANCE_WEIGHT_1M': '1000',
      'NEXT_PUBLIC_BINANCE_WEIGHT_1D': '100000',
      'NEXT_PUBLIC_BINANCE_ORDERS_10S': '40',
      'NEXT_PUBLIC_BINANCE_ORDERS_1M': '1500',
      'NEXT_PUBLIC_BINANCE_ORDERS_1D': '200000',
      'NEXT_PUBLIC_BINANCE_RAW_1M': '6000'
    };
  }

  async setup() {
    console.log('🚀 Render.com Environment Variables Setup');
    console.log('==========================================\n');

    console.log('📋 Environment variables sẽ được thêm:');
    Object.entries(this.environmentVariables).forEach(([key, value]) => {
      console.log(`  ${key}=${value}`);
    });
    console.log('');

    const serviceId = await this.askQuestion('Nhập Render Service ID: ');
    const apiKey = await this.askQuestion('Nhập Render API Key: ');

    if (!serviceId || !apiKey) {
      console.log('❌ Service ID và API Key là bắt buộc!');
      this.rl.close();
      return;
    }

    console.log('\n🔄 Đang thêm environment variables...\n');

    let successCount = 0;
    let failCount = 0;

    for (const [key, value] of Object.entries(this.environmentVariables)) {
      try {
        await this.setEnvironmentVariable(serviceId, apiKey, key, value);
        console.log(`✅ ${key}=${value}`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${key}=${value} - ${error.message}`);
        failCount++;
      }
      
      // Delay để tránh rate limit
      await this.sleep(1000);
    }

    console.log('\n📊 Kết quả:');
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`❌ Thất bại: ${failCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Environment variables đã được thêm thành công!');
      console.log('💡 Hãy restart service trên Render để áp dụng các thay đổi.');
    }

    this.rl.close();
  }

  async setEnvironmentVariable(serviceId, apiKey, key, value) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        key: key,
        value: value
      });

      const options = {
        hostname: 'api.render.com',
        port: 443,
        path: `/v1/services/${serviceId}/env-vars`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Chạy setup nếu script được gọi trực tiếp
if (require.main === module) {
  const setup = new RenderEnvironmentSetup();
  setup.setup().catch(console.error);
}

module.exports = RenderEnvironmentSetup;
