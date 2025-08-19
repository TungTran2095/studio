const { createClient } = require('@supabase/supabase-js');

// Sử dụng environment variables từ .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BOT_ID = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';

async function testSupabaseUpdate() {
  try {
    console.log('🔍 Testing Supabase update directly...');
    
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
      status: botBefore.status,
      updated_at: botBefore.updated_at
    });
    
    // Test update với data đơn giản
    console.log('\n2. Testing simple update...');
    const { data: updateResult1, error: updateError1 } = await supabase
      .from('trading_bots')
      .update({ status: 'running' })
      .eq('id', BOT_ID)
      .select();
    
    if (updateError1) {
      console.log('❌ Simple update error:', updateError1);
    } else {
      console.log('✅ Simple update successful');
      console.log('Updated rows:', updateResult1);
    }
    
    // Test update với data phức tạp hơn
    console.log('\n3. Testing complex update...');
    const { data: updateResult2, error: updateError2 } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString(),
        last_run_at: new Date().toISOString()
      })
      .eq('id', BOT_ID)
      .select();
    
    if (updateError2) {
      console.log('❌ Complex update error:', updateError2);
    } else {
      console.log('✅ Complex update successful');
      console.log('Updated rows:', updateResult2);
    }
    
    // Kiểm tra bot sau khi update
    console.log('\n4. Bot after update:');
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
      status: botAfter.status,
      updated_at: botAfter.updated_at,
      last_run_at: botAfter.last_run_at
    });
    
    // Kiểm tra xem có thay đổi gì không
    if (botBefore.status !== botAfter.status) {
      console.log('\n🎉 SUCCESS: Bot status changed from', botBefore.status, 'to', botAfter.status);
    } else {
      console.log('\n⚠️ WARNING: Bot status did not change');
    }
    
    if (botBefore.updated_at !== botAfter.updated_at) {
      console.log('✅ Updated timestamp changed');
    } else {
      console.log('⚠️ Updated timestamp did not change');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSupabaseUpdate();
