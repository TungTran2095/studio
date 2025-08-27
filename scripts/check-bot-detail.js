#!/usr/bin/env node

/**
 * Script kiểm tra chi tiết bot config
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Kiểm tra chi tiết bot config...\n');

async function checkBotDetail() {
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
    
    console.log(`✅ Tìm thấy ${runningBots.length} bot đang running`);
    
    // Hiển thị chi tiết từng bot
    runningBots.forEach((bot, index) => {
      console.log(`\n${index + 1}. Bot: ${bot.name}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Status: ${bot.status}`);
      console.log(`   Project ID: ${bot.project_id}`);
      console.log(`   Experiment ID: ${bot.experiment_id}`);
      
      // Hiển thị toàn bộ config
      console.log('\n   📋 Config chi tiết:');
      if (bot.config) {
        console.log('   Raw config:', JSON.stringify(bot.config, null, 2));
        
        // Parse config structure
        if (bot.config.strategy) {
          console.log(`   Strategy Type: ${bot.config.strategy.type}`);
          console.log(`   Strategy Parameters:`, bot.config.strategy.parameters);
        }
        
        if (bot.config.trading) {
          console.log(`   Symbol: ${bot.config.trading.symbol}`);
          console.log(`   Timeframe: ${bot.config.trading.timeframe}`);
          console.log(`   Position Size: ${bot.config.trading.positionSize}`);
          console.log(`   Initial Capital: ${bot.config.trading.initialCapital}`);
        }
        
        if (bot.config.riskManagement) {
          console.log(`   Stop Loss: ${bot.config.riskManagement.stopLoss}%`);
          console.log(`   Take Profit: ${bot.config.riskManagement.takeProfit}%`);
          console.log(`   Max Drawdown: ${bot.config.riskManagement.maxDrawdown}%`);
        }
      } else {
        console.log('   ❌ Không có config');
      }
      
      console.log(`   Created: ${new Date(bot.created_at).toLocaleString('vi-VN')}`);
      console.log(`   Updated: ${new Date(bot.updated_at).toLocaleString('vi-VN')}`);
    });
    
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Chạy check
checkBotDetail().then(() => {
  console.log('\n🏁 Kiểm tra chi tiết hoàn thành!');
}).catch(console.error);

