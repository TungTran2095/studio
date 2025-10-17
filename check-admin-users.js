// Check admin users and worklogs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAdminUsers() {
  console.log('🔍 Checking admin users and worklogs...\n');

  try {
    // Check admin_roles
    console.log('1. Checking admin_roles...');
    const { data: adminRoles, error: adminError } = await supabase
      .from('admin_roles')
      .select('*');
    
    if (adminError) {
      console.error('❌ admin_roles error:', adminError.message);
    } else {
      console.log('✅ admin_roles data:', adminRoles);
    }

    // Check worklogs
    console.log('\n2. Checking worklogs...');
    const { data: worklogs, error: worklogsError } = await supabase
      .from('worklogs')
      .select('*');
    
    if (worklogsError) {
      console.error('❌ worklogs error:', worklogsError.message);
    } else {
      console.log('✅ worklogs data:', worklogs);
    }

    // Check auth users
    console.log('\n3. Checking auth users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ auth users error:', usersError.message);
    } else {
      console.log('✅ auth users:');
      users.users.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }

    // Test RLS with a specific user
    if (users.users.length > 0) {
      const testUser = users.users[0];
      console.log(`\n4. Testing RLS for user: ${testUser.email}`);
      
      const { data: userWorklogs, error: userWorklogsError } = await supabase
        .from('worklogs')
        .select('*')
        .eq('user_id', testUser.id);
      
      if (userWorklogsError) {
        console.error('❌ User worklogs error:', userWorklogsError.message);
      } else {
        console.log('✅ User worklogs:', userWorklogs);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkAdminUsers();



