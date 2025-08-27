#!/usr/bin/env node

/**
 * Script test API delete với kiểm tra chi tiết
 */

require('dotenv').config();

console.log('🧪 Test API delete với kiểm tra chi tiết...\n');

async function testAPIDeleteWithCheck() {
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
    
    // 3. Chọn bot để test xóa
    const testBot = bots[0];
    console.log(`\n3️⃣ Test xóa bot: ${testBot.name}`);
    console.log(`   ID: ${testBot.id}`);
    console.log(`   Status: ${testBot.status}`);
    
    // 4. Nếu bot đang chạy, dừng trước
    if (testBot.status === 'running') {
      console.log('\n⚠️  Bot đang chạy, dừng trước khi xóa...');
      
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
    
    // 5. Test xóa bot qua API
    console.log('\n🗑️  Đang xóa bot qua API...');
    const deleteResponse = await fetch(`http://localhost:3000/api/trading/bot?botId=${testBot.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.text();
      console.log('❌ API delete bot lỗi:', deleteResponse.status, errorData);
      return;
    }
    
    const deleteResult = await deleteResponse.json();
    console.log('✅ API delete bot response:', deleteResult);
    
    // 6. Kiểm tra xem bot đã bị xóa chưa
    console.log('\n4️⃣ Kiểm tra bot đã bị xóa...');
    const checkResponse = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    const updatedBots = await checkResponse.json();
    
    const botStillExists = updatedBots.some((bot) => bot.id === testBot.id);
    
    if (botStillExists) {
      console.log('❌ Bot vẫn còn trong danh sách API');
      console.log('💡 Có thể do:');
      console.log('   - API delete không hoạt động đúng');
      console.log('   - Bot có foreign key constraints');
      console.log('   - Lỗi permission trong Supabase');
      console.log('   - Database trigger rollback');
    } else {
      console.log('✅ Bot đã bị xóa khỏi danh sách API');
    }
    
    // 7. Hiển thị danh sách bot sau khi xóa
    console.log('\n5️⃣ Danh sách bot sau khi xóa...');
    if (updatedBots && updatedBots.length > 0) {
      console.log(`✅ Còn lại ${updatedBots.length} bots`);
      updatedBots.forEach((bot, index) => {
        console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
      });
    } else {
      console.log('ℹ️  Không còn bot nào');
    }
    
    // 8. Kiểm tra trực tiếp từ Supabase
    console.log('\n6️⃣ Kiểm tra trực tiếp từ Supabase...');
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: directCheck, error: directCheckError } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('id', testBot.id)
        .single();
      
      if (directCheckError && directCheckError.code === 'PGRST116') {
        console.log('✅ Bot đã bị xóa khỏi database (kiểm tra trực tiếp)');
      } else if (directCheck) {
        console.log('❌ Bot vẫn còn trong database (kiểm tra trực tiếp)');
        console.log('   Đây là vấn đề nghiêm trọng!');
      } else {
        console.log('ℹ️  Không thể kiểm tra trực tiếp');
      }
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Chạy test
testAPIDeleteWithCheck().then(() => {
  console.log('\n🏁 Test hoàn thành!');
}).catch(console.error);
