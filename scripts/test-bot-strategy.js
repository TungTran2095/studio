#!/usr/bin/env node

/**
 * Script test để kiểm tra bot strategy hoạt động
 */

require('dotenv').config();

console.log('🧪 Test bot strategy...\n');

async function testBotStrategy() {
  try {
    // 1. Kiểm tra xem server có chạy không
    console.log('1️⃣ Kiểm tra server...');
    let serverRunning = false;
    
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        console.log('✅ Server đang chạy');
        serverRunning = true;
      }
    } catch (error) {
      console.log('❌ Server không chạy:', error.message);
      console.log('💡 Hãy chạy: npm run dev');
      return;
    }
    
    if (!serverRunning) {
      console.log('❌ Server không chạy');
      return;
    }
    
    // 2. Lấy danh sách bot từ API
    console.log('\n2️⃣ Lấy danh sách bot từ API...');
    const botsResponse = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    
    if (!botsResponse.ok) {
      const errorData = await botsResponse.text();
      console.log('❌ API get bots lỗi:', botsResponse.status, errorData);
      return;
    }
    
    const bots = await botsResponse.json();
    
    if (!bots || bots.length === 0) {
      console.log('❌ Không có bot nào để test');
      return;
    }
    
    console.log(`✅ Tìm thấy ${bots.length} bots từ API`);
    
    // Hiển thị thông tin bot
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
      console.log(`      Strategy: ${bot.config?.strategy?.type || 'N/A'}`);
      console.log(`      Symbol: ${bot.config?.symbol || 'N/A'}`);
      console.log(`      Timeframe: ${bot.config?.timeframe || 'N/A'}`);
    });
    
    // 3. Chọn bot để test
    const testBot = bots[0];
    console.log(`\n3️⃣ Test bot: ${testBot.name}`);
    console.log(`   ID: ${testBot.id}`);
    console.log(`   Status: ${testBot.status}`);
    console.log(`   Strategy: ${testBot.config?.strategy?.type || 'N/A'}`);
    
    // 4. Test start bot nếu đang stopped
    if (testBot.status !== 'running') {
      console.log('\n🚀 Test start bot...');
      const startResponse = await fetch('http://localhost:3000/api/trading/bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: testBot.id, action: 'start' })
      });
      
      if (!startResponse.ok) {
        const errorData = await startResponse.text();
        console.log('❌ API start bot lỗi:', startResponse.status, errorData);
        return;
      }
      
      const startResult = await startResponse.json();
      console.log('✅ API start bot thành công:', startResult);
      
      // Đợi một chút để bot khởi động
      console.log('⏳ Đợi bot khởi động...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Kiểm tra status sau khi start
      const checkResponse = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
      const updatedBots = await checkResponse.json();
      const updatedBot = updatedBots.find((bot) => bot.id === testBot.id);
      
      if (updatedBot) {
        console.log(`📊 Status sau khi start: ${updatedBot.status}`);
        if (updatedBot.status === 'running') {
          console.log('🎉 Bot đã start thành công!');
          
          // Đợi thêm để bot thực hiện strategy
          console.log('⏳ Đợi bot thực hiện strategy...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Kiểm tra lại status
          const finalCheckResponse = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
          const finalBots = await finalCheckResponse.json();
          const finalBot = finalBots.find((bot) => bot.id === testBot.id);
          
          if (finalBot) {
            console.log(`📊 Status cuối cùng: ${finalBot.status}`);
            if (finalBot.status === 'running') {
              console.log('✅ Bot vẫn đang chạy và thực hiện strategy!');
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
    
    // 5. Test stop bot
    console.log('\n🛑 Test stop bot...');
    const stopResponse = await fetch('http://localhost:3000/api/trading/bot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: testBot.id, action: 'stop' })
    });
    
    if (!stopResponse.ok) {
      const errorData = await stopResponse.text();
      console.log('❌ API stop bot lỗi:', stopResponse.status, errorData);
    } else {
      console.log('✅ API stop bot thành công');
      
      // Đợi một chút để bot dừng
      console.log('⏳ Đợi bot dừng...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kiểm tra status sau khi stop
      const checkResponse2 = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
      const updatedBots2 = await checkResponse2.json();
      const updatedBot2 = updatedBots2.find((bot) => bot.id === testBot.id);
      
      if (updatedBot2) {
        console.log(`📊 Status sau khi stop: ${updatedBot2.status}`);
        if (updatedBot2.status === 'stopped') {
          console.log('🎉 Bot đã stop thành công!');
        } else {
          console.log('⚠️ Bot chưa chuyển sang stopped');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Chạy test
testBotStrategy().then(() => {
  console.log('\n🏁 Test hoàn thành!');
}).catch(console.error);




