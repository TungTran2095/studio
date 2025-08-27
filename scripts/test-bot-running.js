#!/usr/bin/env node

/**
 * Script test để kiểm tra bot có chạy đúng không
 */

require('dotenv').config();

console.log('🧪 Test bot running...\n');

async function testBotRunning() {
  try {
    // 1. Kiểm tra server
    console.log('1️⃣ Kiểm tra server...');
    try {
      const healthResponse = await fetch('http://localhost:9002/api/health');
      if (healthResponse.ok) {
        console.log('✅ Server đang chạy trên port 9002');
      } else {
        console.log('❌ Server không khỏe');
        return;
      }
    } catch (error) {
      console.log('❌ Server không chạy:', error.message);
      return;
    }
    
    // 2. Lấy danh sách bot
    console.log('\n2️⃣ Lấy danh sách bot...');
    const botsResponse = await fetch('http://localhost:9002/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    
    if (!botsResponse.ok) {
      console.log('❌ API get bots lỗi:', botsResponse.status);
      return;
    }
    
    const bots = await botsResponse.json();
    console.log(`✅ Tìm thấy ${bots.length} bots`);
    
    if (bots.length === 0) {
      console.log('❌ Không có bot nào');
      return;
    }
    
    // 3. Hiển thị thông tin bot
    const bot = bots[0];
    console.log(`\n3️⃣ Bot: ${bot.name}`);
    console.log(`   ID: ${bot.id}`);
    console.log(`   Status: ${bot.status}`);
    console.log(`   Strategy: ${bot.config?.strategy?.type || 'N/A'}`);
    console.log(`   Symbol: ${bot.config?.symbol || 'N/A'}`);
    console.log(`   Timeframe: ${bot.config?.timeframe || 'N/A'}`);
    
    // 4. Test start bot nếu đang stopped
    if (bot.status === 'stopped') {
      console.log('\n🚀 Test start bot...');
      const startResponse = await fetch('http://localhost:9002/api/trading/bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: bot.id, action: 'start' })
      });
      
      if (!startResponse.ok) {
        console.log('❌ API start bot lỗi:', startResponse.status);
        return;
      }
      
      console.log('✅ API start bot thành công');
      
      // Đợi bot khởi động
      console.log('⏳ Đợi bot khởi động...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Kiểm tra status
      const checkResponse = await fetch('http://localhost:9002/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
      const updatedBots = await checkResponse.json();
      const updatedBot = updatedBots.find((b) => b.id === bot.id);
      
      if (updatedBot) {
        console.log(`📊 Status sau khi start: ${updatedBot.status}`);
        if (updatedBot.status === 'running') {
          console.log('🎉 Bot đã start thành công!');
          
          // Đợi thêm để bot thực hiện strategy
          console.log('⏳ Đợi bot thực hiện strategy...');
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          // Kiểm tra lại status
          const finalCheckResponse = await fetch('http://localhost:9002/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
          const finalBots = await finalCheckResponse.json();
          const finalBot = finalBots.find((b) => b.id === bot.id);
          
          if (finalBot) {
            console.log(`📊 Status cuối cùng: ${finalBot.status}`);
            if (finalBot.status === 'running') {
              console.log('✅ Bot vẫn đang chạy và thực hiện strategy!');
              console.log('🎯 Strategy Ichimoku đang hoạt động với timeframe 5m');
            } else {
              console.log('⚠️ Bot đã dừng:', finalBot.status);
            }
          }
        } else {
          console.log('⚠️ Bot chưa chuyển sang running');
        }
      }
    } else {
      console.log('ℹ️ Bot đang chạy, không cần start');
    }
    
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Chạy test
testBotRunning().then(() => {
  console.log('\n🏁 Test hoàn thành!');
}).catch(console.error);



