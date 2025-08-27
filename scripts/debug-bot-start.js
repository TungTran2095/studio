#!/usr/bin/env node

/**
 * Script debug khởi động bot từng bước
 * Giúp xác định chính xác vấn đề ở đâu
 */

require('dotenv').config();

const BOT_ID = 'f9e5f7b4-4160-4dae-8163-03e1f08276d1';

console.log('🐛 Debug khởi động bot...\n');

async function debugBotStart() {
  try {
    console.log('1️⃣ Kiểm tra server health...');
    
    // Kiểm tra server có chạy không
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        console.log('✅ Server đang chạy');
      } else {
        console.log('⚠️ Server response không ổn:', healthResponse.status);
      }
    } catch (error) {
      console.log('❌ Không thể kết nối server:', error.message);
      console.log('💡 Hãy chạy: npm run dev');
      return;
    }

    console.log('\n2️⃣ Kiểm tra bot status hiện tại...');
    
    try {
      const statusResponse = await fetch(`http://localhost:3000/api/trading/bot/status?botId=${BOT_ID}`);
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        console.log('📊 Bot status:', statusResult);
      } else {
        console.log('⚠️ Không thể lấy bot status:', statusResponse.status);
      }
    } catch (error) {
      console.log('❌ Lỗi khi lấy bot status:', error.message);
    }

    console.log('\n3️⃣ Test API endpoint account...');
    
    try {
      // Test endpoint account với dữ liệu giả
      const accountResponse = await fetch('http://localhost:3000/api/trading/binance/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'test_key',
          apiSecret: 'test_secret',
          testnet: true
        })
      });
      
      if (accountResponse.ok) {
        console.log('✅ API account endpoint hoạt động');
      } else {
        const errorText = await accountResponse.text();
        console.log('❌ API account endpoint lỗi:', accountResponse.status, errorText);
      }
    } catch (error) {
      console.log('❌ Lỗi khi test API account:', error.message);
    }

    console.log('\n4️⃣ Khởi động bot...');
    
    try {
      const startResponse = await fetch(`http://localhost:3000/api/trading/bot/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: BOT_ID
        })
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        console.log('❌ Khởi động bot thất bại:', startResponse.status, errorText);
        return;
      }

      const startResult = await startResponse.json();
      console.log('✅ Bot khởi động thành công:', startResult);

      // Đợi và kiểm tra trạng thái
      console.log('\n5️⃣ Theo dõi trạng thái bot...');
      
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusResponse = await fetch(`http://localhost:3000/api/trading/bot/status?botId=${BOT_ID}`);
          if (statusResponse.ok) {
            const statusResult = await statusResponse.json();
            console.log(`⏱️ Lần ${i}: Status = ${statusResult.status}`);
            
            if (statusResult.status === 'stopped') {
              console.log('🚨 Bot đã bị dừng!');
              break;
            }
          }
        } catch (error) {
          console.log(`❌ Lỗi lần ${i}:`, error.message);
        }
      }

    } catch (error) {
      console.log('❌ Lỗi khi khởi động bot:', error.message);
    }

  } catch (error) {
    console.error('❌ Lỗi tổng quát:', error.message);
  }
}

console.log('💡 Hướng dẫn:');
console.log('1. Đảm bảo server đang chạy: npm run dev');
console.log('2. Chạy script này để debug');
console.log('3. Kiểm tra logs trong terminal server\n');

debugBotStart().then(() => {
  console.log('\n🏁 Debug hoàn thành!');
}).catch(console.error);
