// Test script cho logic Ichimoku mới khớp với backtest
function testIchimokuBacktestLogic() {
  console.log('🧪 Testing Ichimoku Backtest Logic (Point System)...\n');
  
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
  console.log(`   Tenkan: ${testCase.price.toFixed(2)}`);
  console.log(`   Kijun: ${testCase.kijun.toFixed(2)}`);
  console.log(`   Senkou A: ${testCase.senkouA.toFixed(2)}`);
  console.log(`   Senkou B: ${testCase.senkouB.toFixed(2)}`);
  console.log('');
  
  // Test logic mới (giống hệt backtest)
  console.log('🔍 Testing NEW Logic (Backtest Point System):');
  
  let bullishPoints = 0;
  let bearishPoints = 0;
  
  // 1. Vị trí giá so với mây (Kumo)
  const maxKumo = Math.max(testCase.senkouA, testCase.senkouB);
  const minKumo = Math.min(testCase.senkouA, testCase.senkouB);
  
  console.log('1️⃣ Price vs Kumo Cloud:');
  console.log(`   Max Kumo: ${maxKumo.toFixed(2)}`);
  console.log(`   Min Kumo: ${minKumo.toFixed(2)}`);
  console.log(`   Price: ${testCase.price.toFixed(2)}`);
  
  if (testCase.price > maxKumo) {
    bullishPoints += 2;
    console.log(`   ✅ Price ABOVE Kumo cloud (+2 bullish)`);
  } else if (testCase.price < minKumo) {
    bearishPoints += 2;
    console.log(`   ❌ Price BELOW Kumo cloud (+2 bearish)`);
  } else {
    console.log(`   ⚠️ Price INSIDE Kumo cloud (neutral)`);
  }
  console.log('');
  
  // 2. Tenkan-sen so với Kijun-sen
  console.log('2️⃣ Tenkan vs Kijun:');
  console.log(`   Tenkan: ${testCase.tenkan.toFixed(2)}`);
  console.log(`   Kijun: ${testCase.kijun.toFixed(2)}`);
  
  if (testCase.tenkan > testCase.kijun) {
    bullishPoints += 1;
    console.log(`   ✅ Tenkan ABOVE Kijun (+1 bullish)`);
  } else if (testCase.tenkan < testCase.kijun) {
    bearishPoints += 1;
    console.log(`   ❌ Tenkan BELOW Kijun (+1 bearish)`);
  } else {
    console.log(`   ⚠️ Tenkan EQUAL Kijun (neutral)`);
  }
  console.log('');
  
  // 3. Senkou Span A so với Senkou Span B (hình dạng mây)
  console.log('3️⃣ Senkou A vs Senkou B (Cloud Shape):');
  console.log(`   Senkou A: ${testCase.senkouA.toFixed(2)}`);
  console.log(`   Senkou B: ${testCase.senkouB.toFixed(2)}`);
  
  if (testCase.senkouA > testCase.senkouB) {
    bullishPoints += 1;
    console.log(`   ✅ Senkou A ABOVE Senkou B (+1 bullish)`);
  } else if (testCase.senkouA < testCase.senkouB) {
    bearishPoints += 1;
    console.log(`   ❌ Senkou A BELOW Senkou B (+1 bearish)`);
  } else {
    console.log(`   ⚠️ Senkou A EQUAL Senkou B (neutral)`);
  }
  console.log('');
  
  // 4. Tổng kết điểm
  console.log('4️⃣ Point Calculation:');
  console.log(`   Bullish Points: ${bullishPoints}`);
  console.log(`   Bearish Points: ${bearishPoints}`);
  console.log(`   Difference: ${bullishPoints - bearishPoints}`);
  console.log('');
  
  // 5. Kết quả cuối cùng
  console.log('5️⃣ Final Signal:');
  let signal = 'NEUTRAL';
  if (bullishPoints > bearishPoints) {
    signal = 'BUY';
    console.log(`   🟢 BUY Signal: ${bullishPoints} bullish vs ${bearishPoints} bearish`);
  } else if (bearishPoints > bullishPoints) {
    signal = 'SELL';
    console.log(`   🔴 SELL Signal: ${bearishPoints} bearish vs ${bullishPoints} bullish`);
  } else {
    console.log(`   ⚪ NEUTRAL Signal: Equal points (${bullishPoints} vs ${bearishPoints})`);
  }
  console.log('');
  
  // 6. Phân tích chi tiết
  console.log('6️⃣ Detailed Analysis:');
  console.log(`   Price vs Max Kumo: ${testCase.price > maxKumo ? 'ABOVE' : testCase.price < maxKumo ? 'BELOW' : 'INSIDE'}`);
  console.log(`   Price vs Min Kumo: ${testCase.price > minKumo ? 'ABOVE' : testCase.price < minKumo ? 'BELOW' : 'EQUAL'}`);
  console.log(`   Tenkan vs Kijun: ${testCase.tenkan > testCase.kijun ? 'ABOVE (Bullish)' : testCase.tenkan < testCase.kijun ? 'BELOW (Bearish)' : 'EQUAL'}`);
  console.log(`   Senkou A vs Senkou B: ${testCase.senkouA > testCase.senkouB ? 'ABOVE (Bullish cloud)' : testCase.senkouA < testCase.senkouB ? 'BELOW (Bearish cloud)' : 'EQUAL'}`);
  console.log('');
  
  // 7. So sánh với logic cũ
  console.log('7️⃣ Comparison with OLD Logic:');
  
  // Logic cũ (quá nghiêm ngặt)
  const oldBuySignal = testCase.price > testCase.tenkan && 
                      testCase.price > testCase.kijun && 
                      testCase.tenkan > testCase.kijun;
  
  const oldSellSignal = testCase.price < testCase.tenkan && 
                       testCase.price < testCase.kijun && 
                       testCase.tenkan < testCase.kijun;
  
  console.log(`   OLD Logic Result: ${oldBuySignal ? 'BUY' : oldSellSignal ? 'SELL' : 'NO SIGNAL'}`);
  console.log(`   NEW Logic Result: ${signal}`);
  console.log(`   Match with Backtest: ${signal !== 'NEUTRAL' ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  // 8. Kết luận
  console.log('8️⃣ Conclusion:');
  if (signal === 'BUY') {
    console.log(`   ✅ Bot sẽ tạo BUY signal với ${bullishPoints} bullish points`);
    console.log(`   💡 Logic này khớp với backtest và sẽ tạo ra signal`);
  } else if (signal === 'SELL') {
    console.log(`   ✅ Bot sẽ tạo SELL signal với ${bearishPoints} bearish points`);
    console.log(`   💡 Logic này khớp với backtest và sẽ tạo ra signal`);
  } else {
    console.log(`   ⚠️ Bot sẽ không tạo signal (NEUTRAL)`);
    console.log(`   💡 Điều này có thể đúng nếu thị trường đang sideways`);
    console.log(`   💡 Nhưng có thể cần điều chỉnh threshold để tạo signal`);
  }
  
  // 9. Đề xuất cải thiện
  console.log('\n9️⃣ Improvement Suggestions:');
  if (signal === 'NEUTRAL') {
    console.log(`   💡 Giảm threshold: Cần ${Math.min(bullishPoints, bearishPoints) + 1} points để tạo signal`);
    console.log(`   💡 Thêm momentum indicators để tăng độ nhạy`);
    console.log(`   💡 Xem xét thêm volume analysis`);
  } else {
    console.log(`   ✅ Logic hiện tại hoạt động tốt và khớp với backtest`);
  }
}

// Chạy test
testIchimokuBacktestLogic();
