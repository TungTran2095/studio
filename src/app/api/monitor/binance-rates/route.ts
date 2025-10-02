import { NextResponse } from 'next/server';
import { serverRateTracker } from '@/lib/monitor/server-rate-tracker';

export async function GET() {
  try {
    const stats = serverRateTracker.getStats();
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
