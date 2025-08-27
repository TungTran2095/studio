#!/usr/bin/env node

/**
 * Script force delete bot bằng cách xóa tất cả references trước
 */

require('dotenv').config();

console.log('🗑️  Force delete bot...\n');

async function forceDeleteBot() {
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
    
    // 2. Kiểm tra và xóa tất cả references
    console.log('\n2️⃣ Kiểm tra và xóa tất cả references...');
    
    const possibleReferenceTables = [
      'trades', 'orders', 'bot_logs', 'bot_metrics',
      'bot_performance', 'bot_signals', 'bot_positions', 'bot_history',
      'trading_sessions', 'bot_executions', 'bot_analytics'
    ];
    
    for (const tableName of possibleReferenceTables) {
      try {
        console.log(`   Kiểm tra bảng ${tableName}...`);
        
        // Kiểm tra xem bảng có tồn tại không
        const { data: tableCheck, error: tableError } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (tableError) {
          console.log(`      ❌ Bảng ${tableName} không tồn tại`);
          continue;
        }
        
        console.log(`      ✅ Bảng ${tableName} tồn tại`);
        
        // Kiểm tra cấu trúc bảng
        const { data: tableStructure, error: structureError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (structureError || !tableStructure || tableStructure.length === 0) {
          console.log(`      ℹ️  Không thể kiểm tra cấu trúc bảng ${tableName}`);
          continue;
        }
        
        const columns = Object.keys(tableStructure[0]);
        const botRefColumns = columns.filter(col => 
          col.includes('bot') || col.includes('trading') || 
          col.includes('_id') || col.includes('bot_id') ||
          col.includes('trading_bot')
        );
        
        if (botRefColumns.length > 0) {
          console.log(`      🔍 Tìm thấy bot reference columns: ${botRefColumns.join(', ')}`);
          
          // Xóa tất cả records reference đến bot này
          for (const col of botRefColumns) {
            try {
              const { data: refData, error: refError } = await supabase
                .from(tableName)
                .select('*')
                .eq(col, testBot.id)
                .limit(10);
              
              if (!refError && refData && refData.length > 0) {
                console.log(`         🚨 Tìm thấy ${refData.length} records reference đến bot qua column ${col}`);
                
                // Xóa tất cả records này
                const { error: deleteRefError } = await supabase
                  .from(tableName)
                  .delete()
                  .eq(col, testBot.id);
                
                if (deleteRefError) {
                  console.log(`         ❌ Không thể xóa references: ${deleteRefError.message}`);
                } else {
                  console.log(`         ✅ Đã xóa ${refData.length} references`);
                }
              }
            } catch (error) {
              console.log(`         ⚠️  Không thể kiểm tra column ${col}: ${error.message}`);
            }
          }
        } else {
          console.log(`      ℹ️  Không có bot reference columns`);
        }
        
      } catch (error) {
        console.log(`   ❌ Lỗi khi kiểm tra bảng ${tableName}: ${error.message}`);
      }
    }
    
    // 3. Force delete bot
    console.log('\n3️⃣ Force delete bot...');
    
    try {
      console.log(`   Đang xóa bot ${testBot.name}...`);
      
      // Kiểm tra trước khi xóa
      const { data: beforeDelete, error: beforeError } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('id', testBot.id)
        .single();
      
      if (beforeDelete) {
        console.log(`   ✅ Bot tồn tại trước khi xóa: ${beforeDelete.name}`);
      }
      
      // Thực hiện xóa
      const { error: deleteError } = await supabase
        .from('trading_bots')
        .delete()
        .eq('id', testBot.id);
      
      if (deleteError) {
        console.log('❌ Lỗi khi xóa bot:');
        console.log(`   Code: ${deleteError.code}`);
        console.log(`   Message: ${deleteError.message}`);
        console.log(`   Details: ${deleteError.details}`);
        console.log(`   Hint: ${deleteError.hint}`);
        
        if (deleteError.code === '23503') {
          console.log('💡 Đây là foreign key constraint error!');
          console.log('   Cần xóa tất cả references trước');
        }
      } else {
        console.log('✅ Xóa bot thành công (không có lỗi)');
        
        // Kiểm tra xem bot đã bị xóa chưa
        console.log('   Kiểm tra bot đã bị xóa...');
        const { data: afterDelete, error: afterError } = await supabase
          .from('trading_bots')
          .select('*')
          .eq('id', testBot.id)
          .single();
        
        if (afterError && afterError.code === 'PGRST116') {
          console.log('✅ Bot đã bị xóa khỏi database!');
        } else if (afterDelete) {
          console.log('❌ Bot vẫn còn trong database sau khi xóa!');
          console.log('   🚨 Đây là vấn đề nghiêm trọng về data integrity!');
          console.log('   💡 Có thể cần kiểm tra database triggers hoặc RLS policies');
        }
      }
      
    } catch (error) {
      console.log('❌ Lỗi trong quá trình xóa:', error.message);
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
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình force delete:', error.message);
  }
}

// Chạy force delete
forceDeleteBot().then(() => {
  console.log('\n🏁 Force delete hoàn thành!');
}).catch(console.error);


