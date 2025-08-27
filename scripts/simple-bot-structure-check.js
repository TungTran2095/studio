#!/usr/bin/env node

/**
 * Script đơn giản để kiểm tra cấu trúc bảng trading_bots
 */

require('dotenv').config();

console.log('🔍 Kiểm tra cấu trúc bảng trading_bots...\n');

async function checkBotTableStructure() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Thiếu Supabase credentials');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Kiểm tra bảng có tồn tại không
    console.log('1️⃣ Kiểm tra bảng trading_bots...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('trading_bots')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Lỗi khi truy cập bảng:', tableError.message);
      console.log('   Code:', tableError.code);
      console.log('   Details:', tableError.details);
      return;
    }
    
    console.log('✅ Bảng trading_bots tồn tại');
    
    // 2. Lấy mẫu dữ liệu để xem cấu trúc
    console.log('\n2️⃣ Lấy mẫu dữ liệu...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.log('❌ Không thể select từ bảng:', sampleError.message);
      return;
    }
    
    if (sampleData && sampleData.length > 0) {
      const bot = sampleData[0];
      const columns = Object.keys(bot);
      console.log('✅ Các columns trong bảng:');
      columns.forEach(col => {
        const value = bot[col];
        const type = typeof value;
        if (value !== null) {
          if (type === 'string' && value.length > 50) {
            console.log(`   - ${col}: ${type} (${value.substring(0, 50)}...)`);
          } else {
            console.log(`   - ${col}: ${type} (${value})`);
          }
        } else {
          console.log(`   - ${col}: ${type} (null)`);
        }
      });
    }
    
    // 3. Test các operation cơ bản
    console.log('\n3️⃣ Test các operation cơ bản...');
    
    if (sampleData && sampleData.length > 0) {
      const bot = sampleData[0];
      
      // Test update
      console.log('   Test update...');
      const { error: updateError } = await supabase
        .from('trading_bots')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', bot.id);
      
      if (updateError) {
        console.log('   ❌ Không thể update bot:', updateError.message);
        console.log('      Code:', updateError.code);
        console.log('      Details:', updateError.details);
      } else {
        console.log('   ✅ Có thể update bot');
      }
      
      // Test delete
      console.log('   Test delete...');
      const { error: deleteError } = await supabase
        .from('trading_bots')
        .delete()
        .eq('id', bot.id);
      
      if (deleteError) {
        console.log('   ❌ Không thể delete bot:', deleteError.message);
        console.log('      Code:', deleteError.code);
        console.log('      Details:', deleteError.details);
        
        // Kiểm tra xem có phải foreign key constraint không
        if (deleteError.code === '23503') {
          console.log('   💡 Đây là foreign key constraint error');
          console.log('      Bot có thể được reference bởi bảng khác');
        }
        
        // Kiểm tra xem có phải RLS error không
        if (deleteError.code === '42501') {
          console.log('   💡 Đây là permission error (có thể do RLS)');
        }
      } else {
        console.log('   ✅ Có thể delete bot');
        
        // Restore bot
        console.log('   Restoring bot...');
        const { error: restoreError } = await supabase
          .from('trading_bots')
          .insert([bot]);
        
        if (restoreError) {
          console.log('   ❌ Không thể restore bot:', restoreError.message);
        } else {
          console.log('   ✅ Đã restore bot');
        }
      }
    }
    
    // 4. Kiểm tra xem có bảng nào khác reference đến trading_bots không
    console.log('\n4️⃣ Kiểm tra foreign key references...');
    const possibleTables = [
      'bot_trades', 'bot_logs', 'bot_orders', 'bot_executions',
      'trading_sessions', 'bot_metrics', 'bot_performance',
      'bot_signals', 'bot_positions', 'bot_history'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { data: fkCheck, error: fkCheckError } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (!fkCheckError) {
          console.log(`   ✅ Bảng ${tableName} tồn tại (có thể có foreign key)`);
          
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
    
  } catch (error) {
    console.log('❌ Lỗi trong quá trình kiểm tra:', error.message);
  }
}

// Chạy kiểm tra
checkBotTableStructure().then(() => {
  console.log('\n🏁 Kiểm tra hoàn thành!');
  console.log('\n💡 Nếu bot không thể xóa, có thể do:');
  console.log('1. Row Level Security (RLS) bị bật');
  console.log('2. Foreign key constraints');
  console.log('3. Permission policies');
  console.log('4. Bot đang được sử dụng bởi process khác');
}).catch(console.error);
