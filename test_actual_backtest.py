#!/usr/bin/env python3
"""
Test script để kiểm tra logic backtest với dữ liệu thực tế
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts'))

from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy

def create_actual_data():
    """Tạo dữ liệu thực tế với nhiều crossover"""
    dates = pd.date_range('2024-01-01', periods=100, freq='1H')
    
    # Tạo giá với nhiều trend changes để tạo nhiều crossover
    prices = []
    for i in range(100):
        if i < 20:
            prices.append(100 + i * 0.5)  # Trend tăng
        elif i < 40:
            prices.append(110 - (i - 20) * 1.0)  # Trend giảm mạnh
        elif i < 60:
            prices.append(90 + (i - 40) * 0.8)  # Trend tăng
        elif i < 80:
            prices.append(106 - (i - 60) * 0.6)  # Trend giảm
        else:
            prices.append(94 + (i - 80) * 0.4)  # Trend tăng nhẹ
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + np.random.uniform(0, 0.5) for p in prices],
        'low': [p - np.random.uniform(0, 0.5) for p in prices],
        'close': prices,
        'volume': np.random.uniform(1000, 5000, 100)
    }, index=dates)
    
    return data

def test_actual_backtest():
    """Test với dữ liệu thực tế"""
    print("=== Testing Actual Backtest Logic ===")
    
    data = create_actual_data()
    
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
            'stopLoss': 10,  # Tăng lên để không trigger
            'takeProfit': 20  # Tăng lên để không trigger
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
    
    # Show signal details
    print(f"\n=== SIGNAL DETAILS ===")
    for idx, row in buy_signals.iterrows():
        print(f"BUY: {idx} - Price={row['close']:.2f}, Fast MA={row['fast_ma']:.2f}, Slow MA={row['slow_ma']:.2f}")
    
    for idx, row in sell_signals.iterrows():
        print(f"SELL: {idx} - Price={row['close']:.2f}, Fast MA={row['fast_ma']:.2f}, Slow MA={row['slow_ma']:.2f}")
    
    # Test backtest
    result = strategy.run_backtest(data)
    
    print(f"\n=== BACKTEST RESULTS ===")
    print(f"Total trades: {result['performance']['total_trades']}")
    print(f"Win rate: {result['performance']['win_rate']:.2f}%")
    print(f"Total return: {result['performance']['total_return']:.2f}%")
    
    # Show trades details
    if result['trades']:
        print(f"\n=== TRADES DETAILS ===")
        for i, trade in enumerate(result['trades']):
            duration = trade['exit_time'] - trade['entry_time']
            print(f"Trade {i+1}:")
            print(f"  Entry: {trade['entry_time']} at {trade['entry_price']:.2f}")
            print(f"  Exit: {trade['exit_time']} at {trade['exit_price']:.2f}")
            print(f"  Duration: {duration}")
            print(f"  Reason: {trade['exit_reason']}")
            print(f"  P&L: {trade['pnl']:.2f}")
            print()
    else:
        print("No trades executed!")
    
    return result

if __name__ == "__main__":
    print("Testing actual backtest logic...")
    print("=" * 50)
    
    result = test_actual_backtest()
    
    print("=" * 50)
    print("Test completed!") 