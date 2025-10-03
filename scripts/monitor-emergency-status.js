#!/usr/bin/env node

/**
 * Emergency Status Monitor Script
 * 
 * This script monitors the emergency mode status and provides
 * real-time updates on the IP ban situation.
 * 
 * Usage: node scripts/monitor-emergency-status.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY STATUS MONITOR');
console.log('============================');

function checkEmergencyStatus() {
  try {
    const emergencyPath = path.join(process.cwd(), 'emergency-mode.json');
    
    if (!fs.existsSync(emergencyPath)) {
      console.log('✅ No emergency mode active');
      return false;
    }

    const emergencyData = JSON.parse(fs.readFileSync(emergencyPath, 'utf8'));
    
    if (!emergencyData.enabled) {
      console.log('✅ Emergency mode is disabled');
      return false;
    }

    const now = new Date();
    const resetTime = new Date(emergencyData.autoResetTime);
    const timeUntilReset = resetTime.getTime() - now.getTime();

    console.log('\n🚨 EMERGENCY MODE ACTIVE');
    console.log('========================');
    console.log(`Reason: ${emergencyData.reason}`);
    console.log(`Started: ${new Date(emergencyData.timestamp).toLocaleString()}`);
    console.log(`Auto-reset: ${resetTime.toLocaleString()}`);
    
    if (timeUntilReset > 0) {
      const minutes = Math.floor(timeUntilReset / 60000);
      const seconds = Math.floor((timeUntilReset % 60000) / 1000);
      console.log(`Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    } else {
      console.log('⏰ Auto-reset time reached');
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking emergency status:', error.message);
    return false;
  }
}

function checkIPBanStatus() {
  const banExpiry = 1759488899563;
  const now = Date.now();
  
  if (now >= banExpiry) {
    console.log('✅ IP ban has expired');
    return false;
  }

  const timeUntilExpiry = banExpiry - now;
  const minutes = Math.floor(timeUntilExpiry / 60000);
  const seconds = Math.floor((timeUntilExpiry % 60000) / 1000);

  console.log('\n🚫 IP BAN STATUS');
  console.log('=================');
  console.log(`Ban expires: ${new Date(banExpiry).toLocaleString()}`);
  console.log(`Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  
  return true;
}

function checkRecentLogs() {
  try {
    const logPath = path.join(process.cwd(), 'logs', 'emergency-actions.log');
    
    if (!fs.existsSync(logPath)) {
      console.log('📝 No emergency logs found');
      return;
    }

    const logs = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    const recentLogs = logs.slice(-5); // Last 5 entries

    console.log('\n📝 RECENT EMERGENCY ACTIONS');
    console.log('============================');
    
    recentLogs.forEach((log, index) => {
      try {
        const logEntry = JSON.parse(log);
        const timestamp = new Date(logEntry.timestamp).toLocaleString();
        console.log(`${index + 1}. [${timestamp}] ${logEntry.action}`);
        if (logEntry.reason) {
          console.log(`   Reason: ${logEntry.reason}`);
        }
      } catch (error) {
        console.log(`${index + 1}. ${log}`);
      }
    });
  } catch (error) {
    console.error('❌ Error reading logs:', error.message);
  }
}

function showRecommendations() {
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');
  console.log('1. Wait for IP ban to expire naturally');
  console.log('2. Do NOT restart the application yet');
  console.log('3. Monitor emergency-mode.json for auto-reset');
  console.log('4. Use WebSocket instead of REST API when possible');
  console.log('5. Implement proper caching to reduce API calls');
  console.log('6. Consider using multiple API keys for load balancing');
}

// Main monitoring loop
function startMonitoring() {
  console.clear();
  console.log('🚨 EMERGENCY STATUS MONITOR');
  console.log('============================');
  console.log(`Last check: ${new Date().toLocaleString()}`);
  
  const emergencyActive = checkEmergencyStatus();
  const ipBanned = checkIPBanStatus();
  
  checkRecentLogs();
  showRecommendations();
  
  if (emergencyActive || ipBanned) {
    console.log('\n⏰ Next check in 30 seconds...');
    setTimeout(startMonitoring, 30000);
  } else {
    console.log('\n✅ All systems normal - monitoring stopped');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped');
  process.exit(0);
});

// Start monitoring
startMonitoring();
