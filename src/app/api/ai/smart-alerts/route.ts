import { NextRequest, NextResponse } from 'next/server';
import { smartAlertSystem } from '@/ai/alerts/smart-alerts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const action = searchParams.get('action') || 'detect_anomalies';
    const userId = searchParams.get('userId') || 'default';
    const metrics = searchParams.get('metrics')?.split(',') || ['price', 'volume', 'sentiment'];

    console.log(`🔍 [API] Smart alerts request: ${action} for ${symbol || 'multiple symbols'}`);

    switch (action) {
      case 'detect_anomalies':
        if (!symbol) {
          return NextResponse.json({
            success: false,
            error: 'Symbol parameter is required for anomaly detection'
          }, { status: 400 });
        }

        const anomaly = await smartAlertSystem.detectAnomalies(symbol, metrics);
        return NextResponse.json({
          success: true,
          data: anomaly,
          timestamp: new Date().toISOString()
        });

      case 'get_alerts':
        const type = searchParams.get('type') as any;
        const severity = searchParams.get('severity') as any;
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const alerts = smartAlertSystem.getAlerts(userId, {
          type,
          severity,
          unreadOnly
        });

        return NextResponse.json({
          success: true,
          data: alerts,
          count: alerts.length,
          timestamp: new Date().toISOString()
        });

      case 'mark_read':
        const alertId = searchParams.get('alertId');
        if (!alertId) {
          return NextResponse.json({
            success: false,
            error: 'Alert ID is required'
          }, { status: 400 });
        }

        const marked = smartAlertSystem.markAsRead(alertId);
        return NextResponse.json({
          success: marked,
          message: marked ? 'Alert marked as read' : 'Alert not found'
        });

      case 'clear_cache':
        smartAlertSystem.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: detect_anomalies, get_alerts, mark_read, clear_cache'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [API] Smart alerts error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log(`🔍 [API] Smart alerts POST request: ${action}`);

    switch (action) {
      case 'batch_detect_anomalies':
        const { symbols, metrics = ['price', 'volume', 'sentiment'] } = params;
        
        if (!symbols || !Array.isArray(symbols)) {
          return NextResponse.json({
            success: false,
            error: 'Symbols array is required'
          }, { status: 400 });
        }

        const results = await Promise.all(
          symbols.map(async (symbol: string) => {
            try {
              const anomaly = await smartAlertSystem.detectAnomalies(symbol, metrics);
              return { symbol, anomaly, success: true };
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

      case 'optimize_thresholds':
        const { userId, tradingStyle } = params;
        
        if (!userId || !tradingStyle) {
          return NextResponse.json({
            success: false,
            error: 'userId and tradingStyle are required'
          }, { status: 400 });
        }

        const thresholds = await smartAlertSystem.optimizeAlertThresholds(userId, tradingStyle);
        return NextResponse.json({
          success: true,
          data: thresholds,
          timestamp: new Date().toISOString()
        });

      case 'start_monitoring':
        const { symbols: monitorSymbols, intervalMs = 60000 } = params;
        
        if (!monitorSymbols || !Array.isArray(monitorSymbols)) {
          return NextResponse.json({
            success: false,
            error: 'Symbols array is required'
          }, { status: 400 });
        }

        // Start monitoring in background
        smartAlertSystem.startAnomalyMonitoring(monitorSymbols, intervalMs);
        
        return NextResponse.json({
          success: true,
          message: `Started monitoring ${monitorSymbols.length} symbols`,
          data: {
            symbols: monitorSymbols,
            intervalMs
          }
        });

      case 'create_test_alert':
        const { symbol, anomalyType = 'price_spike', anomalyScore = 0.8 } = params;
        
        if (!symbol) {
          return NextResponse.json({
            success: false,
            error: 'Symbol is required'
          }, { status: 400 });
        }

        // Create test anomaly
        const testAnomaly = {
          isAnomaly: true,
          anomalyScore,
          anomalyType,
          confidence: 0.9,
          description: `Test anomaly for ${symbol}`,
          historicalContext: {
            similarEvents: 5,
            averageImpact: 10,
            recoveryTime: '2-3 days'
          }
        };

        const alert = await smartAlertSystem.createAnomalyAlert(symbol, testAnomaly);
        
        return NextResponse.json({
          success: true,
          data: alert,
          message: 'Test alert created successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: batch_detect_anomalies, optimize_thresholds, start_monitoring, create_test_alert'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [API] Smart alerts POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 