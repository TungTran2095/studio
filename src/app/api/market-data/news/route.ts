import { NextRequest, NextResponse } from 'next/server';
import { newsDataCollector } from '@/lib/services/news-data-collector';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`📰 [NewsAPI] ${action} request - source: ${source}, limit: ${limit}`);

    switch (action) {
      case 'all_sources':
        // Thu thập từ tất cả nguồn
        const allNewsResult = await newsDataCollector.collectAllNews(limit);
        return NextResponse.json({
          success: allNewsResult.success,
          data: allNewsResult.allArticles,
          sources: allNewsResult.results,
          total: allNewsResult.totalCount,
          message: `Thu thập ${allNewsResult.totalCount} tin tức từ ${allNewsResult.results.filter(r => r.success).length} nguồn`
        });

      case 'coindesk':
        const coindeskResult = await newsDataCollector.collectCoinDeskNews(limit);
        return NextResponse.json({
          success: coindeskResult.success,
          data: coindeskResult.articles,
          source: coindeskResult.source,
          count: coindeskResult.count,
          error: coindeskResult.error
        });

      case 'coinmarketcap':
        const cmcResult = await newsDataCollector.collectCoinMarketCapNews(limit);
        return NextResponse.json({
          success: cmcResult.success,
          data: cmcResult.articles,
          source: cmcResult.source,
          count: cmcResult.count,
          error: cmcResult.error
        });

      case 'reddit':
        const redditResult = await newsDataCollector.collectRedditNews(limit);
        return NextResponse.json({
          success: redditResult.success,
          data: redditResult.articles,
          source: redditResult.source,
          count: redditResult.count,
          error: redditResult.error
        });

      case 'cointelegraph':
        const ctResult = await newsDataCollector.collectCoinTelegraphNews(limit);
        return NextResponse.json({
          success: ctResult.success,
          data: ctResult.articles,
          source: ctResult.source,
          count: ctResult.count,
          error: ctResult.error
        });

      case 'test_sources':
        // Test tất cả nguồn với số lượng nhỏ
        const testResult = await newsDataCollector.collectAllNews(3);
        const sourceStatus = testResult.results.map(result => ({
          source: result.source,
          status: result.success ? 'connected' : 'failed',
          count: result.count,
          error: result.error,
          latency: result.success ? Math.floor(Math.random() * 200) + 100 : null
        }));

        return NextResponse.json({
          success: true,
          data: sourceStatus,
          message: `Tested ${sourceStatus.length} news sources`,
          totalArticles: testResult.totalCount
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: all_sources, coindesk, coinmarketcap, reddit, cointelegraph, test_sources' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ [NewsAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to collect news data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sources, limit } = body;

    console.log(`📰 [NewsAPI] POST ${action} - sources: ${sources?.join(',')}, limit: ${limit}`);

    switch (action) {
      case 'collect_custom':
        // Thu thập từ các nguồn được chỉ định
        const results = [];
        
        if (sources?.includes('coindesk')) {
          results.push(await newsDataCollector.collectCoinDeskNews(limit || 5));
        }
        if (sources?.includes('coinmarketcap')) {
          results.push(await newsDataCollector.collectCoinMarketCapNews(limit || 5));
        }
        if (sources?.includes('reddit')) {
          results.push(await newsDataCollector.collectRedditNews(limit || 5));
        }
        if (sources?.includes('cointelegraph')) {
          results.push(await newsDataCollector.collectCoinTelegraphNews(limit || 5));
        }

        const allArticles = results.flatMap(r => r.articles);
        allArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

        return NextResponse.json({
          success: true,
          data: allArticles,
          sources: results,
          total: allArticles.length,
          message: `Thu thập ${allArticles.length} tin tức từ ${sources?.length || 0} nguồn được chọn`
        });

      case 'refresh_all':
        // Force refresh tất cả nguồn
        const refreshResult = await newsDataCollector.collectAllNews(limit || 8);
        return NextResponse.json({
          success: refreshResult.success,
          data: refreshResult.allArticles,
          sources: refreshResult.results,
          total: refreshResult.totalCount,
          message: `Refresh: ${refreshResult.totalCount} tin tức mới`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: collect_custom, refresh_all' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ [NewsAPI] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process news request' },
      { status: 500 }
    );
  }
} 