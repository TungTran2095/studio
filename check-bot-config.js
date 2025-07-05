const { createClient } = require('@supabase/supabase-js');

// Tạo Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

async function checkBotConfig() {
  try {
    console.log('🔍 Đang tìm bot real23...');
    
    const { data, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('name', 'real23')
      .single();
    
    if (error) {
      console.error('❌ Lỗi khi tìm bot:', error);
      return;
    }
    
    if (!data) {
      console.log('❌ Không tìm thấy bot real23');
      return;
    }
    
    console.log('✅ Tìm thấy bot real23:');
    console.log('ID:', data.id);
    console.log('Name:', data.name);
    console.log('Status:', data.status);
    console.log('Testnet:', data.config?.account?.testnet);
    console.log('API Key length:', data.config?.account?.apiKey?.length || 0);
    console.log('API Secret length:', data.config?.account?.apiSecret?.length || 0);
    
    // Kiểm tra API key có đúng format không
    const apiKey = data.config?.account?.apiKey;
    if (apiKey) {
      console.log('API Key starts with:', apiKey.substring(0, 10) + '...');
      console.log('API Key ends with:', '...' + apiKey.substring(apiKey.length - 10));
    }
    
  } catch (err) {
    console.error('❌ Lỗi:', err);
  }
}

checkBotConfig(); 