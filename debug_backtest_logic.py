#!/usr/bin/env python3
"""
Debug script để kiểm tra logic backtest hiện tại
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts'))

from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy

def create_debug_data():
    """Tạo dữ liệu debug với trend rõ ràng"""
    dates = pd.date_range('2024-01-01', periods=20, freq='1H')
    
    # Tạo giá với trend tăng rõ ràng
    prices = []
    for i in range(20):
        if i < 10:
            prices.append(100 + i * 1)  # Trend tăng mạnh
        else:
            prices.append(110 - (i - 10) * 0.5)  # Trend giảm nhẹ
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + 0.5 for p in prices],
        'low': [p - 0.5 for p in prices],
        'close': prices,
        'volume': [1000] * 20
    }, index=dates)
    
    return data

def debug_ma_crossover():
    """Debug MA Crossover logic"""
    print("=== DEBUG MA Crossover Logic ===")
    
    data = create_debug_data()
    print(f"Data shape: {data.shape}")
    print(f"Price range: {data['close'].min():.2f} - {data['close'].max():.2f}")
    
    config = {
        'strategy': {
            'parameters': {
                'fastPeriod': 3,
                'slowPeriod': 5
            }
        },
        'trading': {
            'initialCapital': 10000,
            'positionSize': 1
        },
        'riskManagement': {
            'stopLoss': 5,  # Tăng lên để không trigger
            'takeProfit': 10  # Tăng lên để không trigger
        }
    }
    
    strategy = MACrossoverStrategy(config)
    
    # Debug signals
    signals = strategy.generate_signals(data)
    print(f"\n=== SIGNALS DEBUG ===")
    print(f"Signal distribution:")
    print(signals['signal'].value_counts())
    
    # Show signal details
    buy_signals = signals[signals['signal'] == 1]
    sell_signals = signals[signals['signal'] == -1]
    
    print(f"\nBuy signals ({len(buy_signals)}):")
    for idx, row in buy_signals.iterrows():
        print(f"  {idx}: Price={row['close']:.2f}, Fast MA={row['fast_ma']:.2f}, Slow MA={row['slow_ma']:.2f}")
    
    print(f"\nSell signals ({len(sell_signals)}):")
    for idx, row in sell_signals.iterrows():
        print(f"  {idx}: Price={row['close']:.2f}, Fast MA={row['fast_ma']:.2f}, Slow MA={row['slow_ma']:.2f}")
    
    # Debug backtest
    print(f"\n=== BACKTEST DEBUG ===")
    result = strategy.run_backtest(data)
    
    print(f"Total trades: {result['performance']['total_trades']}")
    print(f"Win rate: {result['performance']['win_rate']:.2f}%")
    print(f"Total return: {result['performance']['total_return']:.2f}%")
    
    # Show trades details
    if result['trades']:
        print(f"\n=== TRADES DETAILS ===")
        for i, trade in enumerate(result['trades']):
            print(f"Trade {i+1}:")
            print(f"  Entry: {trade['entry_time']} at {trade['entry_price']:.2f}")
            print(f"  Exit: {trade['exit_time']} at {trade['exit_price']:.2f}")
            print(f"  Duration: {trade['exit_time'] - trade['entry_time']}")
            print(f"  Reason: {trade['exit_reason']}")
            print(f"  P&L: {trade['pnl']:.2f}")
            print()
    else:
        print("No trades executed!")
    
    return result

if __name__ == "__main__":
    print("Debugging backtest logic...")
    print("=" * 50)
    
    result = debug_ma_crossover()
    
    print("=" * 50)
    print("Debug completed!") 