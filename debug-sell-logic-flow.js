// Debug script cho logic flow của SELL signal
function debugSellLogicFlow() {
  console.log('🔍 Debugging SELL Signal Logic Flow...\n');
  
  // Test case từ log thực tế của bot
  const testCase = {
    name: 'Real Bot Data',
    signal: 'sell',
    currentPosition: null,
    hasRealPosition: true, // Bot có BTC để bán
    isRunning: true
  };
  
  console.log('📊 Test Case:', testCase.name);
  console.log(`   Signal: ${testCase.signal}`);
  console.log(`   Current Position: ${testCase.currentPosition}`);
  console.log(`   Has Real Position: ${testCase.hasRealPosition}`);
  console.log(`   Is Running: ${testCase.isRunning}`);
  console.log('');
  
  // Test logic flow từng bước
  console.log('🔍 Testing Logic Flow Step by Step:');
  
  // 1. BUY condition
  const buyCondition = testCase.signal === 'buy' && !testCase.currentPosition && !testCase.hasRealPosition;
  console.log(`1️⃣ BUY Condition: signal === 'buy' && !currentPosition && !hasRealPosition`);
  console.log(`   ${testCase.signal === 'buy'} && ${!testCase.currentPosition} && ${!testCase.hasRealPosition} = ${buyCondition}`);
  console.log(`   Result: ${buyCondition ? '✅ EXECUTE BUY' : '❌ Skip BUY'}`);
  console.log('');
  
  // 2. SELL condition
  const sellCondition = testCase.signal === 'sell' && testCase.hasRealPosition;
  console.log(`2️⃣ SELL Condition: signal === 'sell' && hasRealPosition`);
  console.log(`   ${testCase.signal === 'sell'} && ${testCase.hasRealPosition} = ${sellCondition}`);
  console.log(`   Result: ${sellCondition ? '✅ EXECUTE SELL' : '❌ Skip SELL'}`);
  console.log('');
  
  // 3. Local position condition
  const localPositionCondition = testCase.currentPosition && !testCase.hasRealPosition;
  console.log(`3️⃣ Local Position Condition: currentPosition && !hasRealPosition`);
  console.log(`   ${testCase.currentPosition} && ${!testCase.hasRealPosition} = ${localPositionCondition}`);
  console.log(`   Result: ${localPositionCondition ? '✅ Manage Local Position' : '❌ Skip Local Position'}`);
  console.log('');
  
  // 4. Real position condition
  const realPositionCondition = testCase.hasRealPosition && !testCase.currentPosition;
  console.log(`4️⃣ Real Position Condition: hasRealPosition && !currentPosition`);
  console.log(`   ${testCase.hasRealPosition} && ${!testCase.currentPosition} = ${realPositionCondition}`);
  console.log(`   Result: ${realPositionCondition ? '✅ Sync Real Position' : '❌ Skip Real Position'}`);
  console.log('');
  
  // 5. Logic flow analysis
  console.log('5️⃣ Logic Flow Analysis:');
  console.log(`   Signal: ${testCase.signal}`);
  console.log(`   Current Position: ${testCase.currentPosition}`);
  console.log(`   Has Real Position: ${testCase.hasRealPosition}`);
  console.log('');
  
  console.log(`   Buy Condition: ${buyCondition}`);
  console.log(`   Sell Condition: ${sellCondition}`);
  console.log(`   Local Position Condition: ${localPositionCondition}`);
  console.log(`   Real Position Condition: ${realPositionCondition}`);
  console.log('');
  
  // 6. Expected behavior
  console.log('6️⃣ Expected Behavior:');
  if (sellCondition) {
    console.log(`   ✅ Bot SHOULD execute SELL signal because:`);
    console.log(`      - Signal is '${testCase.signal}'`);
    console.log(`      - Has real position (${testCase.hasRealPosition})`);
    console.log(`      - SELL condition is TRUE`);
  } else {
    console.log(`   ❌ Bot will NOT execute SELL signal because:`);
    console.log(`      - SELL condition is FALSE`);
    if (testCase.signal !== 'sell') {
      console.log(`      - Signal is '${testCase.signal}', not 'sell'`);
    }
    if (!testCase.hasRealPosition) {
      console.log(`      - No real position (${testCase.hasRealPosition})`);
    }
  }
  console.log('');
  
  // 7. Debugging suggestions
  console.log('7️⃣ Debugging Suggestions:');
  if (sellCondition) {
    console.log(`   ✅ SELL condition is TRUE - Bot should execute SELL`);
    console.log(`   🔍 Check if there are other conditions blocking execution`);
    console.log(`   🔍 Check if signal is actually 'sell' and not null/undefined`);
    console.log(`   🔍 Check if hasRealPosition is actually true`);
  } else {
    console.log(`   ❌ SELL condition is FALSE - Bot will not execute SELL`);
    console.log(`   🔍 Check signal value: ${testCase.signal}`);
    console.log(`   🔍 Check hasRealPosition value: ${testCase.hasRealPosition}`);
    console.log(`   🔍 Check currentPosition value: ${testCase.currentPosition}`);
  }
  console.log('');
  
  // 8. Common issues
  console.log('8️⃣ Common Issues to Check:');
  console.log(`   🔍 Signal calculation: Is Ichimoku actually returning 'sell'?`);
  console.log(`   🔍 Balance check: Is checkBalanceForSignal returning true?`);
  console.log(`   🔍 Position sync: Is hasRealPosition correctly calculated?`);
  console.log(`   🔍 Logic order: Are conditions checked in correct order?`);
  console.log('');
  
  // 9. Test with different scenarios
  console.log('9️⃣ Test Different Scenarios:');
  
  const scenarios = [
    { signal: 'sell', currentPosition: null, hasRealPosition: true, expected: 'EXECUTE SELL' },
    { signal: 'sell', currentPosition: null, hasRealPosition: false, expected: 'SKIP SELL (no BTC)' },
    { signal: 'buy', currentPosition: null, hasRealPosition: false, expected: 'EXECUTE BUY' },
    { signal: 'buy', currentPosition: null, hasRealPosition: true, expected: 'SKIP BUY (has BTC)' },
    { signal: null, currentPosition: null, hasRealPosition: true, expected: 'NO ACTION (no signal)' }
  ];
  
  scenarios.forEach((scenario, index) => {
    const sellCond = scenario.signal === 'sell' && scenario.hasRealPosition;
    const buyCond = scenario.signal === 'buy' && !scenario.currentPosition && !scenario.hasRealPosition;
    
    console.log(`   Scenario ${index + 1}: ${scenario.signal} | ${scenario.currentPosition} | ${scenario.hasRealPosition}`);
    console.log(`      SELL condition: ${sellCond} | BUY condition: ${buyCond}`);
    console.log(`      Expected: ${scenario.expected}`);
    console.log(`      Actual: ${sellCond ? 'EXECUTE SELL' : buyCond ? 'EXECUTE BUY' : 'NO ACTION'}`);
    console.log('');
  });
  
  // 10. Conclusion
  console.log('🔟 Conclusion:');
  if (sellCondition) {
    console.log(`   ✅ SELL condition is TRUE - Bot should execute SELL signal`);
    console.log(`   💡 If bot is not executing SELL, check other blocking conditions`);
    console.log(`   💡 Look for logs showing 'Executing SELL signal (has BTC to sell)'`);
  } else {
    console.log(`   ❌ SELL condition is FALSE - Bot will not execute SELL signal`);
    console.log(`   💡 Check why SELL condition is false`);
    console.log(`   💡 Verify signal value and hasRealPosition value`);
  }
}

// Chạy debug
debugSellLogicFlow();
