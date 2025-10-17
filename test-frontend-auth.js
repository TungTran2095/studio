// Test frontend authentication and worklogs fetching
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testFrontendAuth() {
  console.log('🔍 Testing frontend authentication and worklogs fetching...\n');

  try {
    // Test 1: Check current session
    console.log('1. Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
    } else if (session) {
      console.log('✅ User is authenticated:', session.user.email);
      console.log('   User ID:', session.user.id);
    } else {
      console.log('❌ No active session - user not authenticated');
    }

    // Test 2: Try to fetch worklogs without authentication
    console.log('\n2. Testing worklogs fetch without authentication...');
    const { data: worklogs, error: worklogsError } = await supabase
      .from('worklogs')
      .select('*')
      .limit(5);

    if (worklogsError) {
      console.error('❌ Worklogs fetch error:', worklogsError.message);
    } else {
      console.log('✅ Worklogs fetched successfully:', worklogs.length, 'records');
      if (worklogs.length > 0) {
        console.log('   Sample worklog:', worklogs[0].title);
      }
    }

    // Test 3: Try to fetch worklogs with specific user ID
    console.log('\n3. Testing worklogs fetch with specific user ID...');
    const testUserId = '6c1b74c0-0669-42b0-b6e1-e05dc2e42c43';
    const { data: userWorklogs, error: userWorklogsError } = await supabase
      .from('worklogs')
      .select('*')
      .eq('user_id', testUserId)
      .limit(5);

    if (userWorklogsError) {
      console.error('❌ User worklogs fetch error:', userWorklogsError.message);
    } else {
      console.log('✅ User worklogs fetched successfully:', userWorklogs.length, 'records');
    }

    // Test 4: Try to sign in with test credentials
    console.log('\n4. Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'tung.tranthanh@medlatec.com',
      password: 'test123' // This will likely fail, but we can see the error
    });

    if (signInError) {
      console.log('❌ Sign in failed (expected):', signInError.message);
    } else {
      console.log('✅ Sign in successful:', signInData.user.email);
    }

    // Test 5: Check if RLS is properly configured
    console.log('\n5. Testing RLS configuration...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('worklogs')
      .select('count(*)')
      .limit(1);

    if (rlsError) {
      console.log('❌ RLS test error:', rlsError.message);
    } else {
      console.log('⚠️ RLS may not be properly configured - anonymous access allowed');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testFrontendAuth();



