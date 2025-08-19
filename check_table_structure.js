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

async function checkTableStructure() {
  try {
    console.log('🔍 Checking table structure and permissions...');
    
    // Kiểm tra cấu trúc bảng
    console.log('\n1. Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'trading_bots')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.log('❌ Error fetching table structure:', tableError);
    } else {
      console.log('✅ Table structure:');
      tableInfo.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Kiểm tra RLS policies
    console.log('\n2. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'trading_bots');
    
    if (policyError) {
      console.log('❌ Error fetching RLS policies:', policyError);
    } else {
      console.log('✅ RLS policies:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   Policy: ${policy.policyname}`);
          console.log(`   Command: ${policy.cmd}`);
          console.log(`   Roles: ${policy.roles}`);
          console.log(`   Qual: ${policy.qual}`);
        });
      } else {
        console.log('   No RLS policies found');
      }
    }
    
    // Kiểm tra quyền truy cập
    console.log('\n3. Testing permissions...');
    
    // Thử insert một row test
    console.log('   Testing INSERT permission...');
    const { data: insertResult, error: insertError } = await supabase
      .from('trading_bots')
      .insert({
        name: 'test-bot',
        project_id: 'test-project',
        experiment_id: 'test-experiment',
        status: 'idle'
      })
      .select();
    
    if (insertError) {
      console.log('   ❌ INSERT failed:', insertError.message);
    } else {
      console.log('   ✅ INSERT successful');
      // Xóa row test
      await supabase
        .from('trading_bots')
        .delete()
        .eq('name', 'test-bot');
    }
    
    // Thử update
    console.log('   Testing UPDATE permission...');
    const { data: updateResult, error: updateError } = await supabase
      .from('trading_bots')
      .update({ status: 'running' })
      .eq('name', 'Ichi5p-test')
      .select();
    
    if (updateError) {
      console.log('   ❌ UPDATE failed:', updateError.message);
    } else {
      console.log('   ✅ UPDATE successful');
      console.log('   Updated rows:', updateResult);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkTableStructure();
