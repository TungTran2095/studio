/**
 * Comprehensive Binance API Usage Management System
 * Prevents HTTP 418 errors through intelligent rate limiting and monitoring
 */

interface APIEndpoint {
  path: string;
  weight: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'account' | 'market' | 'order' | 'system';
}

interface APIUsageRecord {
  endpoint: string;
  weight: number;
  timestamp: number;
  success: boolean;
  responseTime: number;
}

interface UsageLimits {
  weightPerMinute: number;
  callsPerMinute: number;
  emergencyThreshold: number;
  warningThreshold: number;
}

export class BinanceAPIUsageManager {
  private usageHistory: APIUsageRecord[] = [];
  private currentWeight = 0;
  private currentCalls = 0;
  private lastResetTime = Date.now();
  private emergencyMode = false;
  private circuitBreakerOpen = false;
  
  // Binance API limits (conservative)
  private limits: UsageLimits = {
    weightPerMinute: 1000, // Conservative limit
    callsPerMinute: 1200,  // Conservative limit
    emergencyThreshold: 90, // 90% of limit
    warningThreshold: 70    // 70% of limit
  };

  // API endpoint definitions with weights
  private endpoints: Record<string, APIEndpoint> = {
    '/api/v3/account': { path: '/api/v3/account', weight: 10, priority: 'critical', category: 'account' },
    '/api/v3/order': { path: '/api/v3/order', weight: 1, priority: 'critical', category: 'order' },
    '/api/v3/ticker/price': { path: '/api/v3/ticker/price', weight: 1, priority: 'medium', category: 'market' },
    '/api/v3/ticker/24hr': { path: '/api/v3/ticker/24hr', weight: 1, priority: 'medium', category: 'market' },
    '/api/v3/klines': { path: '/api/v3/klines', weight: 1, priority: 'high', category: 'market' },
    '/api/v3/depth': { path: '/api/v3/depth', weight: 1, priority: 'medium', category: 'market' },
    '/api/v3/exchangeInfo': { path: '/api/v3/exchangeInfo', weight: 10, priority: 'low', category: 'system' },
    '/api/v3/time': { path: '/api/v3/time', weight: 1, priority: 'low', category: 'system' },
    '/api/v3/myTrades': { path: '/api/v3/myTrades', weight: 10, priority: 'medium', category: 'account' },
    '/api/v3/openOrders': { path: '/api/v3/openOrders', weight: 3, priority: 'high', category: 'account' }
  };

  constructor() {
    // Clean up old records every minute
    setInterval(() => this.cleanupOldRecords(), 60000);
    
    // Reset counters every minute
    setInterval(() => this.resetCounters(), 60000);
    
    console.log('[BinanceAPIUsageManager] ✅ Initialized with conservative limits');
  }

  /**
   * Check if API call is allowed based on current usage
   */
  canMakeCall(endpoint: string): { allowed: boolean; reason?: string; waitTime?: number } {
    const endpointInfo = this.endpoints[endpoint];
    if (!endpointInfo) {
      return { allowed: false, reason: 'Unknown endpoint' };
    }

    // Check emergency mode
    if (this.emergencyMode) {
      return { allowed: false, reason: 'Emergency mode active' };
    }

    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      return { allowed: false, reason: 'Circuit breaker open' };
    }

    // Check weight limit
    if (this.currentWeight + endpointInfo.weight > this.limits.weightPerMinute) {
      const waitTime = this.calculateWaitTime();
      return { allowed: false, reason: 'Weight limit exceeded', waitTime };
    }

    // Check calls limit
    if (this.currentCalls >= this.limits.callsPerMinute) {
      const waitTime = this.calculateWaitTime();
      return { allowed: false, reason: 'Calls limit exceeded', waitTime };
    }

    // Check emergency threshold
    const weightPercentage = (this.currentWeight / this.limits.weightPerMinute) * 100;
    if (weightPercentage >= this.limits.emergencyThreshold) {
      this.enableEmergencyMode();
      return { allowed: false, reason: 'Emergency threshold reached' };
    }

    return { allowed: true };
  }

  /**
   * Record API call usage
   */
  recordAPICall(endpoint: string, success: boolean, responseTime: number): void {
    const endpointInfo = this.endpoints[endpoint];
    if (!endpointInfo) return;

    const record: APIUsageRecord = {
      endpoint,
      weight: endpointInfo.weight,
      timestamp: Date.now(),
      success,
      responseTime
    };

    this.usageHistory.push(record);
    this.currentWeight += endpointInfo.weight;
    this.currentCalls++;

    // Check for HTTP 418 errors
    if (!success && endpoint.includes('418')) {
      console.warn('[BinanceAPIUsageManager] ⚠️ HTTP 418 detected, enabling emergency mode');
      this.enableEmergencyMode();
    }

    // Log usage
    console.log(`[BinanceAPIUsageManager] 📊 API Call: ${endpoint} (weight: ${endpointInfo.weight}, success: ${success})`);
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): {
    currentWeight: number;
    maxWeight: number;
    weightPercentage: number;
    currentCalls: number;
    maxCalls: number;
    callsPercentage: number;
    emergencyMode: boolean;
    circuitBreakerOpen: boolean;
    endpointBreakdown: Array<{
      endpoint: string;
      weight: number;
      calls: number;
      lastCall: number;
    }>;
    recommendations: string[];
  } {
    const endpointBreakdown = this.getEndpointBreakdown();
    const recommendations = this.generateRecommendations();

    return {
      currentWeight: this.currentWeight,
      maxWeight: this.limits.weightPerMinute,
      weightPercentage: (this.currentWeight / this.limits.weightPerMinute) * 100,
      currentCalls: this.currentCalls,
      maxCalls: this.limits.callsPerMinute,
      callsPercentage: (this.currentCalls / this.limits.callsPerMinute) * 100,
      emergencyMode: this.emergencyMode,
      circuitBreakerOpen: this.circuitBreakerOpen,
      endpointBreakdown,
      recommendations
    };
  }

  /**
   * Enable emergency mode
   */
  enableEmergencyMode(): void {
    this.emergencyMode = true;
    this.circuitBreakerOpen = true;
    console.warn('[BinanceAPIUsageManager] 🚨 EMERGENCY MODE ENABLED - All API calls blocked');
    
    // Auto-disable after 10 minutes
    setTimeout(() => {
      this.disableEmergencyMode();
    }, 600000);
  }

  /**
   * Disable emergency mode
   */
  disableEmergencyMode(): void {
    this.emergencyMode = false;
    this.circuitBreakerOpen = false;
    console.log('[BinanceAPIUsageManager] ✅ Emergency mode disabled');
  }

  /**
   * Force reset all counters
   */
  resetCounters(): void {
    this.currentWeight = 0;
    this.currentCalls = 0;
    this.lastResetTime = Date.now();
    console.log('[BinanceAPIUsageManager] 🔄 Counters reset');
  }

  /**
   * Calculate wait time until next reset
   */
  private calculateWaitTime(): number {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const timeUntilReset = 60000 - timeSinceReset; // 60 seconds
    return Math.max(0, timeUntilReset);
  }

  /**
   * Clean up old usage records
   */
  private cleanupOldRecords(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.usageHistory = this.usageHistory.filter(record => record.timestamp > oneHourAgo);
  }

  /**
   * Get endpoint usage breakdown
   */
  private getEndpointBreakdown(): Array<{
    endpoint: string;
    weight: number;
    calls: number;
    lastCall: number;
  }> {
    const breakdown: Record<string, {
      endpoint: string;
      weight: number;
      calls: number;
      lastCall: number;
    }> = {};

    // Initialize with all endpoints
    Object.values(this.endpoints).forEach(endpoint => {
      breakdown[endpoint.path] = {
        endpoint: endpoint.path,
        weight: endpoint.weight,
        calls: 0,
        lastCall: 0
      };
    });

    // Count usage from history
    this.usageHistory.forEach(record => {
      if (breakdown[record.endpoint]) {
        breakdown[record.endpoint].calls++;
        breakdown[record.endpoint].lastCall = Math.max(
          breakdown[record.endpoint].lastCall,
          record.timestamp
        );
      }
    });

    return Object.values(breakdown).sort((a, b) => b.calls - a.calls);
  }

  /**
   * Generate usage recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getUsageStats();

    if (stats.weightPercentage >= 80) {
      recommendations.push('⚠️ High weight usage detected. Consider reducing API call frequency.');
    }

    if (stats.callsPercentage >= 80) {
      recommendations.push('⚠️ High call frequency detected. Implement caching for market data.');
    }

    const accountCalls = this.usageHistory.filter(r => r.endpoint === '/api/v3/account').length;
    if (accountCalls > 10) {
      recommendations.push('💡 Consider caching account data for 30-60 seconds to reduce /api/v3/account calls.');
    }

    const priceCalls = this.usageHistory.filter(r => r.endpoint === '/api/v3/ticker/price').length;
    if (priceCalls > 20) {
      recommendations.push('💡 Use WebSocket streams for real-time price updates instead of REST API.');
    }

    if (this.emergencyMode) {
      recommendations.push('🚨 Emergency mode active. All API calls are blocked. Wait 10 minutes or reset manually.');
    }

    return recommendations;
  }

  /**
   * Update limits dynamically
   */
  updateLimits(newLimits: Partial<UsageLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    console.log('[BinanceAPIUsageManager] 🔧 Limits updated:', this.limits);
  }

  /**
   * Get endpoint priority
   */
  getEndpointPriority(endpoint: string): 'critical' | 'high' | 'medium' | 'low' {
    return this.endpoints[endpoint]?.priority || 'low';
  }

  /**
   * Check if endpoint is critical
   */
  isCriticalEndpoint(endpoint: string): boolean {
    return this.getEndpointPriority(endpoint) === 'critical';
  }
}

// Global instance
export const binanceAPIUsageManager = new BinanceAPIUsageManager();
