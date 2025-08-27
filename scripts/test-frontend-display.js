#!/usr/bin/env node

/**
 * Script test frontend component hiển thị Ichimoku
 */

require('dotenv').config();

console.log('🧪 Test frontend component hiển thị Ichimoku...\n');

async function testFrontendDisplay() {
  try {
    // Test API endpoint
    console.log('1️⃣ Test API endpoint...');
    const response = await fetch('http://localhost:9002/api/trading/bot/indicator-history?botId=cadaa53f-17a5-4d75-874c-237775689325');
    
    if (!response.ok) {
      console.log(`❌ API error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API response:');
    console.log(`   Indicator Name: ${data.indicatorName}`);
    console.log(`   Strategy: ${data.strategy}`);
    console.log(`   Timeframe: ${data.timeframe}`);
    console.log(`   Symbol: ${data.symbol}`);
    console.log(`   History points: ${data.history?.length || 0}`);
    
    // Kiểm tra dữ liệu Ichimoku
    if (data.indicatorName === 'Ichimoku Cloud') {
      console.log('\n2️⃣ Kiểm tra dữ liệu Ichimoku...');
      
      if (data.additionalData) {
        console.log('   ✅ Additional Data có sẵn:');
        console.log(`     Current Price: $${data.additionalData.currentPrice?.toFixed(2) || 'N/A'}`);
        console.log(`     Tenkan-sen: $${data.additionalData.currentTenkan?.toFixed(2) || 'N/A'}`);
        console.log(`     Kijun-sen: $${data.additionalData.currentKijun?.toFixed(2) || 'N/A'}`);
        console.log(`     Senkou Span A: $${data.additionalData.currentSenkouA?.toFixed(2) || 'N/A'}`);
        console.log(`     Senkou Span B: $${data.additionalData.currentSenkouB?.toFixed(2) || 'N/A'}`);
      } else {
        console.log('   ❌ Additional Data không có sẵn');
      }
      
      // Kiểm tra history data
      if (data.history && data.history.length > 0) {
        console.log('\n3️⃣ Kiểm tra history data...');
        const last = data.history[data.history.length - 1];
        console.log('   ✅ Last data point:');
        console.log(`     Time: ${new Date(Number(last.time)).toLocaleString('vi-VN')}`);
        console.log(`     Value: ${last.value}`);
        console.log(`     Tenkan: ${last.tenkan}`);
        console.log(`     Kijun: ${last.kijun}`);
        console.log(`     Senkou A: ${last.senkouA}`);
        console.log(`     Senkou B: ${last.senkouB}`);
        
        // Kiểm tra chất lượng dữ liệu
        const validDataPoints = data.history.filter(point => 
          point.tenkan !== null && 
          point.kijun !== null && 
          point.senkouA !== null && 
          point.senkouB !== null
        ).length;
        
        console.log(`\n4️⃣ Chất lượng dữ liệu:`);
        console.log(`   Tổng data points: ${data.history.length}`);
        console.log(`   Valid data points: ${validDataPoints}`);
        console.log(`   Tỷ lệ valid: ${((validDataPoints / data.history.length) * 100).toFixed(1)}%`);
        
        if (validDataPoints > 0) {
          console.log('   ✅ Có dữ liệu Ichimoku hợp lệ để hiển thị chart');
        } else {
          console.log('   ⚠️ Không có đủ dữ liệu Ichimoku hợp lệ');
        }
      } else {
        console.log('   ❌ Không có history data');
      }
    } else {
      console.log('   ❌ Không phải Ichimoku strategy');
    }
    
    // Test frontend component logic
    console.log('\n5️⃣ Test frontend component logic...');
    
    // Simulate component state
    const componentState = {
      indicatorData: data,
      timeframe: data.timeframe || '1m',
      triggers: {
        overbought: data.triggerValue,
        oversold: data.oversold
      }
    };
    
    console.log('   ✅ Component state:');
    console.log(`     Indicator Name: ${componentState.indicatorData.indicatorName}`);
    console.log(`     Timeframe: ${componentState.timeframe}`);
    console.log(`     Triggers:`, componentState.triggers);
    
    // Simulate chart data preparation
    if (data.history && data.history.length > 0) {
      const chartData = data.history.map((d) => ({
        ...d,
        trigger: componentState.triggers.overbought,
        triggerLow: componentState.triggers.oversold
      }));
      
      console.log(`   ✅ Chart data prepared: ${chartData.length} points`);
      
      // Check if Ichimoku lines are available
      if (data.indicatorName === 'Ichimoku Cloud') {
        const hasTenkan = chartData.some(d => d.tenkan !== null);
        const hasKijun = chartData.some(d => d.kijun !== null);
        const hasSenkouA = chartData.some(d => d.senkouA !== null);
        const hasSenkouB = chartData.some(d => d.senkouB !== null);
        
        console.log('   ✅ Ichimoku lines availability:');
        console.log(`     Tenkan-sen: ${hasTenkan ? '✅' : '❌'}`);
        console.log(`     Kijun-sen: ${hasKijun ? '✅' : '❌'}`);
        console.log(`     Senkou Span A: ${hasSenkouA ? '✅' : '❌'}`);
        console.log(`     Senkou Span B: ${hasSenkouB ? '✅' : '❌'}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Chạy test
testFrontendDisplay().then(() => {
  console.log('\n🏁 Test frontend component hoàn thành!');
}).catch(console.error);
