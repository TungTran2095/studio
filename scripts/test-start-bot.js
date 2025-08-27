#!/usr/bin/env node

/**
 * Script test để kiểm tra việc start bot
 */

require('dotenv').config();

console.log('🧪 Test start bot...\n');

async function testStartBot() {
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
    });
    
    // 3. Chọn bot để test start
    const testBot = bots[0];
    console.log(`\n3️⃣ Test start bot: ${testBot.name}`);
    console.log(`   ID: ${testBot.id}`);
    console.log(`   Status hiện tại: ${testBot.status}`);
    
    // 4. Nếu bot đang chạy, dừng trước
    if (testBot.status === 'running') {
      console.log('\n⚠️  Bot đang chạy, dừng trước...');
      
      const stopResponse = await fetch('http://localhost:3000/api/trading/bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: testBot.id, action: 'stop' })
      });
      
      if (!stopResponse.ok) {
        const errorData = await stopResponse.text();
        console.log('❌ Không thể dừng bot:', stopResponse.status, errorData);
        return;
      }
      
      console.log('✅ Đã dừng bot thành công');
      
      // Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 5. Test start bot
    console.log('\n🚀 Đang start bot...');
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
    
    // 6. Đợi một chút để bot có thời gian khởi động
    console.log('\n⏳ Đợi bot khởi động...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 7. Kiểm tra trạng thái bot sau khi start
    console.log('\n4️⃣ Kiểm tra trạng thái bot sau khi start...');
    const checkResponse = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    const updatedBots = await checkResponse.json();
    
    const updatedBot = updatedBots.find((bot) => bot.id === testBot.id);
    
    if (updatedBot) {
      console.log(`✅ Bot ${updatedBot.name}:`);
      console.log(`   Status: ${updatedBot.status}`);
      console.log(`   Updated at: ${updatedBot.updated_at}`);
      
      if (updatedBot.status === 'running') {
        console.log('🎉 Bot đã start thành công và đang chạy!');
      } else if (updatedBot.status === 'error') {
        console.log('❌ Bot gặp lỗi khi start');
        console.log('   Last error:', updatedBot.last_error);
      } else {
        console.log(`⚠️  Bot có trạng thái không mong đợi: ${updatedBot.status}`);
      }
    } else {
      console.log('❌ Không tìm thấy bot sau khi start');
    }
    
    // 8. Test stop bot
    console.log('\n🛑 Test stop bot...');
    const stopResponse2 = await fetch('http://localhost:3000/api/trading/bot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: testBot.id, action: 'stop' })
    });
    
    if (!stopResponse2.ok) {
      const errorData = await stopResponse2.text();
      console.log('❌ Không thể stop bot:', stopResponse2.status, errorData);
    } else {
      console.log('✅ Đã stop bot thành công');
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Chạy test
testStartBot().then(() => {
  console.log('\n🏁 Test hoàn thành!');
}).catch(console.error);
