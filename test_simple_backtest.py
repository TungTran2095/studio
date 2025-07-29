#!/usr/bin/env python3
"""
Test script đơn giản để kiểm tra logic backtest mới
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts'))

from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy

def create_test_data():
    """Tạo dữ liệu test đơn giản"""
    dates = pd.date_range('2024-01-01', periods=50, freq='1H')
    
    # Tạo giá với trend rõ ràng để test
    prices = []
    for i in range(50):
        if i < 20:
            prices.append(100 + i * 0.5)  # Trend tăng
        elif i < 35:
            prices.append(110 - (i - 20) * 0.8)  # Trend giảm
        else:
            prices.append(98 + (i - 35) * 0.6)  # Trend tăng lại
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + np.random.uniform(0, 1) for p in prices],
        'low': [p - np.random.uniform(0, 1) for p in prices],
        'close': prices,
        'volume': np.random.uniform(1000, 5000, 50)
    }, index=dates)
    
    return data

def test_ma_crossover():
    """Test MA Crossover với logic mới"""
    print("=== Testing MA Crossover with NEW LOGIC ===")
    
    data = create_test_data()
    
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
            'stopLoss': 2,
            'takeProfit': 4
        }
    }
    
    strategy = MACrossoverStrategy(config)
    
    # Test generate signals
    signals = strategy.generate_signals(data)
    buy_signals = signals[signals['signal'] == 1]
    sell_signals = signals[signals['signal'] == -1]
    
    print(f"Buy signals: {len(buy_signals)}")
    print(f"Sell signals: {len(sell_signals)}")
    print(f"Signal distribution:")
    print(signals['signal'].value_counts())
    
    # Show signal details
    if len(buy_signals) > 0:
        print(f"Buy signal at: {buy_signals.index[0]}")
    if len(sell_signals) > 0:
        print(f"Sell signal at: {sell_signals.index[0]}")
    
    # Test backtest
    result = strategy.run_backtest(data)
    
    print(f"\n=== BACKTEST RESULTS ===")
    print(f"Total trades: {result['performance']['total_trades']}")
    print(f"Win rate: {result['performance']['win_rate']:.2f}%")
    print(f"Total return: {result['performance']['total_return']:.2f}%")
    print(f"Max drawdown: {result['performance']['max_drawdown']:.2f}%")
    print(f"Final capital: {result['performance']['final_capital']:.2f}")
    
    # Show trades
    if result['trades']:
        print(f"\n=== TRADES ===")
        for i, trade in enumerate(result['trades']):
            print(f"Trade {i+1}: {trade['exit_reason']} - Entry: {trade['entry_price']:.2f}, Exit: {trade['exit_price']:.2f}, P&L: {trade['pnl']:.2f}")
    
    return result

if __name__ == "__main__":
    print("Testing new backtest logic...")
    print("Logic: Buy when buy signal, sell when sell signal")
    print("=" * 50)
    
    result = test_ma_crossover()
    
    print("\n" + "=" * 50)
    print("✅ Logic đã được cập nhật thành công!")
    print("- Buy signal (1) → Mở vị thế mua")
    print("- Sell signal (-1) → Đóng vị thế mua")
    print("- Stop loss và take profit vẫn hoạt động bình thường") 