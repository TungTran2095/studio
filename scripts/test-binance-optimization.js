#!/usr/bin/env node

/**
 * Script để test và validate các giải pháp tối ưu Binance API
 * Chạy: node scripts/test-binance-optimization.js
 */

const { binanceWebSocketManager } = require('../src/lib/websocket/binance-websocket');
const { smartApiManager } = require('../src/lib/api/smart-api-manager');
const { binanceRateLimiter } = require('../src/lib/monitor/binance-rate-limiter');

class BinanceOptimizationTester {
  constructor() {
    this.testResults = {
      websocket: { passed: 0, failed: 0, tests: [] },
      smartApi: { passed: 0, failed: 0, tests: [] },
      rateLimiter: { passed: 0, failed: 0, tests: [] },
      caching: { passed: 0, failed: 0, tests: [] }
    };
  }

  async runAllTests() {
    console.log('🚀 Bắt đầu test các giải pháp tối ưu Binance API...\n');

    await this.testWebSocketConnection();
    await this.testSmartApiManager();
    await this.testRateLimiter();
    await this.testCachingSystem();

    this.printResults();
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket Connection...');
    
    try {
      // Test connection
      binanceWebSocketManager.connect();
      await this.sleep(2000);
      
      const isConnected = binanceWebSocketManager.isWebSocketConnected();
      this.addTestResult('websocket', 'Connection Test', isConnected);
      
      if (isConnected) {
        console.log('✅ WebSocket connected successfully');
        
        // Test price data
        try {
          const price = await binanceWebSocketManager.getCurrentPrice('BTCUSDT');
          this.addTestResult('websocket', 'Price Data Test', !!price);
          console.log(`✅ Price data received: BTCUSDT = $${price}`);
        } catch (error) {
          this.addTestResult('websocket', 'Price Data Test', false);
          console.log('❌ Failed to get price data:', error.message);
        }
      } else {
        this.addTestResult('websocket', 'Connection Test', false);
        console.log('❌ WebSocket connection failed');
      }
    } catch (error) {
      this.addTestResult('websocket', 'Connection Test', false);
      console.log('❌ WebSocket test failed:', error.message);
    }

    console.log('');
  }

  async testSmartApiManager() {
    console.log('🧠 Testing Smart API Manager...');
    
    try {
      // Test price fetching
      const priceResult = await smartApiManager.getPrice('BTCUSDT', {
        useCache: true,
        useWebSocket: true,
        priority: 'high'
      });
      
      this.addTestResult('smartApi', 'Price Fetching', !!priceResult.data);
      console.log(`✅ Smart API price: ${priceResult.data} (from cache: ${priceResult.fromCache})`);
      
      // Test cache stats
      const stats = smartApiManager.getCacheStats();
      this.addTestResult('smartApi', 'Cache Stats', !!stats);
      console.log(`✅ Cache stats: ${JSON.stringify(stats)}`);
      
    } catch (error) {
      this.addTestResult('smartApi', 'Price Fetching', false);
      console.log('❌ Smart API test failed:', error.message);
    }

    console.log('');
  }

  async testRateLimiter() {
    console.log('🛡️ Testing Rate Limiter...');
    
    try {
      // Test normal throttling
      const startTime = Date.now();
      await binanceRateLimiter.throttle('market');
      const duration = Date.now() - startTime;
      
      this.addTestResult('rateLimiter', 'Normal Throttling', duration < 1000);
      console.log(`✅ Normal throttling: ${duration}ms`);
      
      // Test usage stats
      const stats = binanceRateLimiter.getUsageStats();
      this.addTestResult('rateLimiter', 'Usage Stats', !!stats);
      console.log(`✅ Usage stats: ${JSON.stringify(stats)}`);
      
      // Test emergency mode
      const canMakeCall = binanceRateLimiter.canMakeCall('market');
      this.addTestResult('rateLimiter', 'Can Make Call Check', typeof canMakeCall === 'boolean');
      console.log(`✅ Can make call: ${canMakeCall}`);
      
    } catch (error) {
      this.addTestResult('rateLimiter', 'Normal Throttling', false);
      console.log('❌ Rate limiter test failed:', error.message);
    }

    console.log('');
  }

  async testCachingSystem() {
    console.log('💾 Testing Caching System...');
    
    try {
      const { priceCache, accountCache } = require('../src/lib/cache/enhanced-cache');
      
      // Test cache set/get
      priceCache.set('test-key', 'test-value', 5000);
      const cachedValue = priceCache.get('test-key');
      
      this.addTestResult('caching', 'Cache Set/Get', cachedValue === 'test-value');
      console.log(`✅ Cache set/get: ${cachedValue}`);
      
      // Test cache stats
      const stats = priceCache.getStats();
      this.addTestResult('caching', 'Cache Stats', !!stats);
      console.log(`✅ Cache stats: ${JSON.stringify(stats)}`);
      
      // Test cache expiration
      await this.sleep(6000);
      const expiredValue = priceCache.get('test-key');
      this.addTestResult('caching', 'Cache Expiration', expiredValue === null);
      console.log(`✅ Cache expiration: ${expiredValue === null ? 'Working' : 'Failed'}`);
      
    } catch (error) {
      this.addTestResult('caching', 'Cache Set/Get', false);
      console.log('❌ Caching test failed:', error.message);
    }

    console.log('');
  }

  addTestResult(category, testName, passed) {
    const result = { testName, passed };
    this.testResults[category].tests.push(result);
    
    if (passed) {
      this.testResults[category].passed++;
    } else {
      this.testResults[category].failed++;
    }
  }

  printResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================\n');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    Object.entries(this.testResults).forEach(([category, results]) => {
      const { passed, failed, tests } = results;
      totalPassed += passed;
      totalFailed += failed;
      
      console.log(`${category.toUpperCase()}:`);
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      
      tests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        console.log(`    ${icon} ${test.testName}`);
      });
      console.log('');
    });
    
    console.log('OVERALL:');
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! Binance API optimization is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Chạy tests nếu script được gọi trực tiếp
if (require.main === module) {
  const tester = new BinanceOptimizationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = BinanceOptimizationTester;
