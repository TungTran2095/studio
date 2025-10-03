import { NextResponse } from 'next/server';
import { binanceCache } from '@/lib/cache/binance-cache';

export async function GET() {
  try {
    const cacheStats = binanceCache.getCacheStats();
    
    return NextResponse.json({
      success: true,
      data: {
        cacheStats,
        timestamp: Date.now(),
        recommendations: {
          accountInfo: {
            currentTTL: cacheStats.accountInfo.ttl,
            currentAge: cacheStats.accountInfo.age,
            isValid: cacheStats.accountInfo.isValid,
            suggestion: cacheStats.accountInfo.isValid 
              ? 'Cache is valid, no API call needed' 
              : 'Cache expired, next call will hit API'
          },
          exchangeInfo: {
            currentTTL: cacheStats.exchangeInfo.ttl,
            currentAge: cacheStats.exchangeInfo.age,
            isValid: cacheStats.exchangeInfo.isValid,
            suggestion: cacheStats.exchangeInfo.isValid 
              ? 'Cache is valid, no API call needed' 
              : 'Cache expired, next call will hit API'
          }
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
