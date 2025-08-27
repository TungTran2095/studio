#!/usr/bin/env node

/**
 * Script kiểm tra cấu trúc bảng trading_bots và policies
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
    
    // 2. Kiểm tra cấu trúc bảng
    console.log('\n2️⃣ Kiểm tra cấu trúc bảng...');
    const { data: structure, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'trading_bots' })
      .catch(() => ({ data: null, error: { message: 'Function not available' } }));
    
    if (structureError) {
      console.log('ℹ️  Không thể lấy cấu trúc bảng qua RPC');
      console.log('   Sẽ thử cách khác...');
      
      // Thử select tất cả columns
      const { data: sampleData, error: sampleError } = await supabase
        .from('trading_bots')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ Không thể select từ bảng:', sampleError.message);
        return;
      }
      
      if (sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        console.log('✅ Các columns trong bảng:');
        columns.forEach(col => {
          const value = sampleData[0][col];
          const type = typeof value;
          console.log(`   - ${col}: ${type}${value !== null ? ` (${value})` : ' (null)'}`);
        });
      }
    } else {
      console.log('✅ Cấu trúc bảng:');
      console.log(structure);
    }
    
    // 3. Kiểm tra RLS (Row Level Security)
    console.log('\n3️⃣ Kiểm tra Row Level Security...');
    try {
      const { data: rlsCheck, error: rlsError } = await supabase
        .rpc('check_rls_status', { table_name: 'trading_bots' })
        .catch(() => ({ data: null, error: { message: 'Function not available' } }));
      
      if (rlsError) {
        console.log('ℹ️  Không thể kiểm tra RLS qua RPC');
        
        // Thử kiểm tra bằng cách khác
        console.log('   Thử kiểm tra RLS bằng cách khác...');
        
        // Kiểm tra xem có thể insert/update/delete không
        const testBot = {
          name: 'test_bot_rls',
          project_id: '00000000-0000-0000-0000-000000000000',
          status: 'stopped',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Test insert
        const { error: insertError } = await supabase
          .from('trading_bots')
          .insert([testBot]);
        
        if (insertError) {
          console.log('❌ Không thể insert (có thể do RLS):', insertError.message);
          console.log('   Code:', insertError.code);
          console.log('   Details:', insertError.details);
        } else {
          console.log('✅ Có thể insert - RLS có thể không bật');
          
          // Xóa test bot
          await supabase
            .from('trading_bots')
            .delete()
            .eq('name', 'test_bot_rls');
        }
      } else {
        console.log('✅ RLS status:', rlsCheck);
      }
    } catch (error) {
      console.log('ℹ️  Không thể kiểm tra RLS:', error.message);
    }
    
    // 4. Kiểm tra policies
    console.log('\n4️⃣ Kiểm tra policies...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_table_policies', { table_name: 'trading_bots' })
        .catch(() => ({ data: null, error: { message: 'Function not available' } }));
      
      if (policiesError) {
        console.log('ℹ️  Không thể lấy policies qua RPC');
        console.log('   Sẽ thử kiểm tra bằng cách khác...');
        
        // Thử các operation khác nhau
        const { data: existingBot } = await supabase
          .from('trading_bots')
          .select('*')
          .limit(1);
        
        if (existingBot && existingBot.length > 0) {
          const bot = existingBot[0];
          
          // Test update
          const { error: updateError } = await supabase
            .from('trading_bots')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', bot.id);
          
          if (updateError) {
            console.log('❌ Không thể update bot:', updateError.message);
            console.log('   Code:', updateError.code);
          } else {
            console.log('✅ Có thể update bot');
          }
          
          // Test delete
          const { error: deleteError } = await supabase
            .from('trading_bots')
            .delete()
            .eq('id', bot.id);
          
          if (deleteError) {
            console.log('❌ Không thể delete bot:', deleteError.message);
            console.log('   Code:', deleteError.code);
            console.log('   Details:', deleteError.details);
            
            // Kiểm tra xem có phải foreign key constraint không
            if (deleteError.code === '23503') {
              console.log('💡 Đây là foreign key constraint error');
              console.log('   Bot có thể được reference bởi bảng khác');
            }
          } else {
            console.log('✅ Có thể delete bot');
            
            // Restore bot
            await supabase
              .from('trading_bots')
              .insert([bot]);
          }
        }
      } else {
        console.log('✅ Policies:', policies);
      }
    } catch (error) {
      console.log('ℹ️  Không thể kiểm tra policies:', error.message);
    }
    
    // 5. Kiểm tra foreign keys
    console.log('\n5️⃣ Kiểm tra foreign keys...');
    try {
      const { data: foreignKeys, error: fkError } = await supabase
        .rpc('get_foreign_keys', { table_name: 'trading_bots' })
        .catch(() => ({ data: null, error: { message: 'Function not available' } }));
      
      if (fkError) {
        console.log('ℹ️  Không thể lấy foreign keys qua RPC');
        
        // Thử kiểm tra bằng cách khác
        console.log('   Kiểm tra xem có bảng nào reference đến trading_bots không...');
        
        // Kiểm tra các bảng có thể có foreign key
        const possibleTables = [
          'bot_trades', 'bot_logs', 'bot_orders', 'bot_executions',
          'trading_sessions', 'bot_metrics', 'bot_performance'
        ];
        
        for (const tableName of possibleTables) {
          try {
            const { data: fkCheck, error: fkCheckError } = await supabase
              .from(tableName)
              .select('count')
              .limit(1);
            
            if (!fkCheckError) {
              console.log(`   ✅ Bảng ${tableName} tồn tại (có thể có foreign key)`);
            }
          } catch (error) {
            // Bảng không tồn tại
          }
        }
      } else {
        console.log('✅ Foreign keys:', foreignKeys);
      }
    } catch (error) {
      console.log('ℹ️  Không thể kiểm tra foreign keys:', error.message);
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
