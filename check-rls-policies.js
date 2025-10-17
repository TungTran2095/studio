// Check RLS policies for worklogs table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for worklogs table...\n');

  try {
    // Check RLS policies using SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'worklogs'
        ORDER BY policyname;
      `
    });

    if (error) {
      console.error('❌ Error checking RLS policies:', error.message);
      
      // Try alternative method
      console.log('\n🔄 Trying alternative method...');
      const { data: altData, error: altError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'worklogs');
      
      if (altError) {
        console.error('❌ Alternative method also failed:', altError.message);
      } else {
        console.log('✅ RLS policies:', altData);
      }
    } else {
      console.log('✅ RLS policies for worklogs:');
      data.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.roles})`);
        if (policy.qual) console.log(`    WHERE: ${policy.qual}`);
        if (policy.with_check) console.log(`    WITH CHECK: ${policy.with_check}`);
      });
    }

    // Test client-side access simulation
    console.log('\n🔍 Testing client-side access simulation...');
    
    // Create client with anon key (simulating frontend)
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Try to fetch worklogs without authentication
    const { data: anonData, error: anonError } = await clientSupabase
      .from('worklogs')
      .select('*')
      .limit(1);

    if (anonError) {
      console.log('❌ Anonymous access blocked (expected):', anonError.message);
    } else {
      console.log('⚠️ Anonymous access allowed (unexpected):', anonData);
    }

    // Test with a specific user ID
    const testUserId = '6c1b74c0-0669-42b0-b6e1-e05dc2e42c43';
    const { data: userData, error: userError } = await clientSupabase
      .from('worklogs')
      .select('*')
      .eq('user_id', testUserId)
      .limit(1);

    if (userError) {
      console.log('❌ User-specific access blocked:', userError.message);
    } else {
      console.log('✅ User-specific access allowed:', userData?.length || 0, 'records');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkRLSPolicies();



