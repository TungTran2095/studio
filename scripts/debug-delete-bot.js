#!/usr/bin/env node

/**
 * Script debug để kiểm tra chi tiết việc xóa bot
 */

require('dotenv').config();

console.log('🔍 Debug delete bot...\n');

async function debugDeleteBot() {
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
    
    // 1. Kiểm tra xem có bot nào trong database không
    console.log('\n1️⃣ Kiểm tra bots trong database...');
    const { data: bots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*');
    
    if (fetchError) {
      console.log('❌ Lỗi khi lấy danh sách bot:', fetchError.message);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('✅ Không có bot nào trong database');
      return;
    }
    
    console.log(`📊 Tìm thấy ${bots.length} bots trong database:`);
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.name} (${bot.id}) - Status: ${bot.status}`);
    });
    
    // 2. Kiểm tra xem có bảng nào khác reference đến trading_bots không
    console.log('\n2️⃣ Kiểm tra foreign key references...');
    const possibleTables = [
      'bot_trades', 'bot_logs', 'bot_orders', 'bot_executions',
      'trading_sessions', 'bot_metrics', 'bot_performance',
      'bot_signals', 'bot_positions', 'bot_history',
      'experiments', 'projects', 'users'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { data: fkCheck, error: fkCheckError } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (!fkCheckError) {
          console.log(`   ✅ Bảng ${tableName} tồn tại`);
          
          // Thử xem có column nào reference đến trading_bots không
          try {
            const { data: fkColumns, error: fkColumnsError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!fkColumnsError && fkColumns && fkColumns.length > 0) {
              const columns = Object.keys(fkColumns[0]);
              const botRefColumns = columns.filter(col => 
                col.includes('bot') || col.includes('trading') || col.includes('id')
              );
              
              if (botRefColumns.length > 0) {
                console.log(`      Columns có thể reference: ${botRefColumns.join(', ')}`);
              }
            }
          } catch (error) {
            // Không thể kiểm tra columns
          }
        }
      } catch (error) {
        // Bảng không tồn tại
      }
    }
    
    // 3. Test xóa bot trực tiếp từ Supabase
    if (bots.length > 0) {
      const testBot = bots[0];
      console.log(`\n3️⃣ Test xóa bot trực tiếp: ${testBot.name}`);
      console.log(`   ID: ${testBot.id}`);
      console.log(`   Status: ${testBot.status}`);
      
      // Nếu bot đang chạy, dừng trước
      if (testBot.status === 'running') {
        console.log('⚠️  Bot đang chạy, dừng trước khi xóa...');
        
        const { error: updateError } = await supabase
          .from('trading_bots')
          .update({ 
            status: 'stopped',
            updated_at: new Date().toISOString()
          })
          .eq('id', testBot.id);
        
        if (updateError) {
          console.log('❌ Không thể dừng bot:', updateError.message);
          console.log('   Code:', updateError.code);
          console.log('   Details:', updateError.details);
          return;
        }
        
        console.log('✅ Đã dừng bot thành công');
      }
      
      // Thử xóa bot
      console.log('🗑️  Đang xóa bot...');
      const { error: deleteError } = await supabase
        .from('trading_bots')
        .delete()
        .eq('id', testBot.id);
      
      if (deleteError) {
        console.log('❌ Lỗi khi xóa bot:', deleteError.message);
        console.log('   Code:', deleteError.code);
        console.log('   Details:', deleteError.details);
        
        // Kiểm tra xem có phải foreign key constraint không
        if (deleteError.code === '23503') {
          console.log('💡 Đây là foreign key constraint error');
          console.log('   Bot có thể được reference bởi bảng khác');
          
          // Tìm xem bảng nào đang reference
          console.log('\n🔍 Tìm bảng đang reference...');
          for (const tableName of possibleTables) {
            try {
              const { data: refCheck, error: refCheckError } = await supabase
                .from(tableName)
                .select('*')
                .eq('bot_id', testBot.id)
                .limit(1);
              
              if (!refCheckError && refCheck && refCheck.length > 0) {
                console.log(`   ✅ Bảng ${tableName} có reference đến bot ${testBot.id}`);
                console.log(`      Số records: ${refCheck.length}`);
              }
            } catch (error) {
              // Không thể kiểm tra
            }
          }
        }
        
        // Kiểm tra xem có phải RLS error không
        if (deleteError.code === '42501') {
          console.log('💡 Đây là permission error (có thể do RLS)');
        }
        
        return;
      }
      
      console.log('✅ Xóa bot thành công!');
      
      // Kiểm tra xem bot đã bị xóa chưa
      console.log('\n4️⃣ Kiểm tra bot đã bị xóa...');
      const { data: checkBot, error: checkError } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('id', testBot.id)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log('✅ Bot đã bị xóa khỏi database');
      } else if (checkBot) {
        console.log('❌ Bot vẫn còn trong database');
        console.log('   Đây là vấn đề nghiêm trọng!');
      }
      
      // Lấy danh sách bot sau khi xóa
      const { data: updatedBots } = await supabase
        .from('trading_bots')
        .select('*');
      
      console.log(`\n📊 Còn lại ${updatedBots ? updatedBots.length : 0} bots trong database`);
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình debug:', error.message);
  }
}

// Chạy debug
debugDeleteBot().then(() => {
  console.log('\n🏁 Debug hoàn thành!');
}).catch(console.error);
