// Test API với API key thật
async function testAccountAPI() {
  try {
    console.log('🧪 Testing Account API...');
    
    // API key testnet mẫu (thay thế bằng API key thật của bạn)
    const testData = {
      apiKey: 'UrsDp0aGxKhpBaR8ELTWyJaAMLMUlDXHk038kx2XeqVQYm7DBQh4zJHxR6Veuryw',
      apiSecret: 'IqoUeRkJiUMkb4ly9VLXfzYsxaNOgvkV9CoxGJbByoyhehwKJ1CsI5EgA7ues937',
      isTestnet: true
    };
    
    console.log('📤 Sending request to /api/trading/binance/account...');
    console.log('API Key:', testData.apiKey.substring(0, 10) + '...');
    console.log('Testnet:', testData.isTestnet);
    
    const response = await fetch('http://localhost:3000/api/trading/binance/account', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Success response:');
    console.log('Account info keys:', Object.keys(data));
    
    if (data.balances) {
      console.log('Balances count:', data.balances.length);
      const usdtBalance = data.balances.find(b => b.asset === 'USDT');
      if (usdtBalance) {
        console.log('USDT Balance:', usdtBalance.free);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAccountAPI(); 