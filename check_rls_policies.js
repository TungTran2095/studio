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

async function checkRLSPolicies() {
  try {
    console.log('🔍 Checking RLS policies...');
    
    // Kiểm tra xem RLS có được enable không
    console.log('\n1. Checking if RLS is enabled...');
    const { data: rlsEnabled, error: rlsError } = await supabase
      .rpc('check_rls_enabled', { table_name: 'trading_bots' });
    
    if (rlsError) {
      console.log('❌ Error checking RLS:', rlsError.message);
      console.log('   This might mean RLS is not enabled or the function does not exist');
    } else {
      console.log('✅ RLS check result:', rlsEnabled);
    }
    
    // Thử disable RLS tạm thời để test
    console.log('\n2. Attempting to disable RLS temporarily...');
    const { error: disableError } = await supabase
      .rpc('alter_table_disable_rls', { table_name: 'trading_bots' });
    
    if (disableError) {
      console.log('❌ Error disabling RLS:', disableError.message);
    } else {
      console.log('✅ RLS disabled temporarily');
      
      // Test update sau khi disable RLS
      console.log('\n3. Testing update after disabling RLS...');
      const { data: updateResult, error: updateError } = await supabase
        .from('trading_bots')
        .update({ status: 'running' })
        .eq('id', '2fedeffb-6a94-4dad-a32c-85bb50e59b14')
        .select();
      
      if (updateError) {
        console.log('❌ Update still failed after disabling RLS:', updateError.message);
      } else {
        console.log('✅ Update successful after disabling RLS');
        console.log('Updated rows:', updateResult);
      }
      
      // Re-enable RLS
      console.log('\n4. Re-enabling RLS...');
      const { error: enableError } = await supabase
        .rpc('alter_table_enable_rls', { table_name: 'trading_bots' });
      
      if (enableError) {
        console.log('❌ Error re-enabling RLS:', enableError.message);
      } else {
        console.log('✅ RLS re-enabled');
      }
    }
    
    // Kiểm tra quyền truy cập của user hiện tại
    console.log('\n5. Checking current user permissions...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Error getting user:', userError.message);
    } else {
      console.log('✅ Current user:', user ? user.id : 'No user');
    }
    
    // Kiểm tra role hiện tại
    console.log('\n6. Checking current role...');
    const { data: roleData, error: roleError } = await supabase
      .rpc('current_setting', { name: 'role' });
    
    if (roleError) {
      console.log('❌ Error getting role:', roleError.message);
    } else {
      console.log('✅ Current role:', roleData);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkRLSPolicies();
