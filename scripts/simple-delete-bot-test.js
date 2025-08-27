#!/usr/bin/env node

/**
 * Script test đơn giản để kiểm tra việc xóa bot
 */

require('dotenv').config();

console.log('🧪 Test delete bot đơn giản...\n');

async function testDeleteBot() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Thiếu Supabase credentials');
      return;
    }
    
    console.log('✅ Environment variables OK');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Lấy danh sách bot
    console.log('\n1️⃣ Lấy danh sách bot...');
    const { data: bots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(3);
    
    if (fetchError) {
      console.log('❌ Lỗi khi lấy danh sách bot:', fetchError.message);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('❌ Không có bot nào để test');
      return;
    }
    
    console.log(`✅ Tìm thấy ${bots.length} bots`);
    
    // Hiển thị thông tin bot
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
    });
    
    // 2. Chọn bot để test xóa
    const testBot = bots[0];
    console.log(`\n2️⃣ Test xóa bot: ${testBot.name}`);
    console.log(`   ID: ${testBot.id}`);
    console.log(`   Status: ${testBot.status}`);
    console.log(`   Created: ${testBot.created_at}`);
    
    // 3. Nếu bot đang chạy, dừng trước
    if (testBot.status === 'running') {
      console.log('\n⚠️  Bot đang chạy, dừng trước khi xóa...');
      
      const { error: updateError } = await supabase
        .from('trading_bots')
        .update({ 
          status: 'stopped',
          updated_at: new Date().toISOString()
        })
        .eq('id', testBot.id);
      
      if (updateError) {
        console.log('❌ Không thể dừng bot:', updateError.message);
        return;
      }
      
      console.log('✅ Đã dừng bot thành công');
    }
    
    // 4. Xóa bot
    console.log('\n🗑️  Đang xóa bot...');
    const { error: deleteError } = await supabase
      .from('trading_bots')
      .delete()
      .eq('id', testBot.id);
    
    if (deleteError) {
      console.log('❌ Lỗi khi xóa bot:', deleteError.message);
      console.log('💡 Có thể do:');
      console.log('   - Bot có foreign key constraints');
      console.log('   - Lỗi permission trong Supabase');
      console.log('   - Bot đang được sử dụng bởi process khác');
      return;
    }
    
    console.log('✅ Xóa bot thành công!');
    
    // 5. Kiểm tra xem bot đã bị xóa chưa
    console.log('\n3️⃣ Kiểm tra bot đã bị xóa...');
    const { data: checkBot, error: checkError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', testBot.id)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Bot đã bị xóa khỏi database');
    } else if (checkBot) {
      console.log('❌ Bot vẫn còn trong database');
    }
    
    // 6. Lấy danh sách bot sau khi xóa
    console.log('\n4️⃣ Danh sách bot sau khi xóa...');
    const { data: updatedBots } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(3);
    
    if (updatedBots && updatedBots.length > 0) {
      console.log(`✅ Còn lại ${updatedBots.length} bots`);
      updatedBots.forEach((bot, index) => {
        console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
      });
    } else {
      console.log('ℹ️  Không còn bot nào');
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Chạy test
testDeleteBot().then(() => {
  console.log('\n🏁 Test hoàn thành!');
}).catch(console.error);
