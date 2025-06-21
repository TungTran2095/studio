import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

# Import các strategy classes
from backtest_strategies.rsi_strategy import RSIStrategy
from backtest_strategies.macd_strategy import MACDStrategy
from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy
from backtest_strategies.bollinger_bands_strategy import BollingerBandsStrategy

def convert_datetime(obj):
    """Convert various data types to JSON serializable format"""
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        # Xử lý NaN values
        if pd.isna(obj) or np.isnan(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        # Xử lý numpy arrays với NaN values
        return [None if pd.isna(x) or np.isnan(x) else float(x) for x in obj.tolist()]
    if isinstance(obj, pd.Series):
        # Xử lý pandas Series với NaN values
        return [None if pd.isna(x) or np.isnan(x) else float(x) for x in obj.tolist()]
    if isinstance(obj, dict):
        # Xử lý nested dictionaries
        return {k: convert_datetime(v) for k, v in obj.items()}
    if isinstance(obj, list):
        # Xử lý lists
        return [convert_datetime(item) for item in obj]
    if isinstance(obj, (str, int, bool, type(None))):
        # Các kiểu dữ liệu cơ bản đã JSON serializable
        return obj
    # Xử lý các kiểu numpy khác
    if hasattr(obj, 'item'):
        try:
            return obj.item()
        except:
            pass
    # Nếu không xử lý được, chuyển thành string
    return str(obj)

def create_sample_data():
    """Tạo dữ liệu mẫu cho testing"""
    dates = pd.date_range('2023-01-01', '2023-01-31', freq='1H')
    np.random.seed(42)
    
    # Tạo giá mẫu với xu hướng tăng
    base_price = 45000
    prices = []
    for i in range(len(dates)):
        # Thêm noise và trend
        price = base_price + i * 10 + np.random.normal(0, 100)
        prices.append(max(price, 1000))  # Đảm bảo giá > 0
    
    df = pd.DataFrame({
        'open': prices,
        'high': [p * (1 + np.random.uniform(0, 0.02)) for p in prices],
        'low': [p * (1 - np.random.uniform(0, 0.02)) for p in prices],
        'close': prices,
        'volume': np.random.uniform(1000, 10000, len(dates))
    }, index=dates)
    
    return df

def test_strategy(strategy_type, config, data):
    """Test một strategy cụ thể"""
    print(f"\n=== Testing {strategy_type.upper()} Strategy ===")
    
    # Strategy mapping
    strategy_map = {
        'rsi': RSIStrategy,
        'macd': MACDStrategy,
        'ma_crossover': MACrossoverStrategy,
        'bollinger_bands': BollingerBandsStrategy
    }
    
    StrategyClass = strategy_map[strategy_type]
    strategy = StrategyClass(config)
    
    # Chạy backtest
    results = strategy.run_backtest(data)
    
    # Lấy dữ liệu indicator
    signals_data = strategy.generate_signals(data)
    
    # Chuẩn bị dữ liệu indicator
    indicators_data = {
        'timestamps': (signals_data.index.astype(np.int64) // 10**6).tolist(),
        'close_prices': [convert_datetime(x) for x in signals_data['close'].tolist()],
        'indicators': {}
    }
    
    # Thêm indicators tùy theo strategy
    if strategy_type == 'rsi':
        indicators_data['indicators']['rsi'] = [convert_datetime(x) for x in signals_data['rsi'].tolist()]
    elif strategy_type == 'macd':
        indicators_data['indicators']['macd'] = [convert_datetime(x) for x in signals_data['macd'].tolist()]
        indicators_data['indicators']['signal'] = [convert_datetime(x) for x in signals_data['signal'].tolist()]
        indicators_data['indicators']['histogram'] = [convert_datetime(x) for x in signals_data['histogram'].tolist()]
    elif strategy_type == 'ma_crossover':
        indicators_data['indicators']['fast_ma'] = [convert_datetime(x) for x in signals_data['fast_ma'].tolist()]
        indicators_data['indicators']['slow_ma'] = [convert_datetime(x) for x in signals_data['slow_ma'].tolist()]
    elif strategy_type == 'bollinger_bands':
        indicators_data['indicators']['upper'] = [convert_datetime(x) for x in signals_data['upper'].tolist()]
        indicators_data['indicators']['middle'] = [convert_datetime(x) for x in signals_data['middle'].tolist()]
        indicators_data['indicators']['lower'] = [convert_datetime(x) for x in signals_data['lower'].tolist()]
    
    # Test JSON serialization
    try:
        trades_json = json.dumps({"trades": results.get("trades", [])}, default=convert_datetime)
        performance_json = json.dumps(results.get("performance", {}), default=convert_datetime)
        indicators_json = json.dumps({"indicators": indicators_data}, default=convert_datetime)
        
        print(f"✓ {strategy_type} - JSON serialization successful")
        print(f"  Trades count: {len(results.get('trades', []))}")
        print(f"  Performance keys: {list(results.get('performance', {}).keys())}")
        print(f"  Indicators keys: {list(indicators_data['indicators'].keys())}")
        
        return True
    except Exception as e:
        print(f"✗ {strategy_type} - JSON serialization failed: {e}")
        return False

def main():
    print("Testing backtest strategies with JSON serialization...")
    
    # Tạo dữ liệu mẫu
    data = create_sample_data()
    print(f"Created sample data: {len(data)} records")
    
    # Config cho các strategies
    config = {
        'trading': {
            'symbol': 'BTCUSDT',
            'timeframe': '1h',
            'initialCapital': 10000,
            'positionSize': 1
        },
        'strategy': {
            'type': 'rsi',
            'parameters': {
                'period': 14,
                'overbought': 70,
                'oversold': 30
            }
        },
        'riskManagement': {
            'stopLoss': 2,
            'takeProfit': 4,
            'maxPositions': 1,
            'maxDrawdown': 10,
            'trailingStop': True,
            'trailingStopDistance': 1
        }
    }
    
    # Test các strategies
    strategies = ['rsi', 'macd', 'ma_crossover', 'bollinger_bands']
    success_count = 0
    
    for strategy_type in strategies:
        config['strategy']['type'] = strategy_type
        if test_strategy(strategy_type, config, data):
            success_count += 1
    
    print(f"\n=== Results ===")
    print(f"Successful: {success_count}/{len(strategies)} strategies")
    
    if success_count == len(strategies):
        print("✅ All strategies passed JSON serialization test!")
    else:
        print("❌ Some strategies failed JSON serialization test!")

if __name__ == '__main__':
    main() 