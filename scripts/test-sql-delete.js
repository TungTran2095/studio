#!/usr/bin/env node

/**
 * Script test SQL delete trực tiếp để bypass Supabase client
 */

require('dotenv').config();

console.log('🔍 Test SQL delete trực tiếp...\n');

async function testSQLDelete() {
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
    
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('*');
    
    if (botsError || !bots || bots.length === 0) {
      console.log('❌ Không có bot nào để xóa');
      return;
    }
    
    console.log(`✅ Tìm thấy ${bots.length} bots`);
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
    });
    
    const testBot = bots[0];
    console.log(`\n🎯 Sẽ xóa bot: ${testBot.name} (${testBot.id})`);
    
    // 2. Test SQL delete trực tiếp
    console.log('\n2️⃣ Test SQL delete trực tiếp...');
    
    try {
      console.log(`   Đang xóa bot ${testBot.name} bằng SQL...`);
      
      // Sử dụng rpc để thực thi SQL trực tiếp
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: `DELETE FROM trading_bots WHERE id = '${testBot.id}' RETURNING id;`
      });
      
      if (sqlError) {
        console.log('❌ Lỗi khi thực thi SQL:');
        console.log(`   Message: ${sqlError.message}`);
        console.log(`   Details: ${sqlError.details}`);
        
        // Thử cách khác - sử dụng raw query
        console.log('\n   Thử raw query...');
        
        const { data: rawResult, error: rawError } = await supabase
          .from('trading_bots')
          .delete()
          .eq('id', testBot.id)
          .select('id');
        
        if (rawError) {
          console.log('❌ Lỗi raw query:');
          console.log(`   Code: ${rawError.code}`);
          console.log(`   Message: ${rawError.message}`);
          console.log(`   Details: ${rawError.details}`);
        } else {
          console.log('✅ Raw query thành công');
          console.log(`   Result: ${JSON.stringify(rawResult)}`);
        }
      } else {
        console.log('✅ SQL delete thành công');
        console.log(`   Result: ${JSON.stringify(sqlResult)}`);
      }
      
    } catch (error) {
      console.log('❌ Lỗi trong quá trình SQL delete:', error.message);
    }
    
    // 3. Kiểm tra xem bot đã bị xóa chưa
    console.log('\n3️⃣ Kiểm tra bot đã bị xóa...');
    
    try {
      const { data: checkBot, error: checkError } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('id', testBot.id)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log('✅ Bot đã bị xóa khỏi database!');
      } else if (checkBot) {
        console.log('❌ Bot vẫn còn trong database sau khi xóa!');
        console.log('   🚨 Đây là vấn đề nghiêm trọng về data integrity!');
        console.log('   💡 Có thể do:');
        console.log('      - Database trigger rollback');
        console.log('      - RLS policy rollback');
        console.log('      - Database constraint rollback');
        console.log('      - Transaction rollback');
      }
    } catch (error) {
      console.log('❌ Lỗi khi kiểm tra bot:', error.message);
    }
    
    // 4. Kiểm tra danh sách bot sau khi xóa
    console.log('\n4️⃣ Kiểm tra danh sách bot sau khi xóa...');
    
    const { data: remainingBots, error: remainingError } = await supabase
      .from('trading_bots')
      .select('*');
    
    if (!remainingError && remainingBots) {
      console.log(`📊 Còn lại ${remainingBots.length} bots trong database`);
      
      if (remainingBots.length > 0) {
        remainingBots.forEach((bot, index) => {
          console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
        });
      }
    }
    
    // 5. Thử xóa bằng cách khác
    console.log('\n5️⃣ Thử xóa bằng cách khác...');
    
    try {
      console.log('   Thử xóa bằng update status trước...');
      
      // Cập nhật status thành 'deleted' trước
      const { error: updateError } = await supabase
        .from('trading_bots')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', testBot.id);
      
      if (updateError) {
        console.log('❌ Không thể update status:', updateError.message);
      } else {
        console.log('✅ Đã update status thành deleted');
        
        // Sau đó thử xóa
        const { error: deleteError } = await supabase
          .from('trading_bots')
          .delete()
          .eq('id', testBot.id);
        
        if (deleteError) {
          console.log('❌ Vẫn không thể xóa:', deleteError.message);
        } else {
          console.log('✅ Xóa thành công sau khi update status');
        }
      }
      
    } catch (error) {
      console.log('❌ Lỗi trong quá trình thử cách khác:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình test SQL delete:', error.message);
  }
}

// Chạy test
testSQLDelete().then(() => {
  console.log('\n🏁 Test SQL delete hoàn thành!');
}).catch(console.error);


