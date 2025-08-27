#!/usr/bin/env node

/**
 * Script kiểm tra database triggers và constraints có thể rollback việc xóa
 */

require('dotenv').config();

console.log('🔍 Kiểm tra database triggers và constraints...\n');

async function checkDatabaseTriggers() {
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
    
    // 1. Kiểm tra xem có bảng nào khác reference đến trading_bots không
    console.log('\n1️⃣ Kiểm tra tất cả bảng có thể reference trading_bots...');
    
    const allPossibleTables = [
      'trading_bots', 'trades', 'orders', 'bot_logs', 'bot_metrics',
      'bot_performance', 'bot_signals', 'bot_positions', 'bot_history',
      'trading_sessions', 'bot_executions', 'bot_analytics',
      'experiments', 'projects', 'users', 'bot_schedules',
      'bot_reports', 'bot_configs', 'bot_alerts', 'bot_notifications'
    ];
    
    for (const tableName of allPossibleTables) {
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (!tableError) {
          console.log(`   ✅ Bảng ${tableName} tồn tại`);
          
          // Kiểm tra cấu trúc bảng
          try {
            const { data: tableStructure, error: structureError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!structureError && tableStructure && tableStructure.length > 0) {
              const columns = Object.keys(tableStructure[0]);
              const botRefColumns = columns.filter(col => 
                col.includes('bot') || col.includes('trading') || 
                col.includes('_id') || col.includes('bot_id') ||
                col.includes('trading_bot')
              );
              
              if (botRefColumns.length > 0) {
                console.log(`      Bot reference columns: ${botRefColumns.join(', ')}`);
                
                // Kiểm tra xem có data nào reference đến bot không
                for (const col of botRefColumns) {
                  try {
                    const { data: refData, error: refError } = await supabase
                      .from(tableName)
                      .select(col)
                      .not(col, 'is', null)
                      .limit(3);
                    
                    if (!refError && refData && refData.length > 0) {
                      console.log(`         Column ${col} có ${refData.length} records với data`);
                      console.log(`         Sample: ${refData.map(r => r[col]).join(', ')}`);
                    }
                  } catch (error) {
                    // Không thể kiểm tra
                  }
                }
              }
            }
          } catch (error) {
            // Không thể kiểm tra cấu trúc
          }
        }
      } catch (error) {
        // Bảng không tồn tại
      }
    }
    
    // 2. Kiểm tra bot cụ thể và tìm references
    console.log('\n2️⃣ Kiểm tra bot cụ thể và tìm references...');
    
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('*');
    
    if (!botsError && bots && bots.length > 0) {
      const testBot = bots[0];
      console.log(`   Bot: ${testBot.name} (${testBot.id})`);
      console.log(`   Status: ${testBot.status}`);
      
      // Kiểm tra tất cả bảng có thể reference đến bot này
      console.log('\n   Tìm references đến bot này...');
      
      for (const tableName of allPossibleTables) {
        try {
          // Kiểm tra các columns có thể reference
          const possibleRefColumns = [
            'bot_id', 'trading_bot_id', 'bot_id', 'id',
            'trading_bot', 'bot', 'trading_bot_id'
          ];
          
          for (const col of possibleRefColumns) {
            try {
              const { data: refData, error: refError } = await supabase
                .from(tableName)
                .select('*')
                .eq(col, testBot.id)
                .limit(1);
              
              if (!refError && refData && refData.length > 0) {
                console.log(`   🚨 Bảng ${tableName} có reference đến bot qua column ${col}!`);
                console.log(`      Số records: ${refData.length}`);
                
                // Đây có thể là nguyên nhân bot không thể xóa!
                console.log(`      💡 Column ${col} có thể là foreign key constraint!`);
              }
            } catch (error) {
              // Column không tồn tại
            }
          }
        } catch (error) {
          // Không thể kiểm tra bảng
        }
      }
    }
    
    // 3. Thử xóa bot với logging chi tiết
    console.log('\n3️⃣ Thử xóa bot với logging chi tiết...');
    
    if (bots && bots.length > 0) {
      const testBot = bots[0];
      
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
          } else if (deleteError.code === '42501') {
            console.log('💡 Đây là permission error (có thể do RLS)!');
          }
        } else {
          console.log('✅ Xóa bot thành công (không có lỗi)');
          
          // Kiểm tra ngay sau khi xóa
          console.log('   Kiểm tra ngay sau khi xóa...');
          const { data: afterDelete, error: afterError } = await supabase
            .from('trading_bots')
            .select('*')
            .eq('id', testBot.id)
            .single();
          
          if (afterError && afterError.code === 'PGRST116') {
            console.log('✅ Bot đã bị xóa khỏi database');
          } else if (afterDelete) {
            console.log('❌ Bot vẫn còn trong database sau khi xóa!');
            console.log('   Đây là vấn đề nghiêm trọng!');
            console.log('   💡 Có thể do:');
            console.log('      - Database trigger rollback');
            console.log('      - Transaction rollback');
            console.log('      - RLS policy rollback');
            console.log('      - Database constraint rollback');
          }
          
          // Kiểm tra lại sau 1 giây
          console.log('   Kiểm tra lại sau 1 giây...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: finalCheck, error: finalError } = await supabase
            .from('trading_bots')
            .select('*')
            .eq('id', testBot.id)
            .single();
          
          if (finalError && finalError.code === 'PGRST116') {
            console.log('✅ Bot đã bị xóa khỏi database (kiểm tra cuối)');
          } else if (finalCheck) {
            console.log('❌ Bot vẫn còn trong database (kiểm tra cuối)');
            console.log('   🚨 Đây là vấn đề nghiêm trọng về data integrity!');
          }
        }
      } catch (error) {
        console.log('❌ Lỗi trong quá trình xóa:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình kiểm tra:', error.message);
  }
}

// Chạy kiểm tra
checkDatabaseTriggers().then(() => {
  console.log('\n🏁 Kiểm tra hoàn thành!');
}).catch(console.error);

