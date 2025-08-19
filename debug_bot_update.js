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

async function debugBotUpdate() {
  try {
    console.log('🔍 Debugging bot update...');
    
    // Kiểm tra bot trước khi update
    console.log('\n1. Bot status before update:');
    const { data: botBefore, error: errorBefore } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', BOT_ID)
      .single();
    
    if (errorBefore) {
      console.log('❌ Error fetching bot before update:', errorBefore);
      return;
    }
    
    console.log('Bot found:', {
      id: botBefore.id,
      name: botBefore.name,
      status: botBefore.status,
      updated_at: botBefore.updated_at
    });
    
    // Thử update với data đơn giản
    console.log('\n2. Attempting to update bot status...');
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
    console.log('Update result:', updateResult);
    
    // Kiểm tra bot sau khi update
    console.log('\n3. Bot status after update:');
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
      updated_at: botAfter.updated_at
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugBotUpdate();
