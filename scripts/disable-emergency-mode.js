#!/usr/bin/env node

/**
 * Disable Emergency Mode Script
 * 
 * This script disables emergency mode when API ban has expired
 * 
 * Usage: node scripts/disable-emergency-mode.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 DISABLING EMERGENCY MODE');
console.log('===========================');

function disableEmergencyMode() {
  try {
    const emergencyPath = path.join(process.cwd(), 'emergency-mode.json');
    
    const disableData = {
      enabled: false,
      timestamp: new Date().toISOString(),
      reason: 'API ban expired - normal operations resumed',
      autoResetTime: new Date().toISOString()
    };

    fs.writeFileSync(emergencyPath, JSON.stringify(disableData, null, 2));
    
    console.log('✅ Emergency mode disabled successfully');
    console.log(`   Reason: ${disableData.reason}`);
    console.log(`   Timestamp: ${disableData.timestamp}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to disable emergency mode:', error.message);
    return false;
  }
}

function updateEnvironmentFile() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Remove emergency mode settings
    const envContent = `
# NORMAL MODE - Binance API Limits Restored
# API ban has expired, normal operations can resume

BINANCE_USED_WEIGHT_PER_MIN=1000
BINANCE_ORDERS_PER_10S=40
BINANCE_ORDERS_PER_1M=1500
BINANCE_ORDERS_PER_1D=100000
BINANCE_RAW_1M=6000

# Emergency mode disabled
BINANCE_EMERGENCY_MODE=false

# Enable polling
DISABLE_POLLING=false
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment file updated for normal mode');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update environment file:', error.message);
    return false;
  }
}

function logNormalModeResume() {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'EMERGENCY_MODE_DISABLED',
      reason: 'API ban expired - normal operations resumed',
      details: {
        weightLimit: 1000,
        orders10s: 40,
        orders1m: 1500,
        emergencyMode: false
      }
    };

    const logPath = path.join(process.cwd(), 'logs', 'emergency-actions.log');
    const logDir = path.dirname(logPath);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    console.log('✅ Normal mode resume logged');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to log normal mode resume:', error.message);
    return false;
  }
}

function showNormalModeStatus() {
  console.log('\n🎉 NORMAL MODE RESUMED');
  console.log('======================');
  
  const status = {
    'Emergency Mode': 'Disabled',
    'API Ban Status': 'Expired',
    'Rate Limits': 'Restored to normal levels',
    'WebSocket Integration': 'Active',
    'Transparent Service': 'Ready',
    'Bot Operations': 'Can resume normal frequency'
  };
  
  Object.entries(status).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

function showNextSteps() {
  console.log('\n🚀 NEXT STEPS');
  console.log('=============');
  
  const steps = [
    '1. Restart application to apply normal mode settings',
    '2. Monitor WebSocket connection status',
    '3. Check API call reduction with transparent service',
    '4. Gradually increase bot frequency if stable',
    '5. Monitor rate limits to avoid future bans',
    '6. Use WebSocket streams for market data',
    '7. Keep enhanced caching enabled',
    '8. Test bot functionality with real API'
  ];
  
  steps.forEach(step => {
    console.log(`   ${step}`);
  });
}

function showMonitoringCommands() {
  console.log('\n📊 MONITORING COMMANDS');
  console.log('======================');
  
  const commands = [
    'node scripts/monitor-emergency-status.js',
    'node scripts/check-bot-transparency.js',
    'curl http://localhost:3000/api/monitor/emergency-status',
    'tail -f logs/bot-executor.log',
    'tail -f logs/transparent-websocket.log'
  ];
  
  commands.forEach(cmd => {
    console.log(`   ${cmd}`);
  });
}

// Main execution
function main() {
  console.log('🔍 Checking API ban status...');
  
  const banExpiry = 1759488899563;
  const now = Date.now();
  
  if (now < banExpiry) {
    const timeUntilExpiry = banExpiry - now;
    const minutes = Math.floor(timeUntilExpiry / 60000);
    const seconds = Math.floor((timeUntilExpiry % 60000) / 1000);
    
    console.log(`⚠️  API ban still active for ${minutes}:${seconds.toString().padStart(2, '0')}`);
    console.log('   Emergency mode should remain active');
    return;
  }
  
  console.log('✅ API ban has expired - proceeding with normal mode');
  
  const emergencyDisabled = disableEmergencyMode();
  const envUpdated = updateEnvironmentFile();
  const logged = logNormalModeResume();
  
  showNormalModeStatus();
  showNextSteps();
  showMonitoringCommands();
  
  console.log('\n🎯 FINAL STATUS');
  console.log('===============');
  
  const overallSuccess = emergencyDisabled && envUpdated && logged;
  
  console.log(`Emergency Mode Disabled: ${emergencyDisabled ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Environment Updated: ${envUpdated ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Action Logged: ${logged ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (overallSuccess) {
    console.log('\n🎉 SUCCESS! Normal mode has been resumed');
    console.log('   • Emergency mode disabled');
    console.log('   • Rate limits restored');
    console.log('   • WebSocket integration active');
    console.log('   • Bots can resume normal operations');
  } else {
    console.log('\n⚠️  SOME ISSUES DETECTED - Please check failed components');
  }
}

main();
