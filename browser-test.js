// Browser test script - Copy and paste into browser console
// This script will help debug the "Error fetching work logs" issue

console.log('🔍 Starting browser debug test...');

// Test 1: Check Supabase client
console.log('1. Checking Supabase client...');
if (typeof supabase !== 'undefined') {
  console.log('✅ Supabase client available');
} else {
  console.log('❌ Supabase client not found');
}

// Test 2: Check authentication
console.log('\n2. Checking authentication...');
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Session error:', error);
  } else if (data.session) {
    console.log('✅ User authenticated:', data.session.user.email);
    console.log('   User ID:', data.session.user.id);
  } else {
    console.log('❌ No active session');
  }
});

// Test 3: Check worklogs access
console.log('\n3. Testing worklogs access...');
supabase.from('worklogs').select('*').limit(5).then(({ data, error }) => {
  if (error) {
    console.error('❌ Worklogs error:', error);
  } else {
    console.log('✅ Worklogs accessible:', data.length, 'records');
    if (data.length > 0) {
      console.log('   Sample:', data[0].title);
    }
  }
});

// Test 4: Check user profile
console.log('\n4. Testing user profile...');
supabase.from('user_profiles_with_admin').select('*').then(({ data, error }) => {
  if (error) {
    console.error('❌ User profile error:', error);
  } else {
    console.log('✅ User profile accessible:', data.length, 'records');
  }
});

// Test 5: Check admin status
console.log('\n5. Testing admin status...');
supabase.from('admin_roles').select('*').then(({ data, error }) => {
  if (error) {
    console.error('❌ Admin roles error:', error);
  } else {
    console.log('✅ Admin roles accessible:', data.length, 'records');
  }
});

// Test 6: Simulate the exact error
console.log('\n6. Simulating exact error scenario...');
setTimeout(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      supabase
        .from('worklogs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('❌ Simulated error:', error);
          } else {
            console.log('✅ Simulated success:', data.length, 'records');
          }
        });
    } else {
      console.log('❌ No session for simulation');
    }
  });
}, 1000);

console.log('\n🎯 Test completed. Check results above.');



