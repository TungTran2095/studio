-- Cập nhật HOÀN TOÀN cấu hình bot Tester01 cho đúng với backtest RSI
-- Bot ID: db46a0b1-4efc-4751-92cf-e0c5c8def465
-- Backtest config: RSI 1m, overbought 60, oversold 50

-- 1. Xem cấu hình hiện tại
SELECT 
    id,
    name,
    status,
    config,
    created_at,
    updated_at
FROM trading_bots 
WHERE id = 'db46a0b1-4efc-4751-92cf-e0c5c8def465';

-- 2. Cập nhật HOÀN TOÀN cấu hình bot
UPDATE trading_bots 
SET 
    name = 'Tester01',
    config = '{
        "name": "Tester01",
        "type": "rsi_strategy",
        "config": {
            "trading": {
                "symbol": "BTCUSDT",
                "maker_fee": 0.1,
                "taker_fee": 0.1,
                "timeframe": "1m",
                "positionSize": 10,
                "initialCapital": 10000
            },
            "strategy": {
                "type": "rsi_strategy",
                "parameters": {
                    "period": 14,
                    "overbought": 60,
                    "oversold": 50
                }
            },
            "riskManagement": {
                "stopLoss": 2,
                "takeProfit": 4,
                "maxDrawdown": 10,
                "maxPositions": 1,
                "trailingStop": true,
                "useTakeProfit": true,
                "prioritizeStoploss": true,
                "trailingStopDistance": 1
            }
        },
        "account": {
            "apiKey": "i4rthsqeFN9A9jrRPk2oyy1yIxJAVf7t2LDFN10IpXuLVzlRKkvS3DCVtS7RcQVX",
            "testnet": true,
            "apiSecret": "SxZYti5Llva2sl8bGtM1x2rtW3DCpQkek1R8RBWkmtQ2MJQbsocPIYA5gdzHO6zT"
        }
    }'::jsonb,
    updated_at = NOW()
WHERE id = 'db46a0b1-4efc-4751-92cf-e0c5c8def465';

-- 3. Xác minh cập nhật
SELECT 
    id,
    name,
    status,
    config->>'name' as config_name,
    config->>'type' as config_type,
    config->'config'->'trading'->>'timeframe' as timeframe,
    config->'config'->'trading'->>'positionSize' as position_size,
    config->'config'->'strategy'->>'type' as strategy_type,
    config->'config'->'strategy'->'parameters'->>'period' as rsi_period,
    config->'config'->'strategy'->'parameters'->>'overbought' as rsi_overbought,
    config->'config'->'strategy'->'parameters'->>'oversold' as rsi_oversold,
    updated_at
FROM trading_bots 
WHERE id = 'db46a0b1-4efc-4751-92cf-e0c5c8def465';

-- 4. Hiển thị toàn bộ config mới
SELECT 
    name,
    config
FROM trading_bots 
WHERE id = 'db46a0b1-4efc-4751-92cf-e0c5c8def465';

-- 5. Kiểm tra bot có đang chạy không
SELECT 
    name,
    status,
    last_run_at,
    total_trades,
    total_profit,
    win_rate
FROM trading_bots 
WHERE id = 'db46a0b1-4efc-4751-92cf-e0c5c8def465';



