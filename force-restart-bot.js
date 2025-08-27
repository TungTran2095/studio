// Script force restart bot để test logic mới
const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceRestartBot() {
  console.log('🔄 Force Restart Bot để test logic mới...\n');
  
  try {
    // 1. Lấy danh sách bot
    console.log('1️⃣ Lấy danh sách bot...');
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('*');
    
    if (botsError) {
      console.error('❌ Lỗi lấy danh sách bot:', botsError);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('⚠️ Không có bot nào');
      return;
    }
    
    console.log(`✅ Tìm thấy ${bots.length} bot(s)`);
    bots.forEach(bot => {
      console.log(`   - ${bot.name} (ID: ${bot.id}) - Status: ${bot.status}`);
    });
    console.log('');
    
    // 2. Force stop tất cả bot
    console.log('2️⃣ Force stop tất cả bot...');
    for (const bot of bots) {
      if (bot.status === 'running') {
        console.log(`   🛑 Stopping ${bot.name}...`);
        
        const { error: stopError } = await supabase
          .from('trading_bots')
          .update({ 
            status: 'stopped',
            updated_at: new Date().toISOString()
          })
          .eq('id', bot.id);
        
        if (stopError) {
          console.error(`   ❌ Lỗi stop ${bot.name}:`, stopError);
        } else {
          console.log(`   ✅ Đã stop ${bot.name}`);
        }
      }
    }
    console.log('');
    
    // 3. Đợi 5 giây
    console.log('3️⃣ Đợi 5 giây để đảm bảo bot đã stop...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');
    
    // 4. Start lại bot đầu tiên để test
    console.log('4️⃣ Start lại bot đầu tiên để test logic mới...');
    const firstBot = bots[0];
    
    const { error: startError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', firstBot.id);
    
    if (startError) {
      console.error(`❌ Lỗi start ${firstBot.name}:`, startError);
    } else {
      console.log(`✅ Đã start ${firstBot.name}`);
      console.log('');
      console.log('🚀 Bot đã được restart với logic mới!');
      console.log('');
      console.log('📋 Logic mới sẽ:');
      console.log('   🟢 BUY: signal=buy && !hasRealPosition → Execute BUY với 100% USDT');
      console.log('   🔴 SELL: signal=sell && hasRealPosition → Execute SELL với 100% BTC');
      console.log('   ⏭️ SKIP: signal không phù hợp với balance');
      console.log('   ⏳ WAIT: không có signal');
      console.log('');
      console.log('🔍 Bây giờ hãy theo dõi log để xem logic mới hoạt động!');
    }
    
  } catch (error) {
    console.error('❌ Lỗi force restart bot:', error);
  }
}

// Chạy function
forceRestartBot();
