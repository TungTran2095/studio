import { NextRequest, NextResponse } from 'next/server';
import { advancedSentimentAnalyzer } from '@/ai/sentiment/advanced-sentiment';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const action = searchParams.get('action') || 'analyze';
    const timeWindow = searchParams.get('timeWindow') || '24h';

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 });
    }

    console.log(`🧠 [API] Advanced sentiment request: ${action} for ${symbol}`);

    switch (action) {
      case 'analyze':
        const sentiment = await advancedSentimentAnalyzer.analyzeMultiModalSentiment(symbol);
        return NextResponse.json({
          success: true,
          data: sentiment,
          timestamp: new Date().toISOString()
        });

      case 'trends':
        const trends = await advancedSentimentAnalyzer.trackSentimentTrends(symbol, timeWindow);
        return NextResponse.json({
          success: true,
          data: trends,
          timestamp: new Date().toISOString()
        });

      case 'clear_cache':
        advancedSentimentAnalyzer.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: analyze, trends, clear_cache'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [API] Advanced sentiment error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, action } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({
        success: false,
        error: 'Symbols array is required'
      }, { status: 400 });
    }

    console.log(`🧠 [API] Batch sentiment analysis for ${symbols.length} symbols`);

    switch (action) {
      case 'batch_analyze':
        const results = await Promise.all(
          symbols.map(async (symbol: string) => {
            try {
              const sentiment = await advancedSentimentAnalyzer.analyzeMultiModalSentiment(symbol);
              return { symbol, sentiment, success: true };
            } catch (error) {
              return { 
                symbol, 
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false 
              };
            }
          })
        );

        return NextResponse.json({
          success: true,
          data: results,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: batch_analyze'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [API] Batch sentiment analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 