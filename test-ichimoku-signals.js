// Test script cho logic Ichimoku mới
function testIchimokuLogic() {
  console.log('🧪 Testing Ichimoku Signal Logic...\n');
  
  // Test case từ log thực tế của bot
  const testCase = {
    name: 'Real Bot Data',
    price: 111087.99,
    tenkan: 111254.9888888889,
    kijun: 111252.02307692311,
    senkouA: 111253.505982906,
    senkouB: 111523.80211538463
  };
  
  console.log('📊 Test Case:', testCase.name);
  console.log(`   Price: ${testCase.price}`);
  console.log(`   Tenkan: ${testCase.tenkan.toFixed(2)}`);
  console.log(`   Kijun: ${testCase.kijun.toFixed(2)}`);
  console.log(`   Senkou A: ${testCase.senkouA.toFixed(2)}`);
  console.log(`   Senkou B: ${testCase.senkouB.toFixed(2)}`);
  console.log('');
  
  // Test logic cũ (quá nghiêm ngặt)
  console.log('🔍 Testing OLD Logic (Too Strict):');
  const oldBuySignal = testCase.price > testCase.tenkan && 
                      testCase.price > testCase.kijun && 
                      testCase.tenkan > testCase.kijun;
  
  const oldSellSignal = testCase.price < testCase.tenkan && 
                       testCase.price < testCase.kijun && 
                       testCase.tenkan < testCase.kijun;
  
  console.log(`   BUY Signal: ${oldBuySignal ? '✅ YES' : '❌ NO'}`);
  console.log(`   SELL Signal: ${oldSellSignal ? '✅ YES' : '❌ NO'}`);
  console.log(`   Result: ${oldBuySignal ? 'BUY' : oldSellSignal ? 'SELL' : 'NO SIGNAL'}`);
  console.log('');
  
  // Test logic mới (thực tế hơn)
  console.log('🔍 Testing NEW Logic (More Realistic):');
  
  // 1. BUY Signal - Tenkan above Kijun, Price above Tenkan
  const newBuySignal1 = testCase.tenkan > testCase.kijun && testCase.price > testCase.tenkan;
  console.log(`   1. BUY: Tenkan > Kijun AND Price > Tenkan: ${newBuySignal1 ? '✅ YES' : '❌ NO'}`);
  
  // 2. SELL Signal - Tenkan below Kijun, Price below Tenkan  
  const newSellSignal1 = testCase.tenkan < testCase.kijun && testCase.price < testCase.tenkan;
  console.log(`   2. SELL: Tenkan < Kijun AND Price < Tenkan: ${newSellSignal1 ? '✅ YES' : '❌ NO'}`);
  
  // 3. BUY Signal - Price above both lines
  const newBuySignal2 = testCase.price > testCase.tenkan && testCase.price > testCase.kijun;
  console.log(`   3. BUY: Price > Tenkan AND Price > Kijun: ${newBuySignal2 ? '✅ YES' : '❌ NO'}`);
  
  // 4. SELL Signal - Price below both lines
  const newSellSignal2 = testCase.price < testCase.tenkan && testCase.price < testCase.kijun;
  console.log(`   4. SELL: Price < Tenkan AND Price < Kijun: ${newSellSignal2 ? '✅ YES' : '❌ NO'}`);
  
  // 5. BUY Signal - Bullish momentum
  const newBuySignal3 = testCase.tenkan > testCase.kijun;
  console.log(`   5. BUY: Tenkan > Kijun (Bullish momentum): ${newBuySignal3 ? '✅ YES' : '❌ NO'}`);
  
  // 6. SELL Signal - Bearish momentum
  const newSellSignal3 = testCase.tenkan < testCase.kijun;
  console.log(`   6. SELL: Tenkan < Kijun (Bearish momentum): ${newSellSignal3 ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  // Kết quả cuối cùng
  const finalBuySignal = newBuySignal1 || newBuySignal2 || newBuySignal3;
  const finalSellSignal = newSellSignal1 || newSellSignal2 || newSellSignal3;
  
  console.log('📊 Final Results:');
  console.log(`   BUY Signal: ${finalBuySignal ? '✅ YES' : '❌ NO'}`);
  console.log(`   SELL Signal: ${finalSellSignal ? '✅ YES' : '❌ NO'}`);
  console.log(`   Final Signal: ${finalBuySignal ? 'BUY' : finalSellSignal ? 'SELL' : 'NO SIGNAL'}`);
  console.log('');
  
  // Phân tích chi tiết
  console.log('🔍 Detailed Analysis:');
  console.log(`   Price vs Tenkan: ${testCase.price > testCase.tenkan ? 'Price ABOVE Tenkan' : 'Price BELOW Tenkan'}`);
  console.log(`   Price vs Kijun: ${testCase.price > testCase.kijun ? 'Price ABOVE Kijun' : 'Price BELOW Kijun'}`);
  console.log(`   Tenkan vs Kijun: ${testCase.tenkan > testCase.kijun ? 'Tenkan ABOVE Kijun (Bullish)' : 'Tenkan BELOW Kijun (Bearish)'}`);
  console.log('');
  
  // Giải thích tại sao có/không có signal
  if (finalBuySignal) {
    console.log('💡 BUY Signal Explanation:');
    if (newBuySignal1) console.log('   - Tenkan above Kijun AND Price above Tenkan (Strong bullish momentum)');
    if (newBuySignal2) console.log('   - Price above both Tenkan and Kijun (Strong bullish trend)');
    if (newBuySignal3) console.log('   - Tenkan above Kijun (Bullish momentum)');
  } else if (finalSellSignal) {
    console.log('💡 SELL Signal Explanation:');
    if (newSellSignal1) console.log('   - Tenkan below Kijun AND Price below Tenkan (Strong bearish momentum)');
    if (newSellSignal2) console.log('   - Price below both Tenkan and Kijun (Strong bearish trend)');
    if (newSellSignal3) console.log('   - Tenkan below Kijun (Bearish momentum)');
  } else {
    console.log('💡 No Signal Explanation:');
    console.log('   - Market is in sideways/consolidation phase');
    console.log('   - No clear trend direction');
    console.log('   - Wait for stronger momentum signals');
  }
  
  console.log('');
  console.log('🎯 Conclusion:');
  console.log(`   OLD Logic: ${oldBuySignal ? 'BUY' : oldSellSignal ? 'SELL' : 'NO SIGNAL'} (Too strict)`);
  console.log(`   NEW Logic: ${finalBuySignal ? 'BUY' : finalSellSignal ? 'SELL' : 'NO SIGNAL'} (More realistic)`);
  console.log(`   Improvement: ${finalBuySignal || finalSellSignal ? '✅ Bot will now generate signals!' : '❌ Still no signal (market conditions)'}`);
}

// Chạy test
testIchimokuLogic();
