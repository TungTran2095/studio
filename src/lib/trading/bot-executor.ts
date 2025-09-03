import { TradingBot } from './trading-bot';
import { supabase } from '@/lib/supabase-client';
import { BinanceService } from './binance-service';
import { createClient } from '@supabase/supabase-js';
import { botLogger } from './bot-logger';

interface BotExecutorConfig {
  symbol: string;
  strategy: {
    type: string;
    parameters: any;
  };
  riskManagement: {
    initialCapital: number;
    positionSize: number;
    stopLoss: number;
    takeProfit: number;
  };
  timeframe: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.API_BASE_URL || 'http://localhost:9002';

// Debug logging để kiểm tra API_BASE_URL
console.log('[BotExecutor] 🔍 DEBUG: API_BASE_URL configuration:', {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  API_BASE_URL: process.env.API_BASE_URL,
  final: API_BASE_URL
});

// Helper function để chuyển đổi timeframe thành milliseconds
function timeframeToMs(timeframe: string): number {
  const match = timeframe.match(/^([0-9]+)([mhdw])$/i);
  if (!match) return 60000; // Default 1m
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

export class BotExecutor {
  private bot: TradingBot;
  private binanceService!: BinanceService;
  private config: BotExecutorConfig = {
    symbol: '',
    strategy: {
      type: '',
      parameters: {}
    },
    riskManagement: {
      initialCapital: 0,
      positionSize: 0,
      stopLoss: 0,
      takeProfit: 0
    },
    timeframe: '1m'
  };
  private isRunning: boolean = false;
  private currentPosition: any = null;
  private lastExecutionTime: number = 0;
  
  // Supabase admin client để bypass RLS
  private supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor(bot: TradingBot) {
    this.bot = bot;
    
    // Khởi tạo BinanceService
    if (this.bot.config.account?.apiKey && this.bot.config.account?.apiSecret) {
      this.binanceService = new BinanceService(
        this.bot.config.account.apiKey,
        this.bot.config.account.apiSecret,
        this.bot.config.account.testnet || false
      );
    }
    
    // Lấy đúng các trường từ cấu trúc config lồng
    const config = (this.bot.config as any);
    
    // Sửa logic lấy account - kiểm tra cả 2 vị trí có thể
    if (config.account) {
      this.bot.config.account = config.account;
    } else if (config.config?.account) {
      this.bot.config.account = config.config.account;
    }
    
    // Đảm bảo testnet được set đúng
    if (this.bot.config.account.testnet === undefined) {
      this.bot.config.account.testnet = false;
    }
    
    this.config = {
      symbol: config.config?.trading?.symbol || 'BTCUSDT',
      strategy: config.config?.strategy,
      riskManagement: {
        initialCapital: config.config?.trading?.initialCapital,
        positionSize: config.config?.trading?.positionSize,
        stopLoss: config.config?.riskManagement?.stopLoss,
        takeProfit: config.config?.riskManagement?.takeProfit
      },
      timeframe: config.config?.trading?.timeframe || '1m'
    };
    
    // Log để debug account config
    console.log('[BotExecutor] Raw bot config:', JSON.stringify(this.bot.config, null, 2));
    
    // Thêm log để kiểm tra
    console.log('BotExecutor config:', this.config);
    console.log('[BotExecutor] Account config:', {
      apiKey: this.bot.config.account.apiKey ? `${this.bot.config.account.apiKey.slice(0, 6)}...${this.bot.config.account.apiKey.slice(-4)}` : 'undefined',
      testnet: this.bot.config.account.testnet
    });

    // Enhanced logging with botLogger
    botLogger.info('BotExecutor initialized', {
      botName: this.bot.name,
      botId: this.bot.id,
      symbol: this.config.symbol,
      strategy: this.config.strategy.type,
      timeframe: this.config.timeframe
    });
  }

  async initialize() {
    try {
      // The config is already initialized in the constructor.
      // We just need to check the API connection.
      
      // Reset current position khi khởi tạo bot
      this.currentPosition = null;
      console.log('[BotExecutor] Reset current position to null');
      
      // Kiểm tra BinanceService đã được khởi tạo chưa
      if (!this.binanceService) {
        throw new Error('BinanceService chưa được khởi tạo - thiếu API Key hoặc Secret');
      }
      
      // Test kết nối bằng cách lấy thông tin tài khoản
      try {
        const accountInfo = await this.binanceService.getAccountInfo();
        console.log('[BotExecutor] ✅ Kết nối Binance thành công');
        console.log('[BotExecutor] Account info:', {
          canTrade: accountInfo.canTrade,
          accountType: accountInfo.accountType,
          balancesCount: accountInfo.balances.length
        });
        
        // Enhanced logging
        botLogger.info('Binance connection successful', {
          botName: this.bot.name,
          canTrade: accountInfo.canTrade,
          accountType: accountInfo.accountType,
          balancesCount: accountInfo.balances.length
        });
      } catch (error) {
        console.error('[BotExecutor] Lỗi kết nối Binance:', error);
        botLogger.error('Binance connection failed', {
          botName: this.bot.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error(`Không thể kết nối đến Binance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return true;
    } catch (error) {
      console.error('Error initializing bot:', error);
      await this.handleError(error);
      return false;
    }
  }

  async start() {
    try {
      if (this.isRunning) return;
      console.log('[BotExecutor] 🚀 Bắt đầu start() cho bot:', this.bot?.name);
      console.log('[BotExecutor] 📊 Bot config:', {
        symbol: this.config.symbol,
        strategy: this.config.strategy.type,
        positionSize: this.config.riskManagement.positionSize,
        stopLoss: this.config.riskManagement.stopLoss,
        takeProfit: this.config.riskManagement.takeProfit,
        timeframe: this.config.timeframe
      });
      console.log('[BotExecutor] ⏰ Timeframe:', this.config.timeframe);
      
      // Enhanced logging
      botLogger.botStart(this.bot.name, this.bot.id, {
        symbol: this.config.symbol,
        strategy: this.config.strategy.type,
        positionSize: this.config.riskManagement.positionSize,
        stopLoss: this.config.riskManagement.stopLoss,
        takeProfit: this.config.riskManagement.takeProfit,
        timeframe: this.config.timeframe
      });
      
      const initialized = await this.initialize();
      if (!initialized) return;

      this.isRunning = true;
      await this.updateBotStatus('running');
      console.log('[BotExecutor] ✅ Bot status updated to running');

      // Đợi một chút để đảm bảo status đã được cập nhật
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Tính toán interval dựa trên timeframe
      const intervalMs = timeframeToMs(this.config.timeframe);
      console.log(`[BotExecutor] 🔄 Chạy với interval: ${intervalMs}ms (${this.config.timeframe})`);

      // Bắt đầu vòng lặp chính
      while (this.isRunning) {
        console.log('[BotExecutor] 🔄 Vòng lặp chính executeStrategy()...');
        
        // Kiểm tra status từ database trước mỗi vòng lặp - DỪNG NGAY nếu không phải running
        try {
          const { data: botStatus } = await this.supabaseAdmin
            .from('trading_bots')
            .select('status')
            .eq('id', this.bot.id)
            .single();
          
          if (botStatus && botStatus.status !== 'running') {
            console.log(`[${this.bot.name}] 🛑 Status: ${botStatus.status}, stopping`);
            this.isRunning = false;
            break; // Thoát khỏi vòng lặp
          }
        } catch (error) {
          console.error('[BotExecutor] Error checking status in main loop:', error);
          console.log(`[${this.bot.name}] 🛑 Cannot check status, stopping for safety`);
          this.isRunning = false;
          break; // Thoát khỏi vòng lặp
        }
        
        // Chỉ thực hiện strategy nếu vẫn đang chạy
        if (this.isRunning) {
          await this.executeStrategy();
          
          // Đợi theo đúng timeframe thay vì cố định 10s
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
      
      console.log('[BotExecutor] 🛑 Vòng lặp chính đã dừng');
    } catch (error) {
      console.error('[BotExecutor] Error running bot:', error);
      await this.handleError(error);
    }
  }

  async stop() {
    console.log('[BotExecutor] 🛑 Stopping bot:', this.bot?.name);
    
    // Set flag để dừng vòng lặp
    this.isRunning = false;
    
    // Cập nhật status trong database ngay lập tức
    await this.updateBotStatus('stopped');
    
    // Clear current position để tránh "ghost trading"
    this.currentPosition = null;
    
    // Đảm bảo status đã được cập nhật trong database
    try {
      const { data: botStatus } = await this.supabaseAdmin
        .from('trading_bots')
        .select('status')
        .eq('id', this.bot.id)
        .single();
      
      if (botStatus && botStatus.status !== 'stopped') {
        console.log('[BotExecutor] ⚠️ Bot status not properly updated, forcing stop');
        await this.updateBotStatus('stopped');
      }
    } catch (error) {
      console.error('[BotExecutor] Error verifying bot stop status:', error);
    }
    
    console.log('[BotExecutor] ✅ Bot stopped successfully:', this.bot?.name);
  }

  private async executeStrategy() {
    try {
      // Kiểm tra xem bot có đang chạy không - kiểm tra cả isRunning và status từ database
      if (!this.isRunning) {
        console.log(`[${this.bot.name}] ⏸️ Bot stopped, skipping execution`);
        return;
      }

      // Kiểm tra status từ database - DỪNG ngay nếu không phải running
      try {
        const { data: botStatus } = await this.supabaseAdmin
          .from('trading_bots')
          .select('status')
          .eq('id', this.bot.id)
          .single();
        
        if (botStatus && botStatus.status !== 'running') {
          console.log(`[BotExecutor] 🛑 Bot status in database is ${botStatus.status}, stopping execution`);
          this.isRunning = false;
          return;
        }
      } catch (error) {
        console.error('[BotExecutor] Error checking bot status from database:', error);
        console.log(`[${this.bot.name}] 🛑 Cannot check status, stopping for safety`);
        this.isRunning = false;
        return;
      }
      
      console.log(`[${this.bot.name}] 🎯 Running ${this.config.strategy.type} strategy on ${this.config.symbol} (${this.config.timeframe})`);
      
      // Enhanced detailed logging
      botLogger.info('Strategy execution started', {
        botName: this.bot.name,
        botId: this.bot.id,
        symbol: this.config.symbol,
        timeframe: this.config.timeframe,
        timestamp: new Date().toISOString(),
        currentPosition: this.currentPosition,
        isRunning: this.isRunning
      });
      
      console.log(`[BotExecutor] 🔍 DEBUG: Strategy execution details:`, {
        botName: this.bot.name,
        botId: this.bot.id,
        symbol: this.config.symbol,
        timeframe: this.config.timeframe,
        timestamp: new Date().toISOString(),
        currentPosition: this.currentPosition,
        isRunning: this.isRunning,
        lastExecutionTime: this.lastExecutionTime,
        timeSinceLastExecution: this.lastExecutionTime ? Date.now() - this.lastExecutionTime : 'N/A'
      });
      
      // Lấy dữ liệu candles
      const candlesRes = await fetch(`${API_BASE_URL}/api/trading/binance/candles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: this.config.timeframe,
          limit: 100,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!candlesRes.ok) {
        // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
        console.log(`[BotExecutor] ⏭️ Bỏ qua signal - Không thể lấy dữ liệu candles`);
        return;
      }

      const candlesData = await candlesRes.json();
      
      // Kiểm tra format dữ liệu trả về
      if (!candlesData.candles || !Array.isArray(candlesData.candles) || candlesData.candles.length === 0) {
        throw new Error('Dữ liệu candles không hợp lệ hoặc rỗng');
      }

      console.log(`[BotExecutor] 📊 Fetched ${candlesData.candles.length} candles`);
      console.log(`[BotExecutor] 📅 Latest candle time: ${new Date(candlesData.candles[candlesData.candles.length - 1].time).toLocaleString()}`);
      
      // Enhanced candles logging
      const latestCandle = candlesData.candles[candlesData.candles.length - 1];
      const oldestCandle = candlesData.candles[0];
      
      console.log(`[BotExecutor] 🔍 DEBUG: Candles data analysis:`, {
        totalCandles: candlesData.candles.length,
        oldestCandle: {
          time: new Date(oldestCandle[0]).toISOString(),
          open: oldestCandle[1],
          close: oldestCandle[4],
          volume: oldestCandle[5]
        },
        latestCandle: {
          time: new Date(latestCandle[0]).toISOString(),
          open: latestCandle[1],
          close: latestCandle[4],
          volume: latestCandle[5]
        },
        timeRange: {
          from: new Date(oldestCandle[0]).toISOString(),
          to: new Date(latestCandle[0]).toISOString(),
          duration: new Date(latestCandle[0]).getTime() - new Date(oldestCandle[0]).getTime()
        }
      });
      
      botLogger.debug('Candles data fetched', {
        botName: this.bot.name,
        symbol: this.config.symbol,
        totalCandles: candlesData.candles.length,
        timeRange: {
          from: new Date(oldestCandle[0]).toISOString(),
          to: new Date(latestCandle[0]).toISOString()
        }
      });

      // Format dữ liệu candles từ Binance API
      const formattedCandles = candlesData.candles.map((candle: any[]) => ({
        openTime: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        closeTime: candle[6]
      }));

      // Tính toán signal
      console.log(`[BotExecutor] 🔍 DEBUG: Starting signal calculation...`);
      console.log(`[BotExecutor] 🔍 DEBUG: Input candles:`, {
        count: formattedCandles.length,
        firstCandle: formattedCandles[0],
        lastCandle: formattedCandles[formattedCandles.length - 1]
      });
      
      const signalCalculationStart = Date.now();
      const signal = await this.calculateSignal(formattedCandles);
      const signalCalculationTime = Date.now() - signalCalculationStart;
      
      console.log('[BotExecutor] Calculated signal:', signal);
      console.log(`[BotExecutor] 🔍 DEBUG: Signal calculation completed in ${signalCalculationTime}ms`);
      console.log('[BotExecutor] Current position:', this.currentPosition);
      
      // Enhanced signal logging
      botLogger.info('Signal calculated', {
        botName: this.bot.name,
        symbol: this.config.symbol,
        signal: signal,
        calculationTime: signalCalculationTime,
        timestamp: new Date().toISOString(),
        currentPosition: this.currentPosition
      });
      
      console.log(`[BotExecutor] 🔍 DEBUG: Signal analysis:`, {
        signal: signal,
        calculationTime: signalCalculationTime,
        timestamp: new Date().toISOString(),
        currentPosition: this.currentPosition,
        strategy: this.config.strategy.type,
        strategyParams: this.config.strategy.parameters
      });

      // Kiểm tra position thực tế từ Binance
      console.log(`[BotExecutor] 🔍 DEBUG: Checking real position from Binance...`);
      const positionCheckStart = Date.now();
      const hasRealPosition = await this.checkRealPosition();
      const positionCheckTime = Date.now() - positionCheckStart;
      
      console.log('[BotExecutor] Has real position from Binance:', hasRealPosition);
      console.log(`[BotExecutor] 🔍 DEBUG: Position check completed in ${positionCheckTime}ms`);
      
      // Enhanced position logging
      botLogger.debug('Position check completed', {
        botName: this.bot.name,
        symbol: this.config.symbol,
        hasRealPosition: hasRealPosition,
        currentPosition: this.currentPosition,
        checkTime: positionCheckTime,
        timestamp: new Date().toISOString()
      });

      // Clear currentPosition nếu không có position thực tế trên Binance
      if (this.currentPosition && !hasRealPosition) {
        console.log('[BotExecutor] Clearing currentPosition because no real position exists');
        console.log(`[BotExecutor] 🔍 DEBUG: Position mismatch detected:`, {
          localPosition: this.currentPosition,
          hasRealPosition: hasRealPosition,
          reason: 'Local position exists but no real position on Binance'
        });
        
        botLogger.warn('Position mismatch detected', {
          botName: this.bot.name,
          symbol: this.config.symbol,
          localPosition: this.currentPosition,
          hasRealPosition: hasRealPosition,
          action: 'Clearing local position'
        });
        
        this.currentPosition = null;
      }

      // Kiểm tra lại isRunning trước khi thực hiện giao dịch
      if (!this.isRunning) {
        console.log('[BotExecutor] Bot was stopped during execution, skipping trades');
        return;
      }

      // Kiểm tra status từ database trước khi thực hiện giao dịch - DỪNG ngay nếu không phải running
      try {
        const { data: botStatus } = await this.supabaseAdmin
          .from('trading_bots')
          .select('status')
          .eq('id', this.bot.id)
          .single();
        
        if (botStatus && botStatus.status !== 'running') {
          console.log(`[BotExecutor] 🛑 Bot status in database is ${botStatus.status}, stopping trade execution`);
          this.isRunning = false;
          return;
        }
      } catch (error) {
        console.error('[BotExecutor] Error checking bot status before trade:', error);
        console.log(`[${this.bot.name}] 🛑 Cannot check status, stopping for safety`);
        this.isRunning = false;
        return;
      }

      // Kiểm tra lại status một lần nữa trước khi thực hiện bất kỳ hành động nào
      try {
        const { data: finalBotStatus } = await this.supabaseAdmin
          .from('trading_bots')
          .select('status')
          .eq('id', this.bot.id)
          .single();
        
        if (finalBotStatus && finalBotStatus.status !== 'running') {
          console.log(`[BotExecutor] 🛑 Final check: Bot status is ${finalBotStatus.status}, stopping all actions`);
          this.isRunning = false;
          return;
        }
      } catch (error) {
        console.error('[BotExecutor] Error in final status check:', error);
        console.log('[BotExecutor] 🛑 Cannot verify status, stopping for safety');
        this.isRunning = false;
        return;
      }

      // Kiểm tra balance trước khi thực hiện signal để tránh lỗi liên tiếp
      if (signal) {
        const canExecuteSignal = await this.checkBalanceForSignal(signal);
        
        if (!canExecuteSignal) {
          // Bỏ qua signal một cách im lặng - không báo lỗi, không cập nhật error
          console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal.toUpperCase()} signal - Balance không đủ để trade`);
          console.log(`[BotExecutor] ℹ️ Bot đã BUY/SELL toàn bộ balance, chờ signal tiếp theo`);
          return; // Bỏ qua signal này một cách im lặng
        }
      }
      
      // Enhanced trade execution logging
      console.log(`[BotExecutor] 🔍 DEBUG: Trade execution decision:`, {
        signal: signal,
        currentPosition: this.currentPosition,
        hasRealPosition: hasRealPosition,
        canExecute: signal && this.isRunning,
        timestamp: new Date().toISOString()
      });
      
      botLogger.info('Trade execution decision', {
        botName: this.bot.name,
        symbol: this.config.symbol,
        signal: signal,
        currentPosition: this.currentPosition,
        hasRealPosition: hasRealPosition,
        decision: signal ? 'Execute' : 'No action'
      });

      // Đơn giản hóa: Chỉ BUY/SELL, không quản lý position
      console.log(`[BotExecutor] 🔍 DEBUG: Simple logic flow:`, {
        signal: signal,
        hasRealPosition: hasRealPosition,
        timestamp: new Date().toISOString()
      });
      
      // Log chi tiết quyết định
      console.log(`[BotExecutor] 🎯 Decision Making Process:`, {
        step1: 'Signal received',
        signal: signal,
        step2: 'Balance check',
        hasRealPosition: hasRealPosition,
        step3: 'Logic evaluation',
        buyCondition: signal === 'buy', // Luôn thực hiện BUY nếu có signal
        sellCondition: signal === 'sell', // Luôn thực hiện SELL nếu có signal
        step4: 'Action decision',
        explanation: 'New logic: Always execute signal if balance check passes',
        timestamp: new Date().toISOString()
      });
      
            // Logic mới: Mua hết USDT khi có BUY signal, Bán hết BTC khi có SELL signal
      if (signal === 'buy') {
        // BUY signal: Luôn thực hiện nếu có USDT (balance check đã được thực hiện trước đó)
        console.log('[BotExecutor] 🟢 BUY Signal: Dùng hết USDT để mua BTC');
        console.log(`[BotExecutor] 🔍 DEBUG: BUY execution details:`, {
          reason: 'Signal=buy && Balance check passed',
          action: 'Execute BUY with 100% USDT',
          expectedResult: 'Convert all USDT to BTC',
          timestamp: new Date().toISOString()
        });
        
        botLogger.info('Executing BUY signal (all USDT)', {
          botName: this.bot.name,
          symbol: this.config.symbol,
          signal: signal,
          timestamp: new Date().toISOString()
        });
        
        await this.executeTrade('buy');
        
      } else if (signal === 'sell') {
        // SELL signal: Luôn thực hiện nếu có BTC (balance check đã được thực hiện trước đó)
        console.log('[BotExecutor] 🔴 SELL Signal: Bán hết BTC để lấy USDT');
        console.log(`[BotExecutor] 🔍 DEBUG: SELL execution details:`, {
          reason: 'Signal=sell && Balance check passed',
          action: 'Execute SELL with 100% BTC',
          expectedResult: 'Convert all BTC to USDT',
          timestamp: new Date().toISOString()
        });
        
        botLogger.info('Executing SELL signal (all BTC)', {
          botName: this.bot.name,
          symbol: this.config.symbol,
          signal: signal,
          timestamp: new Date().toISOString()
        });
        
        await this.executeTrade('sell');
        
      } else if (!signal) {
        // Không có signal - chờ
        console.log('[BotExecutor] ⏳ Không có signal - chờ tín hiệu tiếp theo');
        console.log(`[BotExecutor] 🔍 DEBUG: No signal details:`, {
          reason: 'No trading signal generated',
          action: 'Wait for next signal',
          explanation: 'Strategy did not generate buy/sell signal',
          nextAction: 'Continue monitoring market',
          timestamp: new Date().toISOString()
        });
        
        botLogger.debug('No signal - waiting', {
          botName: this.bot.name,
          symbol: this.config.symbol,
          timestamp: new Date().toISOString()
        });
        
      } else {
        // Trường hợp khác - log để debug
        console.log(`[BotExecutor] ❓ Trường hợp không xác định:`, {
          signal: signal,
          hasRealPosition: hasRealPosition,
          timestamp: new Date().toISOString()
        });
        console.log(`[BotExecutor] 🔍 DEBUG: Unknown case analysis:`, {
          signalType: typeof signal,
          signalValue: signal,
          hasRealPositionType: typeof hasRealPosition,
          hasRealPositionValue: hasRealPosition,
          possibleIssues: [
            'Signal might be undefined/null',
            'hasRealPosition might be undefined/null',
            'Unexpected signal value',
            'Logic error in condition evaluation'
          ],
          timestamp: new Date().toISOString()
        });
      }

              // Cập nhật thời gian thực thi cuối
        this.lastExecutionTime = Date.now();
        
        // Log summary của cycle này
        console.log(`[BotExecutor] 📊 Cycle Summary:`, {
          cycle: 'Completed',
          signal: signal,
          action: signal === 'buy' ? 'EXECUTE BUY (100% USDT)' :
                  signal === 'sell' ? 'EXECUTE SELL (100% BTC)' :
                  !signal ? 'WAIT' : 'UNKNOWN',
          reason: signal === 'buy' ? 'Buy signal + Balance check passed' :
                  signal === 'sell' ? 'Sell signal + Balance check passed' :
                  !signal ? 'No signal generated' : 'Unexpected condition',
          nextAction: signal === 'buy' ? 'Wait for SELL signal' :
                     signal === 'sell' ? 'Wait for BUY signal' :
                     !signal ? 'Continue monitoring' : 'Investigate issue',
          executionTime: Date.now() - this.lastExecutionTime,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      console.error('[BotExecutor] Error executing strategy:', error);
      await this.handleError(error);
    }
  }

  private async calculateSignal(candles: any[]): Promise<'buy' | 'sell' | null> {
    try {
      console.log(`[${this.bot.name}] 🔍 Analyzing ${candles.length} candles...`);
      
      if (candles.length < 50) {
        console.log(`[${this.bot.name}] ⚠️ Not enough data (need 50, have ${candles.length})`);
        return null;
      }

      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const currentPrice = closes[closes.length - 1];
      
      console.log(`[${this.bot.name}] 💰 Current price: $${currentPrice.toFixed(2)}`);
      

      
      const strategy = this.config.strategy;
      console.log(`[${this.bot.name}] 📊 Using ${strategy.type} strategy`);
      
      let signalResult: 'buy' | 'sell' | null = null;
      const strategyStartTime = Date.now();
      
      switch (strategy.type.toLowerCase()) {
        case 'ma_crossover':
        case 'ma_cross':
          signalResult = this.calculateMACrossoverSignal(closes, strategy.parameters);
          break;
          
        case 'rsi':
          signalResult = this.calculateRSISignal(closes, strategy.parameters);
          break;
          
        case 'bollinger_bands':
        case 'bollinger':
        case 'bb':
          signalResult = this.calculateBollingerBandsSignal(closes, strategy.parameters);
          break;
          
        case 'ichimoku':
          signalResult = this.calculateIchimokuSignal(closes, highs, lows, strategy.parameters);
          break;
          
        default:
          console.warn('[BotExecutor] Calculate Signal Debug - Unknown strategy type:', strategy.type);
          console.log('[BotExecutor] Calculate Signal Debug - Supported types: ma_crossover, rsi, bollinger_bands, ichimoku');
          
          botLogger.warn('Unknown strategy type', {
            botName: this.bot.name,
            symbol: this.config.symbol,
            strategyType: strategy.type,
            supportedTypes: ['ma_crossover', 'rsi', 'bollinger_bands', 'ichimoku']
          });
          
          return null;
      }
      
      const strategyExecutionTime = Date.now() - strategyStartTime;
      
      if (signalResult) {
        console.log(`[${this.bot.name}] 🎯 Signal: ${signalResult.toUpperCase()} (${strategyExecutionTime}ms)`);
      } else {
        console.log(`[${this.bot.name}] ⏸️ No signal (${strategyExecutionTime}ms)`);
      }
      
      return signalResult;
    } catch (error) {
      console.error(`[${this.bot.name}] ❌ Signal calculation error:`, (error as Error).message);
      return null;
    }
  }

  private calculateMACrossoverSignal(closes: number[], params: any): 'buy' | 'sell' | null {
    const fastPeriod = params.fastPeriod || 10;
    const slowPeriod = params.slowPeriod || 20;
    
    const fastMA = this.calculateSMA(closes, fastPeriod);
    const slowMA = this.calculateSMA(closes, slowPeriod);
    
    if (fastMA.length < 2 || slowMA.length < 2) return null;
    
    const currentFast = fastMA[fastMA.length - 1];
    const previousFast = fastMA[fastMA.length - 2];
    const currentSlow = slowMA[slowMA.length - 1];
    const previousSlow = slowMA[slowMA.length - 2];
    
    // Golden cross: fast MA crosses above slow MA
    if (previousFast <= previousSlow && currentFast > currentSlow) {
      return 'buy';
    }
    
    // Death cross: fast MA crosses below slow MA
    if (previousFast >= previousSlow && currentFast < currentSlow) {
      return 'sell';
    }
    
    return null;
  }

  private calculateRSISignal(closes: number[], params: any): 'buy' | 'sell' | null {
    console.log('[BotExecutor] RSI Signal Debug - Starting calculation');
    console.log('[BotExecutor] RSI Signal Debug - Parameters:', params);
    console.log('[BotExecutor] RSI Signal Debug - Closes length:', closes.length);
    
    const period = params.period || 14;
    const oversold = params.oversold || 30;
    const overbought = params.overbought || 70;
    
    console.log(`[BotExecutor] RSI Signal Debug - Using period: ${period}, oversold: ${oversold}, overbought: ${overbought}`);
    
    const rsi = this.calculateRSI(closes, period);
    console.log('[BotExecutor] RSI Signal Debug - RSI calculation result length:', rsi.length);
    
    if (rsi.length === 0) {
      console.log('[BotExecutor] RSI Signal Debug - No RSI values calculated, returning null');
      return null;
    }
    
    const currentRSI = rsi[rsi.length - 1];
    console.log(`[BotExecutor] RSI Signal Debug - Current RSI: ${currentRSI}`);
    
    if (currentRSI < oversold) {
      console.log(`[BotExecutor] RSI Signal Debug - RSI ${currentRSI} < ${oversold}, returning BUY signal`);
      return 'buy';
    } else if (currentRSI > overbought) {
      console.log(`[BotExecutor] RSI Signal Debug - RSI ${currentRSI} > ${overbought}, returning SELL signal`);
      return 'sell';
    } else {
      console.log(`[BotExecutor] RSI Signal Debug - RSI ${currentRSI} in neutral range, returning null`);
      return null;
    }
  }

  private calculateBollingerBandsSignal(closes: number[], params: any): 'buy' | 'sell' | null {
    const period = params.period || 20;
    const stdDev = params.stdDev || 2;
    
    if (closes.length < period) return null;
    
    const sma = this.calculateSMA(closes, period);
    const middle = sma[sma.length - 1];
    const std = this.calculateStdDev(closes.slice(-period));
    const upper = middle + (std * stdDev);
    const lower = middle - (std * stdDev);
    
    const currentPrice = closes[closes.length - 1];
    
    if (currentPrice <= lower) {
      return 'buy';
    } else if (currentPrice >= upper) {
      return 'sell';
    }
    
    return null;
  }

  private calculateIchimokuSignal(closes: number[], highs: number[], lows: number[], params: any): 'buy' | 'sell' | null {
    try {
      
      const tenkanPeriod = params.tenkanPeriod || 9;
      const kijunPeriod = params.kijunPeriod || 26;
      const senkouSpanBPeriod = params.senkouSpanBPeriod || 52;
      const displacement = 26; // Standard Ichimoku displacement
      
      // Cần ít nhất 52 + 26 = 78 candles để tính đầy đủ Ichimoku
      if (closes.length < senkouSpanBPeriod + displacement) {
        return null;
      }
      
      // Tính Tenkan-sen (Conversion Line) - sử dụng high/low thực tế
      const tenkanSen = this.calculateTenkanSen(highs, lows, tenkanPeriod);
      const currentTenkan = tenkanSen[tenkanSen.length - 1];
      const prevTenkan = tenkanSen[tenkanSen.length - 2];
      
      // Tính Kijun-sen (Base Line) - sử dụng high/low thực tế
      const kijunSen = this.calculateKijunSen(highs, lows, kijunPeriod);
      const currentKijun = kijunSen[kijunSen.length - 1];
      const prevKijun = kijunSen[kijunSen.length - 2];
      
      // Tính Senkou Span A (Leading Span A) - shifted forward
      const senkouSpanA = (currentTenkan + currentKijun) / 2;
      
      // Tính Senkou Span B (Leading Span B) - shifted forward
      const senkouSpanB = this.calculateSenkouSpanB(highs, lows, senkouSpanBPeriod);
      const currentSenkouB = senkouSpanB[senkouSpanB.length - 1];
      
      // Tính Chikou Span (Lagging Span) - shifted backward
      const chikouSpan = closes[closes.length - 1 - displacement];
      
      const currentPrice = closes[closes.length - 1];
      
      // 1. Kiểm tra crossover Tenkan và Kijun
      const tenkanCrossAboveKijun = currentTenkan > currentKijun && prevTenkan <= prevKijun;
      const tenkanCrossBelowKijun = currentTenkan < currentKijun && prevTenkan >= prevKijun;
      
      // 2. Kiểm tra vị trí giá so với cloud
      const priceAboveCloud = currentPrice > Math.max(senkouSpanA, currentSenkouB);
      const priceBelowCloud = currentPrice < Math.min(senkouSpanA, currentSenkouB);
      
      // 3. Kiểm tra Chikou confirmation
      const chikouConfirmsBullish = chikouSpan > currentPrice;
      const chikouConfirmsBearish = chikouSpan < currentPrice;
      
      // 4. LOGIC MUA - giống hệt backtest
      const buyCondition = (
        priceAboveCloud && 
        tenkanCrossAboveKijun && 
        chikouConfirmsBullish
      );
      
      // 5. LOGIC BÁN - giống hệt backtest
      const sellCondition = (
        priceBelowCloud && 
        tenkanCrossBelowKijun && 
        chikouConfirmsBearish
      );
      
      // 6. Xác định tín hiệu cuối cùng
      if (buyCondition) {
        return 'buy';
      } else if (sellCondition) {
        return 'sell';
      } else {
        return null;
      }
      
    } catch (error) {
      console.error(`[${this.bot.name}] ❌ Ichimoku calculation error:`, (error as Error).message);
      return null;
    }
  }

  private calculateSMA(data: number[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  /**
   * Tính Tenkan-sen (Conversion Line) - sử dụng high/low thực tế
   * Tenkan = (Highest High + Lowest Low) / 2 trong 9 periods
   */
  private calculateTenkanSen(highs: number[], lows: number[], period: number): number[] {
    const tenkan = [];
    for (let i = period - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const highest = Math.max(...highSlice);
      const lowest = Math.min(...lowSlice);
      tenkan.push((highest + lowest) / 2);
    }
    return tenkan;
  }

  /**
   * Tính Kijun-sen (Base Line) - sử dụng high/low thực tế
   * Kijun = (Highest High + Lowest Low) / 2 trong 26 periods
   */
  private calculateKijunSen(highs: number[], lows: number[], period: number): number[] {
    const kijun = [];
    for (let i = period - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const highest = Math.max(...highSlice);
      const lowest = Math.min(...lowSlice);
      kijun.push((highest + lowest) / 2);
    }
    return kijun;
  }

  /**
   * Tính Senkou Span B (Leading Span B) - sử dụng high/low thực tế
   * Senkou Span B = (Highest High + Lowest Low) / 2 trong 52 periods, shifted forward 26 periods
   */
  private calculateSenkouSpanB(highs: number[], lows: number[], period: number): number[] {
    const senkouB = [];
    for (let i = period - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const highest = Math.max(...highSlice);
      const lowest = Math.min(...lowSlice);
      senkouB.push((highest + lowest) / 2);
    }
    return senkouB;
  }

  private calculateRSI(data: number[], period: number): number[] {
    if (data.length < period + 1) {
      return [];
    }

    // Kiểm tra dữ liệu đầu vào
    if (data.some(price => isNaN(price) || price <= 0)) {
      console.error(`[${this.bot.name}] ❌ RSI: Invalid price data`);
      return [];
    }

    const rsi = [];
    let gains = 0;
    let losses = 0;

    // Tính toán giá trị đầu tiên - sửa logic
    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Tính RSI cho các giá trị tiếp theo
    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }

      // Xử lý trường hợp avgLoss = 0 để tránh NaN
      let rs;
      if (avgLoss === 0) {
        rs = avgGain > 0 ? 100 : 0; // Nếu không có loss, RSI = 100 hoặc 0
      } else {
        rs = avgGain / avgLoss;
      }

      const rsiValue = 100 - (100 / (1 + rs));
      
      // Kiểm tra giá trị RSI hợp lệ
      if (isNaN(rsiValue) || !isFinite(rsiValue)) {
        console.error(`[BotExecutor] RSI Error - Invalid RSI value: ${rsiValue} at index ${i}`);
        rsi.push(50); // Giá trị mặc định
      } else {
        rsi.push(rsiValue);
      }
    }


    
    return rsi;
  }

  private calculateStdDev(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(variance);
  }

  private async executeTrade(signal: 'buy' | 'sell') {
    try {
      // Enhanced trade execution logging
      console.log(`[BotExecutor] 🔍 DEBUG: Trade execution started:`, {
        signal: signal,
        botName: this.bot.name,
        botId: this.bot.id,
        symbol: this.config.symbol,
        timestamp: new Date().toISOString(),
        isRunning: this.isRunning,
        currentPosition: this.currentPosition
      });
      
      botLogger.info('Trade execution started', {
        botName: this.bot.name,
        symbol: this.config.symbol,
        signal: signal,
        timestamp: new Date().toISOString()
      });
      
      // Kiểm tra xem bot có đang chạy không
      if (!this.isRunning) {
        console.log('[BotExecutor] Bot is stopped, skipping trade execution');
        console.log(`[BotExecutor] 🔍 DEBUG: Trade execution skipped:`, {
          reason: 'Bot is stopped',
          isRunning: this.isRunning,
          timestamp: new Date().toISOString()
        });
        
        botLogger.warn('Trade execution skipped - Bot stopped', {
          botName: this.bot.name,
          symbol: this.config.symbol,
          signal: signal,
          reason: 'Bot is stopped'
        });
        
        return;
      }

      // Kiểm tra thêm status từ database - DỪNG ngay nếu không phải running
      try {
        const { data: botStatus } = await this.supabaseAdmin
          .from('trading_bots')
          .select('status')
          .eq('id', this.bot.id)
          .single();
        
        if (botStatus && botStatus.status !== 'running') {
          console.log(`[BotExecutor] 🛑 Bot status is ${botStatus.status}, stopping trade execution`);
          this.isRunning = false;
          return;
        }
      } catch (error) {
        console.error('[BotExecutor] Error checking bot status for trade execution:', error);
        console.log(`[${this.bot.name}] 🛑 Cannot check status, stopping for safety`);
        this.isRunning = false;
        return;
      }

      console.log(`[${this.bot.name}] 🚀 Executing ${signal.toUpperCase()} trade...`);
      const priceFetchStart = Date.now();
      
      // Lấy giá hiện tại
      const priceUrl = `${API_BASE_URL}/api/trading/binance/price`;
      
      const priceRes = await fetch(priceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      }).catch(error => {
        console.error(`[BotExecutor] ❌ Fetch error for ${priceUrl}:`, error);
        throw new Error(`Failed to fetch price: ${error.message}`);
      });

      const priceFetchTime = Date.now() - priceFetchStart;
      console.log(`[BotExecutor] 🔍 DEBUG: Price fetch completed in ${priceFetchTime}ms`);

      if (!priceRes.ok) {
        // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
        console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal} signal - Không thể lấy giá hiện tại`);
        console.log(`[BotExecutor] 🔍 DEBUG: Price fetch failed:`, {
          status: priceRes.status,
          statusText: priceRes.statusText,
          fetchTime: priceFetchTime,
          timestamp: new Date().toISOString()
        });
        
        botLogger.warn('Price fetch failed', {
          botName: this.bot.name,
          symbol: this.config.symbol,
          signal: signal,
          status: priceRes.status,
          fetchTime: priceFetchTime
        });
        
        return;
      }

      const priceData = await priceRes.json();
      const currentPrice = parseFloat(priceData.price);
      
      console.log(`[BotExecutor] 🔍 DEBUG: Price data received:`, {
        symbol: this.config.symbol,
        price: currentPrice,
        rawData: priceData,
        fetchTime: priceFetchTime,
        timestamp: new Date().toISOString()
      });
      
      botLogger.debug('Price fetched successfully', {
        botName: this.bot.name,
        symbol: this.config.symbol,
        price: currentPrice,
        fetchTime: priceFetchTime
      });

      // Lấy balance thực tế từ Binance
      const balanceUrl = `${API_BASE_URL}/api/trading/binance/balance`;
      console.log(`[BotExecutor] 🔍 DEBUG: Fetching balance from: ${balanceUrl}`);
      
      const balanceRes = await fetch(balanceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      }).catch(error => {
        console.error(`[BotExecutor] ❌ Fetch error for ${balanceUrl}:`, error);
        throw new Error(`Failed to fetch balance: ${error.message}`);
      });

      if (!balanceRes.ok) {
        // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
        console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal} signal - Không thể lấy balance từ Binance`);
        return;
      }

      const balanceData = await balanceRes.json();
      console.log(`[BotExecutor] 💰 Balance data received:`, balanceData);
      
      // Tính toán số lượng dựa trên positionSize từ bot config
      let quantity: number;
      const positionSizePercent = this.bot.config.positionSize || 10; // Mặc định 10%
      console.log(`[BotExecutor] 📊 Position Size: ${positionSizePercent}%`);
      
      if (signal === 'buy') {
        // Mua: sử dụng 100% USDT balance
        const usdtBalance = parseFloat(balanceData.USDT || '0');
        console.log(`[BotExecutor] 💵 USDT Balance: ${usdtBalance}`);
        
        if (usdtBalance <= 0) {
          console.log(`[BotExecutor] ⚠️ USDT balance = ${usdtBalance}, không thể thực hiện BUY`);
          return; // Thoát mà không throw error
        }
        
        // Sử dụng 100% USDT balance (99% để tránh lỗi)
        const usdtToUse = usdtBalance * 0.99;
        
        // Tính quantity dựa trên 100% USDT balance
        quantity = usdtToUse / currentPrice;
        
        console.log(`[BotExecutor] 🛒 BUY Signal Details (100% USDT):`);
        console.log(`[BotExecutor] 💰 USDT balance: ${usdtBalance}`);
        console.log(`[BotExecutor] 💵 USDT sẽ sử dụng (100%): ${usdtToUse.toFixed(2)}`);
        console.log(`[BotExecutor] 📈 Current price: ${currentPrice}`);
        console.log(`[BotExecutor] 🎯 Quantity cuối cùng: ${quantity.toFixed(6)} BTC`);
        
      } else {
        // Bán: sử dụng 100% BTC balance
        const btcBalance = parseFloat(balanceData.BTC || '0');
        console.log(`[BotExecutor] ₿ BTC Balance: ${btcBalance}`);
        
        if (btcBalance <= 0) {
          console.log(`[BotExecutor] ⚠️ BTC balance = ${btcBalance}, không thể thực hiện SELL`);
          return; // Thoát mà không throw error
        }
        
        // Sử dụng 100% BTC balance (99% để tránh lỗi)
        quantity = btcBalance * 0.99;
        
        console.log(`[BotExecutor] 🛒 SELL Signal Details (100% BTC):`);
        console.log(`[BotExecutor] ₿ BTC balance: ${btcBalance}`);
        console.log(`[BotExecutor] ₿ BTC sẽ bán (100%): ${quantity.toFixed(6)}`);
        console.log(`[BotExecutor] 📈 Current price: ${currentPrice}`);
        console.log(`[BotExecutor] 💰 Order value: ${(quantity * currentPrice).toFixed(2)} USDT`);
      }

      // Kiểm tra quantity hợp lệ
      if (quantity <= 0 || isNaN(quantity)) {
        console.log(`[BotExecutor] ⚠️ Quantity không hợp lệ: ${quantity}, bỏ qua giao dịch`);
        return; // Thoát mà không throw error
      }

      // Kiểm tra quantity cuối cùng trước khi đặt order
      if (quantity <= 0 || isNaN(quantity)) {
        console.log(`[BotExecutor] ⚠️ Quantity cuối cùng không hợp lệ: ${quantity}, bỏ qua giao dịch`);
        return;
      }
      
      // Kiểm tra minimum notional để tránh lỗi "Filter failure: NOTIONAL"
      const orderValue = quantity * currentPrice;
      const minNotional = 10; // Binance yêu cầu tối thiểu 10 USDT
      
      if (orderValue < minNotional) {
        // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
        console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal.toUpperCase()} signal - Order value (${orderValue.toFixed(2)} USDT) < minimum (${minNotional} USDT)`);
        return;
      }
      
      // Validation cuối cùng: đảm bảo quantity không vượt quá balance
      if (signal === 'buy') {
        const requiredUsdt = quantity * currentPrice;
        const availableUsdt = parseFloat(balanceData.USDT || '0');
        
        if (requiredUsdt > availableUsdt) {
          // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
          console.log(`[BotExecutor] ⏭️ Bỏ qua BUY signal - Cần ${requiredUsdt.toFixed(2)} USDT nhưng chỉ có ${availableUsdt}`);
          return;
        }
      } else {
        const availableBtc = parseFloat(balanceData.BTC || '0');
        
        if (quantity > availableBtc) {
          // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
          console.log(`[BotExecutor] ⏭️ Bỏ qua SELL signal - Cần bán ${quantity} BTC nhưng chỉ có ${availableBtc}`);
          return;
        }
      }
      
      console.log(`[BotExecutor] ✅ Quantity cuối cùng hợp lệ: ${quantity.toFixed(6)}`);
      console.log(`[BotExecutor] ✅ Order value: ${orderValue.toFixed(2)} USDT >= ${minNotional} USDT`);
      console.log(`[BotExecutor] ✅ Balance đủ để thực hiện giao dịch`);

      // Kiểm tra lại isRunning trước khi thực hiện order
      if (!this.isRunning) {
        console.log('[BotExecutor] Bot was stopped before placing order, cancelling trade');
        return;
      }

      // Kiểm tra thêm một lần nữa status từ database trước khi đặt order - DỪNG ngay nếu không phải running
      try {
        const { data: botStatus } = await this.supabaseAdmin
          .from('trading_bots')
          .select('status')
          .eq('id', this.bot.id)
          .single();
        
        if (botStatus && botStatus.status !== 'running') {
          console.log(`[BotExecutor] 🛑 Bot status is ${botStatus.status} before order placement, stopping`);
          this.isRunning = false;
          return;
        }
      } catch (error) {
        console.error('[BotExecutor] Error checking bot status before order placement:', error);
        console.log(`[${this.bot.name}] 🛑 Cannot check status, stopping for safety`);
        this.isRunning = false;
        return;
      }

      // Thực hiện order
      console.log(`[BotExecutor] 📤 Placing ${signal.toUpperCase()} order...`);
      console.log(`[BotExecutor] 📋 Order details:`, {
        symbol: this.config.symbol,
        side: signal.toUpperCase(),
        type: 'MARKET',
        quantity: quantity.toFixed(6),
        price: currentPrice
      });
      
      const orderRes = await fetch(`${API_BASE_URL}/api/trading/binance/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          side: signal.toUpperCase(),
          type: 'MARKET',
          quantity: quantity.toFixed(6),
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!orderRes.ok) {
        // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
        console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal} signal - Không thể thực hiện order`);
        return;
      }

      const order = await orderRes.json();
      console.log(`[BotExecutor] ✅ Order executed successfully:`, order);
      console.log(`[BotExecutor] 📊 Order fills:`, order.fills);
      console.log(`[BotExecutor] 💰 Entry price: ${parseFloat(order.fills[0].price)}`);
      console.log(`[BotExecutor] 📈 Quantity filled: ${order.fills[0].qty}`);

      // Kiểm tra lại isRunning trước khi cập nhật position
      if (!this.isRunning) {
        console.log('[BotExecutor] Bot was stopped after order, but position was opened');
        return;
      }

      this.currentPosition = {
        entryPrice: parseFloat(order.fills[0].price),
        quantity: quantity,
        side: signal,
        stopLoss: signal === 'buy' 
          ? currentPrice * (1 - this.config.riskManagement.stopLoss / 100)
          : currentPrice * (1 + this.config.riskManagement.stopLoss / 100),
        takeProfit: signal === 'buy'
          ? currentPrice * (1 + this.config.riskManagement.takeProfit / 100)
          : currentPrice * (1 - this.config.riskManagement.takeProfit / 100)
      };
      
      console.log(`[BotExecutor] 📊 Position opened successfully:`);
      console.log(`[BotExecutor] 🎯 Side: ${this.currentPosition.side.toUpperCase()}`);
      console.log(`[BotExecutor] 💰 Entry price: ${this.currentPosition.entryPrice}`);
      console.log(`[BotExecutor] 📈 Quantity: ${this.currentPosition.quantity}`);
      console.log(`[BotExecutor] 🛑 Stop Loss: ${this.currentPosition.stopLoss.toFixed(2)}`);
      console.log(`[BotExecutor] 🎯 Take Profit: ${this.currentPosition.takeProfit.toFixed(2)}`);

      // Lưu giao dịch vào database
      console.log(`[BotExecutor] 💾 Saving trade to database...`);
      await this.saveTrade({
        symbol: this.config.symbol,
        side: signal,
        type: 'market',
        quantity: quantity,
        entry_price: parseFloat(order.fills[0].price),
        stop_loss: this.currentPosition.stopLoss,
        take_profit: this.currentPosition.takeProfit,
        status: 'open',
        open_time: new Date().toISOString()
      });
      console.log(`[BotExecutor] ✅ Trade saved to database`);

      // Cập nhật thống kê
      console.log(`[BotExecutor] 📊 Updating bot statistics...`);
      await this.updateBotStats({
        total_trades: this.bot.total_trades + 1,
        total_profit: this.bot.total_profit,
        win_rate: this.bot.win_rate
      });
      console.log(`[BotExecutor] ✅ Bot statistics updated`);
      console.log(`[BotExecutor] 🎉 ${signal.toUpperCase()} trade completed successfully!`);

    } catch (error) {
      // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
      console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal} signal - Lỗi khi thực hiện giao dịch`);
      return;
    }
  }

  private async managePosition() {
    try {
      // Kiểm tra xem bot có đang chạy không
      if (!this.isRunning) {
        console.log('[BotExecutor] Bot is stopped, skipping position management');
        return;
      }

      if (!this.currentPosition) {
        console.log('[BotExecutor] No current position to manage');
        return;
      }

      // Lấy giá hiện tại
      const priceRes = await fetch(`${API_BASE_URL}/api/trading/binance/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!priceRes.ok) {
        throw new Error('Không thể lấy giá hiện tại');
      }

      const priceData = await priceRes.json();
      const currentPrice = parseFloat(priceData.price);

      let shouldClose = false;
      let profit = 0;

      if (this.currentPosition.side === 'buy') {
        if (currentPrice <= this.currentPosition.stopLoss) {
          shouldClose = true;
          profit = (currentPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity;
        } else if (currentPrice >= this.currentPosition.takeProfit) {
          shouldClose = true;
          profit = (currentPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity;
        }
      } else {
        if (currentPrice >= this.currentPosition.stopLoss) {
          shouldClose = true;
          profit = (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
        } else if (currentPrice <= this.currentPosition.takeProfit) {
          shouldClose = true;
          profit = (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
        }
      }

      if (shouldClose) {
        // Kiểm tra lại isRunning trước khi đóng vị thế
        if (!this.isRunning) {
          console.log('[BotExecutor] Bot was stopped before closing position');
          return;
        }

        // Đóng vị thế
        const orderRes = await fetch(`${API_BASE_URL}/api/trading/binance/order`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: this.config.symbol,
            side: this.currentPosition.side === 'buy' ? 'SELL' : 'BUY',
            type: 'MARKET',
            quantity: this.currentPosition.quantity.toFixed(6),
            apiKey: this.bot.config.account.apiKey,
            apiSecret: this.bot.config.account.apiSecret,
            isTestnet: this.bot.config.account.testnet,
          })
        });

        if (!orderRes.ok) {
          // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
          console.log(`[BotExecutor] ⏭️ Bỏ qua signal - Không thể đóng vị thế`);
          return;
        }

        const closeOrder = JSON.parse(await orderRes.text());
        const exitPrice = parseFloat(closeOrder.fills[0].price);

        // Cập nhật giao dịch đã đóng
        await this.updateLastTrade({
          exit_price: exitPrice,
          status: 'closed',
          close_time: new Date().toISOString(),
          pnl: profit
        });

        // Cập nhật thống kê
        const newTotalProfit = this.bot.total_profit + profit;
        const totalWins = profit > 0 ? this.bot.total_trades + 1 : this.bot.total_trades;
        const newWinRate = (totalWins / (this.bot.total_trades + 1)) * 100;

        await this.updateBotStats({
          total_trades: this.bot.total_trades,
          total_profit: newTotalProfit,
          win_rate: newWinRate
        });

        this.currentPosition = null;
      }
    } catch (error) {
      // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
      console.log(`[BotExecutor] ⏭️ Bỏ qua signal - Lỗi khi quản lý vị thế`);
      return;
    }
  }

  private async updateBotStatus(status: TradingBot['status']) {
    try {
      if (!this.bot.id) {
        console.error('Bot id is undefined, cannot update status');
        return;
      }
      console.log('Update bot status:', { id: this.bot.id, status });
      
      // Sử dụng supabaseAdmin để bypass RLS
      const { error } = await this.supabaseAdmin
        .from('trading_bots')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'running' ? { last_run_at: new Date().toISOString() } : {})
        })
        .eq('id', this.bot.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating bot status:', error);
    }
  }

  private async updateBotStats(stats: Pick<TradingBot, 'total_trades' | 'total_profit' | 'win_rate'>) {
    try {
      // Chỉ update các trường cơ bản để tránh lỗi schema
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Chỉ thêm các trường nếu chúng tồn tại
      if (stats.total_trades !== undefined) {
        updateData.total_trades = stats.total_trades;
      }
      if (stats.total_profit !== undefined) {
        updateData.total_profit = stats.total_profit;
      }
      if (stats.win_rate !== undefined) {
        updateData.win_rate = stats.win_rate;
      }
      
      const { error } = await this.supabaseAdmin
        .from('trading_bots')
        .update(updateData)
        .eq('id', this.bot.id);

      if (error) {
        console.error('Supabase update error:', error);
        // Nếu lỗi schema, chỉ update status
        await this.supabaseAdmin
          .from('trading_bots')
          .update({ 
            status: this.bot.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.bot.id);
        return;
      }

      // Cập nhật thông tin local
      this.bot = {
        ...this.bot,
        ...stats
      };
    } catch (error) {
      console.error('Error updating bot stats:', error);
    }
  }

  private async handleError(error: any) {
    try {
      await this.supabaseAdmin
        .from('trading_bots')
        .update({
          status: 'error',
          last_error: error.message || JSON.stringify(error),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.bot.id);
    } catch (dbError) {
      console.error('Error handling bot error:', dbError);
    }
  }

  private async saveTrade(tradeData: {
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    status: string;
    open_time: string;
  }) {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      console.log('[BotExecutor] Saving trade to database:', tradeData);
      
      const { data, error } = await this.supabaseAdmin
        .from('trades')
        .insert({
          bot_id: this.bot.id,
          ...tradeData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`[${this.bot.name}] ❌ Error saving trade:`, (error as Error).message);
      } else {
        console.log(`[${this.bot.name}] ✅ Trade saved: ${tradeData.side.toUpperCase()} ${tradeData.quantity} ${tradeData.symbol}`);
      }
    } catch (error) {
      console.error(`[${this.bot.name}] ❌ Error saving trade:`, (error as Error).message);
    }
  }

  private async updateLastTrade(updateData: {
    exit_price?: number;
    status: string;
    close_time?: string;
    pnl?: number;
  }) {
    try {
      console.log('[BotExecutor] Updating last trade:', updateData);
      
      // Tìm giao dịch mở cuối cùng của bot này
      const { data: lastTrade, error: fetchError } = await this.supabaseAdmin
        .from('trades')
        .select('*')
        .eq('bot_id', this.bot.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastTrade) {
        console.error('[BotExecutor] No open trade found to update:', fetchError);
        return;
      }

      // Cập nhật giao dịch
      const { error: updateError } = await this.supabaseAdmin
        .from('trades')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', lastTrade.id);

      if (updateError) {
        console.error(`[${this.bot.name}] ❌ Error updating trade:`, updateError.message);
      } else {
        console.log(`[${this.bot.name}] ✅ Trade closed: PnL $${(updateData.pnl || 0).toFixed(2)}`);
      }
    } catch (error) {
      console.error(`[${this.bot.name}] ❌ Error updating trade:`, (error as Error).message);
    }
  }

  private async checkRealPosition(): Promise<boolean> {
    try {
      // Lấy thông tin position từ Binance
      const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!balanceRes.ok) return false;
      
      const balanceData = await balanceRes.json();
      const btcBalance = parseFloat(balanceData.BTC || '0');
      
      console.log('[BotExecutor] BTC balance from Binance:', btcBalance);
      return btcBalance > 0.0001; // Có position nếu BTC > 0.0001
      
    } catch (error) {
      console.error('[BotExecutor] Error checking real position:', error);
      return false;
    }
  }

  // Thêm hàm log indicator
  private async logIndicator(indicator: string, value: number) {
    if (!this.bot?.id) return;
    try {
      console.log('[BotExecutor] Ghi log indicator:', indicator, value);
      await this.supabaseAdmin
        .from('bot_indicator_logs')
        .insert({
          bot_id: this.bot.id,
          indicator,
          value,
          time: new Date().toISOString()
        });
    } catch (err) {
      console.error('[BotExecutor] Lỗi ghi log indicator:', err);
    }
  }

  // Kiểm tra balance trước khi thực hiện signal để tránh lỗi liên tiếp
  private async checkBalanceForSignal(signal: 'buy' | 'sell'): Promise<boolean> {
    try {
      console.log(`[BotExecutor] 🔍 Kiểm tra balance cho ${signal.toUpperCase()} signal...`);
      
      // Lấy balance hiện tại từ Binance
      const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!balanceRes.ok) {
        // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
        console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal} signal - Không thể lấy balance`);
        return false;
      }

      const balanceData = await balanceRes.json();
      const positionSizePercent = this.bot.config.positionSize || 10;
      
      // Enhanced balance logging
      console.log(`[BotExecutor] 🔍 DEBUG: Balance data received:`, {
        rawData: balanceData,
        USDT: balanceData.USDT,
        BTC: balanceData.BTC,
        nonZeroBalances: balanceData.nonZeroBalances,
        positionSizePercent: positionSizePercent,
        timestamp: new Date().toISOString()
      });
      
      // Log chi tiết balance analysis
      console.log(`[BotExecutor] 💰 Balance Analysis:`, {
        step1: 'Raw balance data',
        usdtBalance: balanceData.USDT,
        btcBalance: balanceData.BTC,
        step2: 'Position detection',
        hasUSDT: parseFloat(balanceData.USDT || '0') > 0,
        hasBTC: parseFloat(balanceData.BTC || '0') > 0,
        step3: 'Trading capability',
        canBuy: parseFloat(balanceData.USDT || '0') >= 10, // Minimum 10 USDT
        canSell: parseFloat(balanceData.BTC || '0') >= 0.0001, // Minimum 0.0001 BTC
        step4: 'Decision factors',
        timestamp: new Date().toISOString()
      });
      
      if (signal === 'buy') {
        // Kiểm tra USDT balance cho BUY signal - SỬ DỤNG 100% BALANCE
        const usdtBalance = parseFloat(balanceData.USDT || '0');
        
        console.log(`[BotExecutor] 🔍 DEBUG: BUY signal balance check (100% USDT):`, {
          usdtBalance: usdtBalance,
          minimumNotional: 10
        });
        
        if (usdtBalance <= 0) {
          // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
          console.log(`[BotExecutor] ⏭️ Bỏ qua BUY signal - USDT balance = 0`);
          console.log(`[BotExecutor] 🔍 DEBUG: BUY signal rejected - insufficient USDT balance`);
          return false;
        }
        
        // Kiểm tra minimum notional (10 USDT) với 100% USDT balance
        if (usdtBalance < 10) {
          console.log(`[BotExecutor] ⏭️ Bỏ qua BUY signal - USDT balance (${usdtBalance.toFixed(2)}) < minimum notional (10 USDT)`);
          console.log(`[BotExecutor] ℹ️ Bot đã BUY toàn bộ balance, chờ signal tiếp theo`);
          console.log(`[BotExecutor] 🔍 DEBUG: BUY signal rejected - insufficient USDT for minimum notional`);
          return false;
        }
        
        console.log(`[BotExecutor] ✅ Có thể BUY - USDT balance: ${usdtBalance} (100% sẽ được sử dụng)`);
        console.log(`[BotExecutor] 🔍 DEBUG: BUY signal approved - sufficient USDT balance for 100%`);
        return true;
        
      } else {
        // Kiểm tra BTC balance cho SELL signal - SỬ DỤNG 100% BALANCE
        const btcBalance = parseFloat(balanceData.BTC || '0');
        
        console.log(`[BotExecutor] 🔍 DEBUG: SELL signal balance check (100% BTC):`, {
          btcBalance: btcBalance,
          minimumBtc: 0.0001
        });
        
        if (btcBalance <= 0) {
          // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
          console.log(`[BotExecutor] ⏭️ Bỏ qua SELL signal - BTC balance = 0`);
          console.log(`[BotExecutor] 🔍 DEBUG: SELL signal rejected - insufficient BTC balance`);
          console.log(`[BotExecutor] 🔍 DEBUG: Available balances:`, balanceData.nonZeroBalances || []);
          return false;
        }
        
        // Kiểm tra minimum notional (0.0001 BTC) với 100% BTC balance
        if (btcBalance < 0.0001) {
          console.log(`[BotExecutor] ⏭️ Bỏ qua SELL signal - BTC balance (${btcBalance.toFixed(6)}) < minimum (0.0001 BTC)`);
          console.log(`[BotExecutor] ℹ️ Bot đã SELL toàn bộ balance, chờ signal tiếp theo`);
          console.log(`[BotExecutor] 🔍 DEBUG: SELL signal rejected - insufficient BTC for minimum notional`);
          return false;
        }
        
        // Kiểm tra thêm: nếu BTC balance quá nhỏ để tạo order value >= 10 USDT
        try {
          const priceRes = await fetch(`${API_BASE_URL}/api/trading/binance/price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: this.config.symbol,
              apiKey: this.bot.config.account.apiKey,
              apiSecret: this.bot.config.account.apiSecret,
              isTestnet: this.bot.config.account.testnet,
            })
          });
          
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            const currentPrice = parseFloat(priceData.price);
            const orderValue = btcBalance * currentPrice; // 100% BTC balance
            const minNotional = 10; // Binance minimum 10 USDT
            
            console.log(`[BotExecutor] 🔍 DEBUG: Order value check (100% BTC):`, {
              btcBalance: btcBalance,
              currentPrice: currentPrice,
              orderValue: orderValue.toFixed(2),
              minNotional: minNotional,
              canSell: orderValue >= minNotional
            });
            
            // Nếu order value < 10 USDT, bỏ qua SELL signal
            if (orderValue < minNotional) {
              console.log(`[BotExecutor] ⏭️ Bỏ qua SELL signal - Order value (${orderValue.toFixed(2)} USDT) < minimum (${minNotional} USDT)`);
              console.log(`[BotExecutor] ℹ️ Bot đã SELL toàn bộ balance, chờ signal tiếp theo`);
              console.log(`[BotExecutor] 🔍 DEBUG: SELL signal rejected - BTC balance too small for minimum notional`);
              return false;
            }
          }
        } catch (error: any) {
          console.log(`[BotExecutor] 🔍 DEBUG: Cannot check price for order value validation:`, error.message);
        }
        
        console.log(`[BotExecutor] ✅ Có thể SELL - BTC balance: ${btcBalance} (100% sẽ được bán)`);
        console.log(`[BotExecutor] 🔍 DEBUG: SELL signal approved - sufficient BTC balance for 100%`);
        return true;
      }
      
    } catch (error) {
      // Bỏ qua một cách im lặng - không báo lỗi, chờ signal tiếp theo
      console.log(`[BotExecutor] ⏭️ Bỏ qua ${signal} signal - Lỗi khi kiểm tra balance`);
      return false; // Bỏ qua signal nếu có lỗi
    }
  }
} 