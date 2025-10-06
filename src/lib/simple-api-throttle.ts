/**
 * Simple API Throttle - Minimal rate limiting to prevent IP bans
 * Only tracks basic call frequency without complex tracking
 */

class SimpleApiThrottle {
  private lastCallTime: number = 0;
  private minIntervalMs: number = 1000; // Minimum 1 second between calls

  constructor(minIntervalMs: number = 1000) {
    this.minIntervalMs = minIntervalMs;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLastCall;
      console.log(`[SimpleApiThrottle] ⏳ Waiting ${waitTime}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCallTime = Date.now();
  }

  canMakeCall(): boolean {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    return timeSinceLastCall >= this.minIntervalMs;
  }
}

// Global instances for different API types
export const priceApiThrottle = new SimpleApiThrottle(2000); // 2 seconds between price calls
export const accountApiThrottle = new SimpleApiThrottle(5000); // 5 seconds between account calls
export const orderApiThrottle = new SimpleApiThrottle(3000); // 3 seconds between order calls
