#!/usr/bin/env node

/**
 * Script kiểm tra chi tiết bảng trades và mối quan hệ với trading_bots
 */

require('dotenv').config();

console.log('🔍 Kiểm tra bảng trades...\n');

async function checkTradesTable() {
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
    
    // 1. Kiểm tra cấu trúc bảng trades
    console.log('\n1️⃣ Kiểm tra cấu trúc bảng trades...');
    
    try {
      const { data: tradesInfo, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .limit(1);
      
      if (tradesError) {
        console.log('❌ Lỗi khi truy cập bảng trades:', tradesError.message);
        return;
      }
      
      if (tradesInfo && tradesInfo.length > 0) {
        const columns = Object.keys(tradesInfo[0]);
        console.log('✅ Bảng trades tồn tại');
        console.log(`   Columns: ${columns.join(', ')}`);
        
        // Kiểm tra các columns có thể reference đến trading_bots
        const botRefColumns = columns.filter(col => 
          col.includes('bot') || col.includes('trading') || 
          col.includes('_id') || col.includes('bot_id')
        );
        
        if (botRefColumns.length > 0) {
          console.log(`   Bot reference columns: ${botRefColumns.join(', ')}`);
        }
        
        // Hiển thị sample data
        const sampleTrade = tradesInfo[0];
        console.log('\n   Sample trade data:');
        Object.keys(sampleTrade).forEach(key => {
          console.log(`     ${key}: ${sampleTrade[key]}`);
        });
      }
    } catch (error) {
      console.log('❌ Lỗi khi kiểm tra bảng trades:', error.message);
    }
    
    // 2. Kiểm tra xem có trades nào reference đến bot không
    console.log('\n2️⃣ Kiểm tra trades reference đến bot...');
    
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('id, name');
    
    if (!botsError && bots && bots.length > 0) {
      const testBot = bots[0];
      console.log(`   Bot: ${testBot.name} (${testBot.id})`);
      
      // Kiểm tra các columns có thể reference
      const possibleRefColumns = ['bot_id', 'trading_bot_id', 'bot_id', 'id'];
      
      for (const col of possibleRefColumns) {
        try {
          const { data: refTrades, error: refError } = await supabase
            .from('trades')
            .select('*')
            .eq(col, testBot.id)
            .limit(5);
          
          if (!refError && refTrades && refTrades.length > 0) {
            console.log(`   ✅ Tìm thấy ${refTrades.length} trades reference đến bot qua column ${col}`);
            
            refTrades.forEach((trade, index) => {
              console.log(`      Trade ${index + 1}: ID ${trade.id}, ${col}: ${trade[col]}`);
            });
            
            // Đây có thể là nguyên nhân bot không thể xóa!
            console.log(`   🚨 Column ${col} có thể là foreign key constraint!`);
          }
        } catch (error) {
          // Column không tồn tại
        }
      }
    }
    
    // 3. Kiểm tra tất cả trades để xem pattern
    console.log('\n3️⃣ Kiểm tra tất cả trades...');
    
    try {
      const { data: allTrades, error: allTradesError } = await supabase
        .from('trades')
        .select('*')
        .limit(10);
      
      if (!allTradesError && allTrades && allTrades.length > 0) {
        console.log(`   Tổng số trades: ${allTrades.length}`);
        
        // Tìm columns có thể reference đến trading_bots
        const sampleTrade = allTrades[0];
        const columns = Object.keys(sampleTrade);
        
        console.log('\n   Tất cả columns:');
        columns.forEach(col => {
          console.log(`     ${col}: ${sampleTrade[col]}`);
        });
        
        // Kiểm tra xem có column nào chứa UUID giống bot ID không
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        columns.forEach(col => {
          const value = sampleTrade[col];
          if (value && typeof value === 'string' && uuidPattern.test(value)) {
            console.log(`   🔍 Column ${col} có thể là UUID reference: ${value}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Lỗi khi lấy tất cả trades:', error.message);
    }
    
    // 4. Thử xóa bot và xem có lỗi gì không
    console.log('\n4️⃣ Thử xóa bot để xem lỗi chi tiết...');
    
    if (bots && bots.length > 0) {
      const testBot = bots[0];
      
      try {
        console.log(`   Đang xóa bot ${testBot.name}...`);
        
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
            console.log('   Bot có thể được reference bởi bảng trades');
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
checkTradesTable().then(() => {
  console.log('\n🏁 Kiểm tra hoàn thành!');
}).catch(console.error);




