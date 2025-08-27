// Script kiểm tra bot đang chạy code version nào
const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBotCodeVersion() {
  console.log('🔍 Kiểm tra Bot Code Version...\n');
  
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
    
    // 2. Kiểm tra bot đang chạy
    const runningBots = bots.filter(bot => bot.status === 'running');
    if (runningBots.length === 0) {
      console.log('⚠️ Không có bot nào đang chạy');
      return;
    }
    
    console.log(`2️⃣ Bot đang chạy: ${runningBots.length} bot(s)`);
    runningBots.forEach(bot => {
      console.log(`   - ${bot.name} (ID: ${bot.id})`);
    });
    console.log('');
    
    // 3. Force restart bot để load code mới
    console.log('3️⃣ Force restart bot để load code mới...');
    for (const bot of runningBots) {
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
    console.log('');
    
    // 4. Đợi 10 giây
    console.log('4️⃣ Đợi 10 giây để đảm bảo bot đã stop hoàn toàn...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('');
    
    // 5. Start lại bot đầu tiên
    console.log('5️⃣ Start lại bot đầu tiên để test code mới...');
    const firstBot = runningBots[0];
    
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
      console.log('🚀 Bot đã được restart với code mới!');
      console.log('');
      console.log('📋 Code mới sẽ có:');
      console.log('   🎯 Decision Making Process');
      console.log('   💰 Balance Analysis');
      console.log('   🟢 BUY Signal: Dùng hết USDT để mua BTC');
      console.log('   🔴 SELL Signal: Bán hết BTC để lấy USDT');
      console.log('   ⏭️ Bỏ qua signal không phù hợp');
      console.log('   📊 Cycle Summary');
      console.log('');
      console.log('🔍 Bây giờ hãy theo dõi log để xem code mới có hoạt động không!');
      console.log('');
      console.log('⚠️ Nếu vẫn thấy log cũ "Managing existing position", có nghĩa là:');
      console.log('   1. Bot chưa được restart hoàn toàn');
      console.log('   2. Có cache/compilation issue');
      console.log('   3. Bot đang chạy process cũ');
      console.log('');
      console.log('💡 Giải pháp: Restart toàn bộ server/process');
    }
    
  } catch (error) {
    console.error('❌ Lỗi check bot code version:', error);
  }
}

// Chạy function
checkBotCodeVersion();
