#!/usr/bin/env node

/**
 * Script test để kiểm tra việc xóa bot
 * Test cả frontend function và backend API
 */

require('dotenv').config();

console.log('🧪 Test delete bot...\n');

// Test frontend function deleteTradingBot
async function testFrontendDelete() {
  console.log('1️⃣ Test frontend deleteTradingBot function...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Thiếu Supabase credentials');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Lấy danh sách bot
    const { data: bots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.log('❌ Lỗi khi lấy danh sách bot:', fetchError.message);
      return false;
    }
    
    if (!bots || bots.length === 0) {
      console.log('❌ Không có bot nào để test');
      return false;
    }
    
    console.log(`📊 Tìm thấy ${bots.length} bots`);
    
    // Chọn bot đầu tiên để test xóa
    const testBot = bots[0];
    console.log(`🔍 Test bot: ${testBot.name} (ID: ${testBot.id})`);
    console.log(`   Status: ${testBot.status}`);
    console.log(`   Created: ${testBot.created_at}`);
    
    // Kiểm tra xem bot có đang chạy không
    if (testBot.status === 'running') {
      console.log('⚠️  Bot đang chạy, cần dừng trước khi xóa');
      
      // Cập nhật status thành stopped
      const { error: updateError } = await supabase
        .from('trading_bots')
        .update({ 
          status: 'stopped',
          updated_at: new Date().toISOString()
        })
        .eq('id', testBot.id);
      
      if (updateError) {
        console.log('❌ Không thể dừng bot:', updateError.message);
        return false;
      }
      
      console.log('✅ Đã dừng bot thành công');
    }
    
    // Test xóa bot
    console.log('🗑️  Đang xóa bot...');
    const { error: deleteError } = await supabase
      .from('trading_bots')
      .delete()
      .eq('id', testBot.id);
    
    if (deleteError) {
      console.log('❌ Lỗi khi xóa bot:', deleteError.message);
      return false;
    }
    
    console.log('✅ Xóa bot thành công!');
    
    // Kiểm tra xem bot đã bị xóa chưa
    const { data: checkBot, error: checkError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', testBot.id)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Bot đã bị xóa khỏi database');
      return true;
    } else if (checkBot) {
      console.log('❌ Bot vẫn còn trong database');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test frontend delete:', error.message);
    return false;
  }
}

// Test backend API delete
async function testBackendDelete() {
  console.log('\n2️⃣ Test backend DELETE API...');
  
  try {
    // Lấy danh sách bot từ API
    const response = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log('❌ API get bots lỗi:', response.status, errorData);
      return false;
    }
    
    const bots = await response.json();
    
    if (!bots || bots.length === 0) {
      console.log('❌ Không có bot nào để test');
      return false;
    }
    
    console.log(`📊 Tìm thấy ${bots.length} bots từ API`);
    
    // Chọn bot đầu tiên để test
    const testBot = bots[0];
    console.log(`🔍 Test bot: ${testBot.name} (ID: ${testBot.id})`);
    console.log(`   Status: ${testBot.status}`);
    
    // Kiểm tra xem bot có đang chạy không
    if (testBot.status === 'running') {
      console.log('⚠️  Bot đang chạy, cần dừng trước khi xóa');
      
      // Dừng bot trước
      const stopResponse = await fetch('http://localhost:3000/api/trading/bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: testBot.id, action: 'stop' })
      });
      
      if (!stopResponse.ok) {
        console.log('❌ Không thể dừng bot');
        return false;
      }
      
      console.log('✅ Đã dừng bot thành công');
      
      // Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test xóa bot qua API
    console.log('🗑️  Đang xóa bot qua API...');
    const deleteResponse = await fetch(`http://localhost:3000/api/trading/bot?botId=${testBot.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.text();
      console.log('❌ API delete bot lỗi:', deleteResponse.status, errorData);
      return false;
    }
    
    const deleteResult = await deleteResponse.json();
    console.log('✅ API delete bot thành công:', deleteResult);
    
    // Kiểm tra xem bot đã bị xóa chưa
    const checkResponse = await fetch('http://localhost:3000/api/trading/bot?projectId=b42d7da9-9663-4d9a-a9c2-56abc10a1686');
    const updatedBots = await checkResponse.json();
    
    const botStillExists = updatedBots.some((bot: any) => bot.id === testBot.id);
    
    if (botStillExists) {
      console.log('❌ Bot vẫn còn trong danh sách API');
      return false;
    } else {
      console.log('✅ Bot đã bị xóa khỏi danh sách API');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test backend delete:', error.message);
    return false;
  }
}

// Test xóa bot đang chạy
async function testDeleteRunningBot() {
  console.log('\n3️⃣ Test xóa bot đang chạy...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Thiếu Supabase credentials');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Tìm bot đang chạy
    const { data: runningBots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('status', 'running')
      .limit(1);
    
    if (fetchError) {
      console.log('❌ Lỗi khi tìm bot đang chạy:', fetchError.message);
      return false;
    }
    
    if (!runningBots || runningBots.length === 0) {
      console.log('ℹ️  Không có bot nào đang chạy');
      return true;
    }
    
    const runningBot = runningBots[0];
    console.log(`🔍 Tìm thấy bot đang chạy: ${runningBot.name} (ID: ${runningBot.id})`);
    
    // Thử xóa bot đang chạy
    console.log('🗑️  Thử xóa bot đang chạy...');
    const { error: deleteError } = await supabase
      .from('trading_bots')
      .delete()
      .eq('id', runningBot.id);
    
    if (deleteError) {
      console.log('❌ Không thể xóa bot đang chạy:', deleteError.message);
      console.log('💡 Cần dừng bot trước khi xóa');
      return false;
    } else {
      console.log('✅ Xóa bot đang chạy thành công!');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test xóa bot đang chạy:', error.message);
    return false;
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
  console.log('🔍 Kiểm tra môi trường...');
  
  // Kiểm tra environment variables
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      console.log(`✅ ${key}: ${value.slice(0, 20)}...${value.slice(-10)}`);
    } else {
      console.log(`❌ ${key}: MISSING`);
    }
  });
  
  console.log('');
  
  // Test frontend delete
  const frontendResult = await testFrontendDelete();
  
  // Test backend delete (nếu server chạy)
  let backendResult = false;
  const serverRunning = await checkServerHealth();
  if (serverRunning) {
    backendResult = await testBackendDelete();
  }
  
  // Test xóa bot đang chạy
  const runningBotResult = await testDeleteRunningBot();
  
  console.log('\n🏁 Test hoàn thành!');
  console.log('\n📊 Kết quả:');
  console.log(`  Frontend delete: ${frontendResult ? '✅ Thành công' : '❌ Thất bại'}`);
  console.log(`  Backend delete: ${backendResult ? '✅ Thành công' : '❌ Thất bại'}`);
  console.log(`  Delete running bot: ${runningBotResult ? '✅ Thành công' : '❌ Thất bại'}`);
  
  if (!frontendResult || !backendResult) {
    console.log('\n💡 Các vấn đề có thể gặp:');
    console.log('1. Bot đang chạy và không thể xóa trực tiếp');
    console.log('2. Lỗi database connection');
    console.log('3. Lỗi permission trong Supabase');
    console.log('4. Bot có foreign key constraints');
    
    console.log('\n🔧 Giải pháp:');
    console.log('1. Dừng bot trước khi xóa');
    console.log('2. Kiểm tra database connection');
    console.log('3. Kiểm tra Supabase policies');
    console.log('4. Xóa các records liên quan trước');
  }
}

main().catch(console.error);
