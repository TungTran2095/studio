// Test database connection and tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Check if worklogs table exists
    console.log('1. Testing worklogs table...');
    const { data: worklogs, error: worklogsError } = await supabase
      .from('worklogs')
      .select('*')
      .limit(1);
    
    if (worklogsError) {
      console.error('❌ worklogs table error:', worklogsError.message);
    } else {
      console.log('✅ worklogs table accessible');
    }

    // Test 2: Check if admin_roles table exists
    console.log('\n2. Testing admin_roles table...');
    const { data: adminRoles, error: adminError } = await supabase
      .from('admin_roles')
      .select('*')
      .limit(1);
    
    if (adminError) {
      console.error('❌ admin_roles table error:', adminError.message);
    } else {
      console.log('✅ admin_roles table accessible');
    }

    // Test 3: Check if user_profiles_with_admin view exists
    console.log('\n3. Testing user_profiles_with_admin view...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles_with_admin')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ user_profiles_with_admin view error:', profilesError.message);
    } else {
      console.log('✅ user_profiles_with_admin view accessible');
    }

    // Test 4: Check if chat tables exist
    console.log('\n4. Testing chat tables...');
    const { data: conversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.error('❌ chat_conversations table error:', convError.message);
    } else {
      console.log('✅ chat_conversations table accessible');
    }

    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.error('❌ chat_messages table error:', msgError.message);
    } else {
      console.log('✅ chat_messages table accessible');
    }

    // Test 5: Check auth.users
    console.log('\n5. Testing auth.users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ auth.users error:', usersError.message);
    } else {
      console.log('✅ auth.users accessible, count:', users.users?.length || 0);
    }

    console.log('\n🎉 Database connection test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testConnection();
