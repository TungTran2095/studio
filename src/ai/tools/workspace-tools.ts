import { z } from 'zod';

/**
 * AI Tools for Workspace Market Data Collection
 * Cho phép Yinsen tương tác với các chức năng thu thập dữ liệu thị trường
 */

// ===== SCHEMAS =====

const startDataCollectionSchema = z.object({
  symbol: z.string().describe('Symbol crypto (ví dụ: BTCUSDT, ETHUSDT)'),
  interval: z.string().optional().describe('Timeframe (1m, 5m, 1h, 1d)').default('1m'),
  limit: z.number().optional().describe('Số lượng records thu thập').default(100)
});

const createDataJobSchema = z.object({
  name: z.string().describe('Tên job'),
  symbol: z.string().describe('Symbol crypto'),
  frequency: z.enum(['*/1 * * * *', '*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 0 * * *']).describe('Tần suất chạy'),
  interval: z.string().optional().default('1m'),
  autoStart: z.boolean().optional().default(true)
});

const manageDataJobSchema = z.object({
  action: z.enum(['start', 'stop', 'delete', 'list']).describe('Hành động thực hiện'),
  jobId: z.string().optional().describe('ID của job (bắt buộc cho start, stop, delete)'),
  symbol: z.string().optional().describe('Symbol để tìm job (thay thế cho jobId)')
});

const getMarketNewsSchema = z.object({
  sources: z.array(z.enum(['coindesk', 'coinmarketcap', 'reddit', 'cointelegraph'])).optional().describe('Nguồn tin tức'),
  limit: z.number().optional().default(8).describe('Số lượng tin tức'),
  sentiment: z.enum(['all', 'positive', 'negative', 'neutral']).optional().default('all')
});

const getRealTimeDataSchema = z.object({
  symbols: z.array(z.string()).optional().describe('Danh sách symbols (để trống = top 10)'),
  includeStats: z.boolean().optional().default(true).describe('Bao gồm thống kê tổng quan')
});

const marketDataStatsSchema = z.object({});

// ===== OUTPUT SCHEMAS =====

const workspaceOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.string().optional()
});

// ===== TOOLS =====

export const startDataCollectionTool = {
  schema: {
    name: 'start_data_collection',
    description: 'Bắt đầu thu thập dữ liệu thị trường crypto cho một symbol cụ thể',
    parameters: startDataCollectionSchema,
    returnType: workspaceOutputSchema,
  },
  execute: async (input: z.infer<typeof startDataCollectionSchema>) => {
    try {
      console.log(`🤖 [AI-WorkspaceTools] Starting data collection for ${input.symbol}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/market-data/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collect_historical',
          symbol: input.symbol,
          interval: input.interval,
          limit: input.limit
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: `✅ Đã bắt đầu thu thập dữ liệu ${input.symbol}. Thu thập được ${result.recordsProcessed || input.limit} records.`,
          data: { recordsCollected: result.recordsProcessed }
        };
      } else {
        return {
          success: false,
          message: `❌ Không thể thu thập dữ liệu: ${result.error}`,
          error: result.error
        };
      }
    } catch (error: any) {
      console.error('❌ [AI-WorkspaceTools] Data collection error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi thu thập dữ liệu. Kiểm tra kết nối API.',
        error: error?.message || 'Unknown error'
      };
    }
  }
};

export const createDataJobTool = {
  schema: {
    name: 'create_data_job',
    description: 'Tạo job thu thập dữ liệu tự động với lịch trình',
    parameters: createDataJobSchema,
    returnType: workspaceOutputSchema,
  },
  execute: async (input: z.infer<typeof createDataJobSchema>) => {
    try {
      console.log(`🤖 [AI-WorkspaceTools] Creating data job: ${input.name}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          job: {
            name: input.name,
            symbol: input.symbol,
            frequency: input.frequency,
            interval: input.interval,
            enabled: input.autoStart,
            lookbackPeriods: 100,
            target: {
              recordsPerDay: 1440,
              totalRecords: 10000
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: `✅ Đã tạo job "${input.name}" cho ${input.symbol}. Job ${input.autoStart ? 'đã được bắt đầu' : 'đã sẵn sàng'}.`,
          data: { jobId: result.jobId }
        };
      } else {
        return {
          success: false,
          message: `❌ Không thể tạo job: ${result.error}`,
          error: result.error
        };
      }
    } catch (error: any) {
      console.error('❌ [AI-WorkspaceTools] Job creation error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi tạo job thu thập dữ liệu.',
        error: error?.message || 'Unknown error'
      };
    }
  }
};

export const getMarketDataStatsTool = {
  schema: {
    name: 'get_market_data_stats',
    description: 'Lấy thống kê thu thập dữ liệu thị trường hiện tại',
    parameters: marketDataStatsSchema,
    returnType: workspaceOutputSchema,
  },
  execute: async (input: z.infer<typeof marketDataStatsSchema>) => {
    try {
      console.log(`🤖 [AI-WorkspaceTools] Getting market data stats`);
      
      // Get enhanced stats
      const enhancedResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/market-data/enhanced?action=collection_stats`);
      const enhancedResult = await enhancedResponse.json();
      
      // Get jobs stats
      const jobsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/jobs`);
      const jobsResult = await jobsResponse.json();
      
      if (enhancedResult.success && jobsResult.success) {
        const stats = {
          totalRecords: enhancedResult.data?.totalRecords || 0,
          recordsToday: enhancedResult.data?.recordsToday || 0,
          activeSources: enhancedResult.data?.activeSources || 0,
          dataQuality: enhancedResult.data?.dataQuality || 0,
          activeJobs: jobsResult.jobs?.filter((job: any) => job.enabled).length || 0
        };
        
        return {
          success: true,
          message: `📊 Thống kê thu thập dữ liệu:\n` +
                  `• Tổng records: ${stats.totalRecords.toLocaleString()}\n` +
                  `• Records hôm nay: ${stats.recordsToday.toLocaleString()}\n` +
                  `• Nguồn dữ liệu hoạt động: ${stats.activeSources}\n` +
                  `• Chất lượng dữ liệu: ${stats.dataQuality}%\n` +
                  `• Jobs đang chạy: ${stats.activeJobs}`,
          data: stats
        };
      } else {
        return {
          success: false,
          message: '❌ Không thể lấy thống kê thu thập dữ liệu.',
          error: 'API connection failed'
        };
      }
    } catch (error: any) {
      console.error('❌ [AI-WorkspaceTools] Stats error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi lấy thống kê dữ liệu.',
        error: error?.message || 'Unknown error'
      };
    }
  }
};

export const manageDataJobTool = {
  schema: {
    name: 'manage_data_job',
    description: 'Quản lý jobs thu thập dữ liệu (start, stop, delete, list)',
    parameters: manageDataJobSchema,
    returnType: workspaceOutputSchema,
  },
  execute: async (input: z.infer<typeof manageDataJobSchema>) => {
    try {
      console.log(`🤖 [AI-WorkspaceTools] Managing job: ${input.action}`);
      
      if (input.action === 'list') {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/jobs`);
        const result = await response.json();
        
        if (result.success) {
          const jobsList = result.jobs.map((job: any) => 
            `• ${job.name} (${job.symbol}) - ${job.enabled ? '🟢 Đang chạy' : '⏸️ Dừng'}`
          ).join('\n');
          
          return {
            success: true,
            message: `📋 Danh sách jobs:\n${jobsList}`,
            data: { jobs: result.jobs }
          };
        }
      } else {
        // Find job by symbol if jobId not provided
        let targetJobId = input.jobId;
        if (!targetJobId && input.symbol) {
          const listResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/jobs`);
          const listResult = await listResponse.json();
          
          const job = listResult.jobs?.find((j: any) => j.symbol.toLowerCase() === input.symbol?.toLowerCase());
          targetJobId = job?.id;
        }
        
        if (!targetJobId) {
          return {
            success: false,
            message: '❌ Không tìm thấy job. Cung cấp jobId hoặc symbol hợp lệ.',
            error: 'Job not found'
          };
        }
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: input.action,
            jobId: targetJobId
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          const actionText = input.action === 'start' ? 'bắt đầu' : 
                           input.action === 'stop' ? 'dừng' : 'xóa';
          return {
            success: true,
            message: `✅ Đã ${actionText} job thành công.`
          };
        }
      }
      
      return {
        success: false,
        message: '❌ Không thể thực hiện hành động với job.',
        error: 'Unknown error'
      };
    } catch (error: any) {
      console.error('❌ [AI-WorkspaceTools] Job management error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi quản lý job.',
        error: error?.message || 'Unknown error'
      };
    }
  }
};

export const getMarketNewsTool = {
  schema: {
    name: 'get_market_news',
    description: 'Thu thập tin tức thị trường crypto từ nhiều nguồn',
    parameters: getMarketNewsSchema,
    returnType: workspaceOutputSchema,
  },
  execute: async (input: z.infer<typeof getMarketNewsSchema>) => {
    try {
      console.log(`🤖 [AI-WorkspaceTools] Getting market news`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/market-data/news?action=all_sources&limit=${input.limit}`);
      const result = await response.json();
      
      if (result.success) {
        let articles = result.data || [];
        
        // Filter by sentiment
        if (input.sentiment !== 'all') {
          articles = articles.filter((article: any) => article.sentiment === input.sentiment);
        }
        
        // Filter by sources
        if (input.sources && input.sources.length > 0) {
          articles = articles.filter((article: any) => input.sources!.includes(article.source));
        }
        
        const formattedArticles = articles.slice(0, input.limit).map((article: any) => ({
          title: article.title,
          summary: article.summary,
          url: article.url,
          source: article.source,
          sentiment: article.sentiment,
          publishedAt: new Date(article.publishedAt).toLocaleString('vi-VN')
        }));
        
        const newsText = formattedArticles.map((article: any, index: number) => 
          `${index + 1}. **${article.title}** (${article.source})\n` +
          `   ${article.summary}\n` +
          `   🗓️ ${article.publishedAt} | 💭 ${article.sentiment}\n`
        ).join('\n');
        
        return {
          success: true,
          message: `📰 Tin tức thị trường crypto (${formattedArticles.length} bài):\n\n${newsText}`,
          data: { articles: formattedArticles }
        };
      } else {
        return {
          success: false,
          message: '❌ Không thể lấy tin tức thị trường.',
          error: result.error
        };
      }
    } catch (error: any) {
      console.error('❌ [AI-WorkspaceTools] News error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi lấy tin tức thị trường.',
        error: error?.message || 'Unknown error'
      };
    }
  }
};

export const getRealTimeDataTool = {
  schema: {
    name: 'get_realtime_data',
    description: 'Lấy dữ liệu thị trường real-time từ Enhanced Market Data',
    parameters: getRealTimeDataSchema,
    returnType: workspaceOutputSchema,
  },
  execute: async (input: z.infer<typeof getRealTimeDataSchema>) => {
    try {
      console.log(`🤖 [AI-WorkspaceTools] Getting real-time market data`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/market-data/enhanced?action=realtime_data`);
      const result = await response.json();
      
      if (result.success && result.data) {
        let cryptoData = result.data;
        
        // Filter by symbols if specified
        if (input.symbols && input.symbols.length > 0) {
          cryptoData = cryptoData.filter((crypto: any) => 
            input.symbols!.some((symbol: string) => 
              crypto.symbol.toLowerCase().includes(symbol.toLowerCase().replace('USDT', ''))
            )
          );
        }
        
        const formattedData = cryptoData.map((crypto: any) => ({
          symbol: crypto.symbol,
          price: crypto.quote?.USD?.price || 0,
          change24h: crypto.quote?.USD?.percent_change_24h || 0,
          volume24h: crypto.quote?.USD?.volume_24h || 0,
          marketCap: crypto.quote?.USD?.market_cap,
          source: 'CoinMarketCap'
        }));
        
        const dataText = formattedData.map((crypto: any, index: number) => 
          `${index + 1}. **${crypto.symbol}** - $${crypto.price.toLocaleString('vi-VN', {maximumFractionDigits: 4})}\n` +
          `   📈 24h: ${crypto.change24h >= 0 ? '+' : ''}${crypto.change24h.toFixed(2)}%\n` +
          `   💰 Volume: $${(crypto.volume24h / 1000000).toFixed(1)}M\n` +
          `   🏛️ Market Cap: $${crypto.marketCap ? (crypto.marketCap / 1000000000).toFixed(1) + 'B' : 'N/A'}\n`
        ).join('\n');
        
        return {
          success: true,
          message: `🚀 Dữ liệu thị trường real-time (${formattedData.length} coins):\n\n${dataText}`,
          data: { cryptoData: formattedData }
        };
      } else {
        return {
          success: false,
          message: '❌ Không thể lấy dữ liệu real-time.',
          error: result.error
        };
      }
    } catch (error: any) {
      console.error('❌ [AI-WorkspaceTools] Real-time data error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi lấy dữ liệu real-time.',
        error: error?.message || 'Unknown error'
      };
    }
  }
};

// ===== WORKSPACE REQUEST DETECTION =====

export function isWorkspaceRequest(message: string): boolean {
  const workspaceKeywords = [
    'thu thập dữ liệu', 'data collection', 'collect data',
    'tạo job', 'create job', 'start job', 'stop job',
    'thống kê', 'stats', 'statistics', 'báo cáo',
    'tin tức', 'news', 'market news',
    'real-time', 'real time', 'dữ liệu thời gian thực',
    'workspace', 'quản lý job', 'job management',
    'start collecting', 'bắt đầu thu thập',
    'dừng thu thập', 'stop collecting'
  ];
  
  const lowerMessage = message.toLowerCase();
  return workspaceKeywords.some(keyword => lowerMessage.includes(keyword));
}

export function identifyWorkspaceAction(message: string): {
  action: 'start_collection' | 'create_job' | 'get_stats' | 'manage_job' | 'get_news' | 'get_realtime' | 'none';
  params: any;
} {
  const lowerMessage = message.toLowerCase();
  
  // Detect symbols
  const symbolMatch = message.match(/(?:BTC|ETH|BNB|SOL|ADA|DOT|MATIC|AVAX|LINK|DOGE)(?:USDT)?/gi);
  const symbol = symbolMatch ? symbolMatch[0].toUpperCase() : 'BTCUSDT';
  
  // Data collection
  if (lowerMessage.includes('thu thập') || lowerMessage.includes('collect')) {
    return {
      action: 'start_collection',
      params: { symbol, interval: '1m', limit: 100 }
    };
  }
  
  // Job creation
  if (lowerMessage.includes('tạo job') || lowerMessage.includes('create job')) {
    return {
      action: 'create_job',
      params: {
        name: `${symbol} Collection Job`,
        symbol,
        frequency: '*/5 * * * *', // Every 5 minutes
        interval: '1m',
        autoStart: true
      }
    };
  }
  
  // Job management
  if (lowerMessage.includes('start') || lowerMessage.includes('bắt đầu')) {
    return {
      action: 'manage_job',
      params: { action: 'start', symbol }
    };
  }
  
  if (lowerMessage.includes('stop') || lowerMessage.includes('dừng')) {
    return {
      action: 'manage_job',
      params: { action: 'stop', symbol }
    };
  }
  
  if (lowerMessage.includes('list') || lowerMessage.includes('danh sách')) {
    return {
      action: 'manage_job',
      params: { action: 'list' }
    };
  }
  
  // Stats
  if (lowerMessage.includes('thống kê') || lowerMessage.includes('stats') || lowerMessage.includes('báo cáo')) {
    return {
      action: 'get_stats',
      params: {}
    };
  }
  
  // News
  if (lowerMessage.includes('tin tức') || lowerMessage.includes('news')) {
    return {
      action: 'get_news',
      params: {
        limit: 5,
        sentiment: 'all'
      }
    };
  }
  
  // Real-time data
  if (lowerMessage.includes('real-time') || lowerMessage.includes('real time') || lowerMessage.includes('thời gian thực')) {
    const symbols = symbolMatch ? [symbol] : undefined;
    return {
      action: 'get_realtime',
      params: { symbols }
    };
  }
  
  return { action: 'none', params: {} };
}

export async function executeWorkspaceAction(action: string, params: any): Promise<string> {
  try {
    switch (action) {
      case 'start_collection':
        const collectionResult = await startDataCollectionTool.execute(params);
        return collectionResult.message;
        
      case 'create_job':
        const jobResult = await createDataJobTool.execute(params);
        return jobResult.message;
        
      case 'get_stats':
        const statsResult = await getMarketDataStatsTool.execute(params);
        return statsResult.message;
        
      case 'manage_job':
        const manageResult = await manageDataJobTool.execute(params);
        return manageResult.message;
        
      case 'get_news':
        const newsResult = await getMarketNewsTool.execute(params);
        return newsResult.message;
        
      case 'get_realtime':
        const realtimeResult = await getRealTimeDataTool.execute(params);
        return realtimeResult.message;
        
      default:
        return '❌ Không nhận dạng được yêu cầu workspace.';
    }
  } catch (error: any) {
    console.error('❌ [WorkspaceTools] Execution error:', error);
    return `❌ Lỗi khi thực hiện: ${error?.message || 'Unknown error'}`;
  }
}

// Export all tools
export const workspaceTools = [
  startDataCollectionTool,
  createDataJobTool,
  getMarketDataStatsTool,
  manageDataJobTool,
  getMarketNewsTool,
  getRealTimeDataTool
]; 