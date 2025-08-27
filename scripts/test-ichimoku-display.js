#!/usr/bin/env node

/**
 * Script test hiển thị Ichimoku strategy
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('🧪 Test hiển thị Ichimoku strategy...\n');

async function testIchimokuDisplay() {
  try {
    // Khởi tạo Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Thiếu Supabase credentials');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Kết nối Supabase thành công');
    
    // Lấy bot đang running
    console.log('\n📋 Lấy bot đang running...');
    const { data: runningBots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('status', 'running');
    
    if (error) {
      console.log('❌ Lỗi khi lấy running bots:', error.message);
      return;
    }
    
    if (!runningBots || runningBots.length === 0) {
      console.log('❌ Không có bot nào đang running');
      return;
    }
    
    const bot = runningBots[0];
    console.log(`✅ Tìm thấy bot: ${bot.name} (${bot.id})`);
    console.log(`   Strategy: ${bot.config?.config?.strategy?.type || 'N/A'}`);
    console.log(`   Timeframe: ${bot.config?.config?.trading?.timeframe || 'N/A'}`);
    console.log(`   Symbol: ${bot.config?.config?.trading?.symbol || 'N/A'}`);
    
    // Test API indicator-history
    console.log('\n🔍 Test API indicator-history...');
    try {
      const response = await fetch(`http://localhost:9002/api/trading/bot/indicator-history?botId=${bot.id}`);
      
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
      
      if (data.additionalData) {
        console.log('   Additional Data:');
        console.log(`     Current Price: $${data.additionalData.currentPrice?.toFixed(2) || 'N/A'}`);
        console.log(`     Tenkan-sen: $${data.additionalData.currentTenkan?.toFixed(2) || 'N/A'}`);
        console.log(`     Kijun-sen: $${data.additionalData.currentKijun?.toFixed(2) || 'N/A'}`);
        console.log(`     Senkou Span A: $${data.additionalData.currentSenkouA?.toFixed(2) || 'N/A'}`);
        console.log(`     Senkou Span B: $${data.additionalData.currentSenkouB?.toFixed(2) || 'N/A'}`);
      }
      
      // Kiểm tra dữ liệu history
      if (data.history && data.history.length > 0) {
        const last = data.history[data.history.length - 1];
        console.log('\n   📊 Last data point:');
        console.log(`     Time: ${new Date(Number(last.time)).toLocaleString('vi-VN')}`);
        console.log(`     Value: ${last.value}`);
        
        if (data.indicatorName === 'Ichimoku Cloud') {
          console.log(`     Tenkan: ${last.tenkan}`);
          console.log(`     Kijun: ${last.kijun}`);
          console.log(`     Senkou A: ${last.senkouA}`);
          console.log(`     Senkou B: ${last.senkouB}`);
        }
      }
      
    } catch (error) {
      console.log('❌ Lỗi khi gọi API:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Chạy test
testIchimokuDisplay().then(() => {
  console.log('\n🏁 Test hoàn thành!');
}).catch(console.error);

