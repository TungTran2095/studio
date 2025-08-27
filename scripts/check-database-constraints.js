#!/usr/bin/env node

/**
 * Script kiểm tra database constraints để tìm nguyên nhân bot không thể xóa
 */

require('dotenv').config();

console.log('🔍 Kiểm tra database constraints...\n');

async function checkDatabaseConstraints() {
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
    
    // 1. Kiểm tra cấu trúc bảng trading_bots
    console.log('\n1️⃣ Kiểm tra cấu trúc bảng trading_bots...');
    
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('trading_bots')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.log('❌ Không thể truy cập bảng trading_bots:', tableError.message);
        return;
      }
      
      if (tableInfo && tableInfo.length > 0) {
        const columns = Object.keys(tableInfo[0]);
        console.log('✅ Bảng trading_bots tồn tại');
        console.log(`   Columns: ${columns.join(', ')}`);
        
        // Kiểm tra các columns có thể là foreign keys
        const possibleFkColumns = columns.filter(col => 
          col.includes('_id') || col.includes('project') || col.includes('experiment')
        );
        
        if (possibleFkColumns.length > 0) {
          console.log(`   Possible FK columns: ${possibleFkColumns.join(', ')}`);
        }
      }
    } catch (error) {
      console.log('❌ Lỗi khi kiểm tra bảng trading_bots:', error.message);
    }
    
    // 2. Kiểm tra các bảng có thể reference đến trading_bots
    console.log('\n2️⃣ Kiểm tra các bảng có thể reference trading_bots...');
    
    const possibleReferenceTables = [
      'bot_trades', 'bot_logs', 'bot_orders', 'bot_executions',
      'trading_sessions', 'bot_metrics', 'bot_performance',
      'bot_signals', 'bot_positions', 'bot_history',
      'experiments', 'projects', 'users', 'trades', 'orders',
      'bot_analytics', 'bot_reports', 'bot_schedules'
    ];
    
    for (const tableName of possibleReferenceTables) {
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
                col.includes('bot') || col.includes('trading') || 
                col.includes('_id') || col.includes('bot_id')
              );
              
              if (botRefColumns.length > 0) {
                console.log(`      Columns có thể reference: ${botRefColumns.join(', ')}`);
                
                // Kiểm tra xem có data nào reference đến bot không
                for (const col of botRefColumns) {
                  try {
                    const { data: refData, error: refError } = await supabase
                      .from(tableName)
                      .select(col)
                      .not(col, 'is', null)
                      .limit(5);
                    
                    if (!refError && refData && refData.length > 0) {
                      console.log(`         Column ${col} có data: ${refData.length} records`);
                      console.log(`         Sample values: ${refData.map(r => r[col]).join(', ')}`);
                    }
                  } catch (error) {
                    // Không thể kiểm tra
                  }
                }
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
    
    // 3. Kiểm tra bot cụ thể
    console.log('\n3️⃣ Kiểm tra bot cụ thể...');
    
    const { data: bots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*');
    
    if (!fetchError && bots && bots.length > 0) {
      const testBot = bots[0];
      console.log(`   Bot: ${testBot.name} (${testBot.id})`);
      console.log(`   Status: ${testBot.status}`);
      
      // Kiểm tra xem có bảng nào reference đến bot này không
      console.log('\n4️⃣ Kiểm tra references đến bot này...');
      
      for (const tableName of possibleReferenceTables) {
        try {
          const { data: refCheck, error: refCheckError } = await supabase
            .from(tableName)
            .select('*')
            .eq('bot_id', testBot.id)
            .limit(1);
          
          if (!refCheckError && refCheck && refCheck.length > 0) {
            console.log(`   ✅ Bảng ${tableName} có reference đến bot ${testBot.id}`);
            console.log(`      Số records: ${refCheck.length}`);
            
            // Hiển thị sample data
            const sampleRecord = refCheck[0];
            const relevantColumns = Object.keys(sampleRecord).filter(col => 
              col.includes('bot') || col.includes('id') || col.includes('created')
            );
            
            if (relevantColumns.length > 0) {
              console.log(`      Sample data: ${relevantColumns.map(col => `${col}: ${sampleRecord[col]}`).join(', ')}`);
            }
          }
        } catch (error) {
          // Không thể kiểm tra
        }
      }
      
      // 5. Thử xóa bot và xem lỗi chi tiết
      console.log('\n5️⃣ Thử xóa bot để xem lỗi chi tiết...');
      
      try {
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
          
          // Kiểm tra xem có phải foreign key constraint không
          if (deleteError.code === '23503') {
            console.log('💡 Đây là foreign key constraint error');
            console.log('   Bot có thể được reference bởi bảng khác');
          }
          
          // Kiểm tra xem có phải RLS error không
          if (deleteError.code === '42501') {
            console.log('💡 Đây là permission error (có thể do RLS)');
          }
        } else {
          console.log('✅ Xóa bot thành công (không có lỗi)');
          
          // Kiểm tra xem bot đã thực sự bị xóa chưa
          const { data: checkBot, error: checkError } = await supabase
            .from('trading_bots')
            .select('*')
            .eq('id', testBot.id)
            .single();
          
          if (checkError && checkError.code === 'PGRST116') {
            console.log('✅ Bot đã bị xóa khỏi database');
          } else if (checkBot) {
            console.log('❌ Bot vẫn còn trong database sau khi xóa!');
            console.log('   Đây là vấn đề nghiêm trọng!');
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
checkDatabaseConstraints().then(() => {
  console.log('\n🏁 Kiểm tra hoàn thành!');
}).catch(console.error);

