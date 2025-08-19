const { createClient } = require('@supabase/supabase-js');

// Sử dụng environment variables từ .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BOT_ID = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';

async function testUpdateById() {
  try {
    console.log('🔍 Testing update by ID...');
    
    // Kiểm tra bot trước
    console.log('\n1. Bot before update:');
    const { data: botBefore, error: errorBefore } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', BOT_ID)
      .single();
    
    if (errorBefore) {
      console.log('❌ Error fetching bot:', errorBefore);
      return;
    }
    
    console.log('Bot found:', {
      id: botBefore.id,
      name: botBefore.name,
      status: botBefore.status
    });
    
    // Update bằng ID
    console.log('\n2. Updating bot status to running...');
    const { data: updateResult, error: updateError } = await supabase
      .from('trading_bots')
      .update({ status: 'running' })
      .eq('id', BOT_ID)
      .select();
    
    if (updateError) {
      console.log('❌ Update error:', updateError);
      return;
    }
    
    console.log('✅ Update successful');
    console.log('Updated rows:', updateResult);
    
    // Kiểm tra bot sau khi update
    console.log('\n3. Bot after update:');
    const { data: botAfter, error: errorAfter } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', BOT_ID)
      .single();
    
    if (errorAfter) {
      console.log('❌ Error fetching bot after update:', errorAfter);
      return;
    }
    
    console.log('Bot after update:', {
      id: botAfter.id,
      name: botAfter.name,
      status: botAfter.status
    });
    
    // Kiểm tra xem có thay đổi gì không
    if (botBefore.status !== botAfter.status) {
      console.log('\n🎉 SUCCESS: Bot status changed from', botBefore.status, 'to', botAfter.status);
    } else {
      console.log('\n⚠️ WARNING: Bot status did not change');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testUpdateById();
