import sys
import os
import json
import pandas as pd
import numpy as np

# Add scripts directory to path
sys.path.append('scripts')

from backtest_strategies.rsi_strategy import RSIStrategy

# Tạo dữ liệu mẫu với NaN values
def create_sample_data_with_nan():
    dates = pd.date_range('2024-01-01', periods=20, freq='1H')
    
    # Tạo giá với một số giá trị NaN
    prices = [100, 101, np.nan, 103, 104, 105, np.nan, 107, 108, 109, 
              110, 111, 112, 113, 114, 115, 116, 117, 118, 119]
    
    df = pd.DataFrame({
        'open': prices,
        'high': [p * 1.01 if not pd.isna(p) else np.nan for p in prices],
        'low': [p * 0.99 if not pd.isna(p) else np.nan for p in prices],
        'close': prices,
        'volume': np.random.randint(1000, 10000, 20)
    }, index=dates)
    
    return df

def convert_datetime(obj):
    if isinstance(obj, (pd.Timestamp, np.datetime64)):
        return obj.isoformat()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
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
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

def test_nan_handling():
    print("=== Testing NaN Handling ===")
    data = create_sample_data_with_nan()
    
    config = {
        'strategy': {
            'type': 'rsi',
            'parameters': {
                'period': 14,
                'overbought': 70,
                'oversold': 30
            }
        }
    }
    
    strategy = RSIStrategy(config)
    signals = strategy.generate_signals(data)
    
    print(f"Original RSI values: {signals['rsi'].tolist()}")
    print(f"Contains NaN: {signals['rsi'].isna().any()}")
    
    # Chuẩn bị dữ liệu indicator cho chart
    indicators_data = {
        'timestamps': (signals.index.astype(np.int64) // 10**6).tolist(),
        'close_prices': [convert_datetime(x) for x in signals['close'].tolist()],
        'indicators': {
            'rsi': [convert_datetime(x) for x in signals['rsi'].tolist()]
        }
    }
    
    print(f"Processed RSI values: {indicators_data['indicators']['rsi']}")
    print(f"Contains None: {None in indicators_data['indicators']['rsi']}")
    
    # Test JSON serialization
    try:
        json_str = json.dumps(indicators_data, indent=2)
        print("✅ JSON serialization successful!")
        print(f"JSON length: {len(json_str)} characters")
        print(f"Sample JSON: {json_str[:200]}...")
    except Exception as e:
        print(f"❌ JSON serialization failed: {e}")
    
    return indicators_data

if __name__ == "__main__":
    test_nan_handling()
    print("\n=== Test completed ===") 