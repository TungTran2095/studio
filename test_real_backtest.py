#!/usr/bin/env python3
"""
Test script với dữ liệu thực tế hơn
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts'))

from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy

def create_realistic_data():
    """Tạo dữ liệu thực tế hơn với nhiều crossover"""
    dates = pd.date_range('2024-01-01', periods=50, freq='1H')
    
    # Tạo giá với nhiều trend changes
    prices = []
    for i in range(50):
        if i < 15:
            prices.append(100 + i * 0.8)  # Trend tăng
        elif i < 25:
            prices.append(112 - (i - 15) * 1.2)  # Trend giảm mạnh
        elif i < 35:
            prices.append(100 + (i - 25) * 0.6)  # Trend tăng nhẹ
        else:
            prices.append(106 - (i - 35) * 0.8)  # Trend giảm
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + np.random.uniform(0, 1) for p in prices],
        'low': [p - np.random.uniform(0, 1) for p in prices],
        'close': prices,
        'volume': np.random.uniform(1000, 5000, 50)
    }, index=dates)
    
    return data

def test_realistic_backtest():
    """Test với dữ liệu thực tế"""
    print("=== Testing Realistic Backtest ===")
    
    data = create_realistic_data()
    
    config = {
        'strategy': {
            'parameters': {
                'fastPeriod': 5,
                'slowPeriod': 10
            }
        },
        'trading': {
            'initialCapital': 10000,
            'positionSize': 1
        },
        'riskManagement': {
            'stopLoss': 5,
            'takeProfit': 10
        }
    }
    
    strategy = MACrossoverStrategy(config)
    
    # Test signals
    signals = strategy.generate_signals(data)
    buy_signals = signals[signals['signal'] == 1]
    sell_signals = signals[signals['signal'] == -1]
    
    print(f"Data points: {len(data)}")
    print(f"Buy signals: {len(buy_signals)}")
    print(f"Sell signals: {len(sell_signals)}")
    print(f"Signal distribution:")
    print(signals['signal'].value_counts())
    
    # Show MA values
    print(f"\n=== MA Values ===")
    for i in range(10, 20):
        row = signals.iloc[i]
        print(f"Time {i}: Price={row['close']:.2f}, Fast MA={row['fast_ma']:.2f}, Slow MA={row['slow_ma']:.2f}, Signal={row['signal']}")
    
    # Test backtest
    result = strategy.run_backtest(data)
    
    print(f"\n=== BACKTEST RESULTS ===")
    print(f"Total trades: {result['performance']['total_trades']}")
    print(f"Win rate: {result['performance']['win_rate']:.2f}%")
    print(f"Total return: {result['performance']['total_return']:.2f}%")
    
    # Show trades
    if result['trades']:
        print(f"\n=== TRADES ===")
        for i, trade in enumerate(result['trades']):
            duration = trade['exit_time'] - trade['entry_time']
            print(f"Trade {i+1}: {trade['exit_reason']} - Entry: {trade['entry_time']} at {trade['entry_price']:.2f}, Exit: {trade['exit_time']} at {trade['exit_price']:.2f}, Duration: {duration}, P&L: {trade['pnl']:.2f}")
    else:
        print("No trades executed!")
    
    return result

if __name__ == "__main__":
    print("Testing realistic backtest...")
    print("=" * 50)
    
    result = test_realistic_backtest()
    
    print("\n" + "=" * 50)
    print("Test completed!") 