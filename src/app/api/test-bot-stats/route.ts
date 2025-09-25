import { NextResponse } from 'next/server';
import { calculateBotStats } from '@/lib/trading/bot-stats-calculator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId') || '31afe99d-940c-490f-9773-b8e0697f29d3';

    console.log(`[TestBotStats] Testing bot stats calculation for: ${botId}`);
    
    const stats = await calculateBotStats(botId);
    
    console.log(`[TestBotStats] Result:`, stats);

    return NextResponse.json({
      botId,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TestBotStats] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}




