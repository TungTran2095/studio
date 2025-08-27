#!/usr/bin/env node

/**
 * Script kiểm tra trực tiếp bot status từ Supabase
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Kiểm tra bot status từ Supabase...\n');

async function checkBotStatus() {
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
    
    // Lấy danh sách bot
    console.log('\n📋 Lấy danh sách bot...');
    const { data: bots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Lỗi khi lấy bots:', error.message);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('❌ Không có bot nào');
      return;
    }
    
    console.log(`✅ Tìm thấy ${bots.length} bots`);
    
    // Hiển thị thông tin từng bot
    bots.forEach((bot, index) => {
      console.log(`\n${index + 1}. Bot: ${bot.name}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Status: ${bot.status}`);
      console.log(`   Project ID: ${bot.project_id}`);
      console.log(`   Experiment ID: ${bot.experiment_id}`);
      
      if (bot.config) {
        console.log(`   Strategy: ${bot.config.strategy?.type || 'N/A'}`);
        console.log(`   Symbol: ${bot.config.symbol || 'N/A'}`);
        console.log(`   Timeframe: ${bot.config.timeframe || 'N/A'}`);
        
        if (bot.config.strategy?.parameters) {
          console.log(`   Strategy Parameters:`, bot.config.strategy.parameters);
        }
      }
      
      console.log(`   Created: ${new Date(bot.created_at).toLocaleString('vi-VN')}`);
      console.log(`   Updated: ${new Date(bot.updated_at).toLocaleString('vi-VN')}`);
    });
    
    // Kiểm tra bot đang running
    const runningBots = bots.filter(bot => bot.status === 'running');
    if (runningBots.length > 0) {
      console.log(`\n🚀 Có ${runningBots.length} bot đang running:`);
      runningBots.forEach(bot => {
        console.log(`   - ${bot.name} (${bot.id})`);
        console.log(`     Strategy: ${bot.config?.strategy?.type || 'N/A'}`);
        console.log(`     Timeframe: ${bot.config?.timeframe || 'N/A'}`);
        console.log(`     Symbol: ${bot.config?.symbol || 'N/A'}`);
      });
    } else {
      console.log('\n⏸️ Không có bot nào đang running');
    }
    
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Chạy check
checkBotStatus().then(() => {
  console.log('\n🏁 Kiểm tra hoàn thành!');
}).catch(console.error); 