/**
 * News Data Collector Service
 * Thu thập tin tức crypto từ nhiều nguồn
 */

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  imageUrl?: string;
  source: 'coindesk' | 'coinmarketcap' | 'reddit' | 'cointelegraph' | 'decrypt';
  author?: string;
  publishedAt: Date;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
}

interface NewsCollectionResult {
  success: boolean;
  articles: NewsArticle[];
  source: string;
  count: number;
  error?: string;
}

class NewsDataCollector {
  private coinMarketCapApiKey: string;

  constructor() {
    this.coinMarketCapApiKey = process.env.COINMARKETCAP_API_KEY || '';
  }

  /**
   * Thu thập tin tức từ CoinDesk API
   */
  async collectCoinDeskNews(limit: number = 10): Promise<NewsCollectionResult> {
    try {
              // console.log(`🔄 [NewsCollector] Fetching CoinDesk news (limit: ${limit})`);
      
      // CoinDesk có RSS feed và API miễn phí
      const response = await fetch('https://www.coindesk.com/arc/outboundfeeds/rss/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UrusStudio/1.0)',
        }
      });

      if (!response.ok) {
        throw new Error(`CoinDesk API error: ${response.status}`);
      }

      const rssText = await response.text();
      const articles = this.parseRSSFeed(rssText, 'coindesk', limit);

              // console.log(`✅ [NewsCollector] CoinDesk: ${articles.length} articles`);
      return {
        success: true,
        articles,
        source: 'coindesk',
        count: articles.length
      };
    } catch (error) {
              // console.error('❌ [NewsCollector] CoinDesk error:', error);
      return {
        success: false,
        articles: [],
        source: 'coindesk',
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Thu thập tin tức từ CoinMarketCap News API
   */
  async collectCoinMarketCapNews(limit: number = 10): Promise<NewsCollectionResult> {
    try {
      // Tắt log để giảm spam - chỉ giữ log lỗi quan trọng
      // console.log(`🔄 [NewsCollector] Fetching CoinMarketCap news (limit: ${limit})`);
      
      if (!this.coinMarketCapApiKey) {
        throw new Error('CoinMarketCap API key not configured');
      }

      const response = await fetch(`https://pro-api.coinmarketcap.com/v1/content/latest?limit=${limit}`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.coinMarketCapApiKey,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status}`);
      }

      const data = await response.json();
      const articles = this.parseCoinMarketCapNews(data);

      // console.log(`✅ [NewsCollector] CoinMarketCap: ${articles.length} articles`);
      return {
        success: true,
        articles,
        source: 'coinmarketcap',
        count: articles.length
      };
    } catch (error) {
              // console.error('❌ [NewsCollector] CoinMarketCap error:', error);
      return {
        success: false,
        articles: [],
        source: 'coinmarketcap',
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Thu thập tin tức từ Reddit r/cryptocurrency
   */
  async collectRedditNews(limit: number = 10): Promise<NewsCollectionResult> {
    try {
      // Tắt log để giảm spam - chỉ giữ log lỗi quan trọng
      // console.log(`🔄 [NewsCollector] Fetching Reddit news (limit: ${limit})`);
      
      const response = await fetch(`https://www.reddit.com/r/cryptocurrency/hot.json?limit=${limit}`, {
        headers: {
          'User-Agent': 'UrusStudio/1.0',
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      const articles = this.parseRedditPosts(data);

      // console.log(`✅ [NewsCollector] Reddit: ${articles.length} articles`);
      return {
        success: true,
        articles,
        source: 'reddit',
        count: articles.length
      };
    } catch (error) {
              // console.error('❌ [NewsCollector] Reddit error:', error);
      return {
        success: false,
        articles: [],
        source: 'reddit',
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Thu thập tin tức từ CoinTelegraph RSS
   */
  async collectCoinTelegraphNews(limit: number = 10): Promise<NewsCollectionResult> {
    try {
      // Tắt log để giảm spam - chỉ giữ log lỗi quan trọng
      // console.log(`🔄 [NewsCollector] Fetching CoinTelegraph news (limit: ${limit})`);
      
      const response = await fetch('https://cointelegraph.com/rss', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UrusStudio/1.0)',
        }
      });

      if (!response.ok) {
        throw new Error(`CoinTelegraph API error: ${response.status}`);
      }

      const rssText = await response.text();
      const articles = this.parseRSSFeed(rssText, 'cointelegraph', limit);

              // console.log(`✅ [NewsCollector] CoinTelegraph: ${articles.length} articles`);
      return {
        success: true,
        articles,
        source: 'cointelegraph',
        count: articles.length
      };
    } catch (error) {
              // console.error('❌ [NewsCollector] CoinTelegraph error:', error);
      return {
        success: false,
        articles: [],
        source: 'cointelegraph',
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Thu thập tất cả tin tức từ các nguồn
   */
  async collectAllNews(limitPerSource: number = 5): Promise<{
    success: boolean;
    allArticles: NewsArticle[];
    results: NewsCollectionResult[];
    totalCount: number;
  }> {
    // Tắt log để giảm spam - chỉ giữ log lỗi quan trọng
    // console.log('🚀 [NewsCollector] Starting comprehensive news collection...');
    
    const results = await Promise.allSettled([
      this.collectCoinDeskNews(limitPerSource),
      this.collectCoinMarketCapNews(limitPerSource),
      this.collectRedditNews(limitPerSource),
      this.collectCoinTelegraphNews(limitPerSource),
    ]);

    const collectionResults: NewsCollectionResult[] = [];
    const allArticles: NewsArticle[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        collectionResults.push(result.value);
        allArticles.push(...result.value.articles);
      } else {
        const sources = ['coindesk', 'coinmarketcap', 'reddit', 'cointelegraph'];
        collectionResults.push({
          success: false,
          articles: [],
          source: sources[index],
          count: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Sort by published date (newest first)
    allArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    const successfulSources = collectionResults.filter(r => r.success).length;
    
    // console.log(`🎉 [NewsCollector] Collection completed: ${allArticles.length} articles from ${successfulSources}/4 sources`);
    
    return {
      success: successfulSources > 0,
      allArticles,
      results: collectionResults,
      totalCount: allArticles.length
    };
  }

  /**
   * Parse RSS feed thành NewsArticle[]
   */
  private parseRSSFeed(rssText: string, source: 'coindesk' | 'cointelegraph', limit: number): NewsArticle[] {
    const articles: NewsArticle[] = [];
    
    try {
      // Simple regex parsing cho RSS (production nên dùng proper XML parser)
      const itemMatches = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
      
      for (let i = 0; i < Math.min(itemMatches.length, limit); i++) {
        const item = itemMatches[i];
        
        const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/);
        const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/);
        const descMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/);
        const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/);
        const authorMatch = item.match(/<dc:creator[^>]*><!\[CDATA\[(.*?)\]\]><\/dc:creator>/);
        
        if (titleMatch && linkMatch) {
          const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
          
          articles.push({
            id: `${source}-${Date.now()}-${i}`,
            title: titleMatch[1]?.trim() || '',
            summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().substring(0, 200) || '',
            url: linkMatch[1]?.trim() || '',
            source,
            author: authorMatch?.[1]?.trim(),
            publishedAt,
            tags: this.extractTags(titleMatch[1] + ' ' + (descMatch?.[1] || '')),
            sentiment: this.analyzeSentiment(titleMatch[1] + ' ' + (descMatch?.[1] || ''))
          });
        }
      }
    } catch (error) {
              // console.error(`❌ [NewsCollector] RSS parsing error for ${source}:`, error);
    }
    
    return articles;
  }

  /**
   * Parse CoinMarketCap news response
   */
  private parseCoinMarketCapNews(data: any): NewsArticle[] {
    const articles: NewsArticle[] = [];
    
    try {
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((item: any, index: number) => {
          articles.push({
            id: `coinmarketcap-${item.id || Date.now()}-${index}`,
            title: item.title || '',
            summary: item.subtitle || item.summary || '',
            content: item.content,
            url: item.url || `https://coinmarketcap.com/news/${item.slug}`,
            imageUrl: item.cover,
            source: 'coinmarketcap',
            author: item.author?.name,
            publishedAt: new Date(item.createdAt || item.publishedAt),
            tags: this.extractTags(item.title + ' ' + (item.subtitle || '')),
            sentiment: this.analyzeSentiment(item.title + ' ' + (item.subtitle || ''))
          });
        });
      }
    } catch (error) {
      // Tắt log để giảm spam - chỉ giữ log lỗi quan trọng
      // console.error('❌ [NewsCollector] CoinMarketCap parsing error:', error);
    }
    
    return articles;
  }

  /**
   * Parse Reddit posts
   */
  private parseRedditPosts(data: any): NewsArticle[] {
    const articles: NewsArticle[] = [];
    
    try {
      if (data.data?.children && Array.isArray(data.data.children)) {
        data.data.children.forEach((child: any, index: number) => {
          const post = child.data;
          if (post && !post.is_self && post.url && !post.url.includes('reddit.com')) {
            articles.push({
              id: `reddit-${post.id}`,
              title: post.title || '',
              summary: post.selftext?.substring(0, 200) || '',
              url: post.url,
              imageUrl: post.thumbnail !== 'self' ? post.thumbnail : undefined,
              source: 'reddit',
              author: post.author,
              publishedAt: new Date(post.created_utc * 1000),
              tags: this.extractTags(post.title + ' ' + (post.selftext || '')),
              sentiment: this.analyzeSentiment(post.title),
              relevanceScore: post.score || 0
            });
          }
        });
      }
    } catch (error) {
      // console.error('❌ [NewsCollector] Reddit parsing error:', error);
    }
    
    return articles;
  }

  /**
   * Extract crypto-related tags từ text
   */
  private extractTags(text: string): string[] {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'binance', 'bnb', 'cardano', 'ada',
      'solana', 'sol', 'dogecoin', 'doge', 'xrp', 'ripple', 'polkadot', 'dot',
      'avalanche', 'avax', 'chainlink', 'link', 'polygon', 'matic', 'crypto',
      'defi', 'nft', 'dao', 'web3', 'blockchain', 'altcoin', 'stablecoin',
      'trading', 'investment', 'bull', 'bear', 'market', 'price', 'adoption'
    ];
    
    const lowerText = text.toLowerCase();
    return cryptoKeywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Analyze sentiment của text (simple keyword-based)
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['bullish', 'rally', 'surge', 'gains', 'up', 'rise', 'adoption', 'positive', 'good', 'great'];
    const negativeWords = ['bearish', 'crash', 'drop', 'fall', 'down', 'decline', 'negative', 'bad', 'concern', 'risk'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
}

export const newsDataCollector = new NewsDataCollector();
export type { NewsArticle, NewsCollectionResult }; 