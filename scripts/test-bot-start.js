#!/usr/bin/env node

/**
 * Script test khởi động bot và theo dõi quá trình
 * Giúp debug vấn đề bot bị dừng ngay lập tức
 */

require('dotenv').config();

const BOT_ID = 'f9e5f7b4-4160-4dae-8163-03e1f08276d1'; // Bot ID từ log trước đó

console.log('🚀 Test khởi động bot...\n');

async function testBotStart() {
  try {
    console.log('1️⃣ Khởi động bot...');
    
    const startResponse = await fetch(`http://localhost:3000/api/trading/bot/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        botId: BOT_ID
      })
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`Start bot failed: ${startResponse.status} - ${errorText}`);
    }

    const startResult = await startResponse.json();
    console.log('✅ Bot khởi động thành công:', startResult);

    // Đợi 2 giây để bot có thời gian chạy
    console.log('⏳ Đợi 2 giây để bot chạy...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Kiểm tra trạng thái bot
    console.log('2️⃣ Kiểm tra trạng thái bot...');
    
    const statusResponse = await fetch(`http://localhost:3000/api/trading/bot/status?botId=${BOT_ID}`);
    
    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`Check status failed: ${statusResponse.status} - ${errorText}`);
    }

    const statusResult = await statusResponse.json();
    console.log('📊 Trạng thái bot:', statusResult);

    // Kiểm tra logs gần đây
    console.log('3️⃣ Kiểm tra logs gần đây...');
    
    const logsResponse = await fetch(`http://localhost:3000/api/trading/bot/logs?botId=${BOT_ID}&limit=10`);
    
    if (logsResponse.ok) {
      const logsResult = await logsResponse.json();
      console.log('📝 Logs gần đây:', logsResult);
    } else {
      console.log('⚠️ Không thể lấy logs');
    }

    // Đợi thêm 5 giây để xem bot có bị dừng không
    console.log('⏳ Đợi 5 giây để theo dõi...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Kiểm tra trạng thái lần nữa
    console.log('4️⃣ Kiểm tra trạng thái bot lần nữa...');
    
    const finalStatusResponse = await fetch(`http://localhost:3000/api/trading/bot/status?botId=${BOT_ID}`);
    
    if (finalStatusResponse.ok) {
      const finalStatusResult = await finalStatusResponse.json();
      console.log('📊 Trạng thái cuối cùng:', finalStatusResult);
      
      if (finalStatusResult.status === 'stopped') {
        console.log('🚨 Bot đã bị dừng! Có thể do:');
        console.log('  - Lỗi trong quá trình khởi tạo');
        console.log('  - Lỗi kết nối API');
        console.log('  - Lỗi trong strategy execution');
        console.log('  - Race condition với database');
      }
    }

  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Kiểm tra xem server có chạy không
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server đang chạy');
      return true;
    }
  } catch (error) {
    console.log('❌ Server không chạy hoặc không thể kết nối');
    console.log('💡 Hãy chạy: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }

  await testBotStart();
  
  console.log('\n🏁 Test hoàn thành!');
}

main().catch(console.error);

