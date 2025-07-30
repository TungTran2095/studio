#!/usr/bin/env python3
"""
Test script để kiểm tra logic bật/tắt take profit
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append('scripts')

from backtest_strategies.rsi_strategy import RSIStrategy

def create_test_data_with_take_profit():
    """Tạo dữ liệu test để trigger take profit"""
    dates = pd.date_range('2024-01-01', periods=80, freq='1H')
    
    # Tạo giá với pattern: giảm -> tăng mạnh (trigger take profit) -> giảm (trigger sell signal)
    prices = []
    for i in range(80):
        if i < 30:
            prices.append(100 - i * 1.5)  # Giảm dần -> RSI thấp (trigger buy)
        elif i < 45:
            prices.append(55 + (i - 30) * 3)  # Tăng mạnh -> trigger take profit
        elif i < 60:
            prices.append(100 - (i - 45) * 2)  # Giảm -> RSI cao (trigger sell signal)
        else:
            prices.append(70 + (i - 60) * 1)  # Tăng lại
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + 0.5 for p in prices],
        'low': [p - 0.5 for p in prices],
        'close': prices,
        'volume': [1000] * 80
    }, index=dates)
    
    return data

def test_take_profit_toggle():
    """Test logic bật/tắt take profit"""
    print("=== Testing Take Profit Toggle ===")
    
    data = create_test_data_with_take_profit()
    
    # Test 1: Ưu tiên stoploss + KHÔNG dùng take profit
    print("\n--- Test 1: Ưu tiên stoploss + KHÔNG dùng take profit ---")
    config1 = {
        'strategy': {
            'parameters': {
                'period': 14,
                'overbought': 70,
                'oversold': 30
            }
        },
        'trading': {
            'symbol': 'BTCUSDT',
            'timeframe': '1h',
            'initialCapital': 10000,
            'positionSize': 1
        },
        'riskManagement': {
            'stopLoss': 5,  # 5% stoploss
            'takeProfit': 10,  # 10% take profit
            'maxPositions': 1,
            'prioritizeStoploss': True,  # Ưu tiên stoploss
            'useTakeProfit': False  # KHÔNG dùng take profit
        }
    }
    
    strategy1 = RSIStrategy(config1)
    
    # Generate signals and show debug info
    signals1 = strategy1.generate_signals(data)
    buy_signals1 = signals1[signals1['signal'] == 1]
    sell_signals1 = signals1[signals1['signal'] == -1]
    
    print(f"Buy signals: {len(buy_signals1)}")
    print(f"Sell signals: {len(sell_signals1)}")
    
    if len(buy_signals1) > 0:
        print("Buy signals:")
        for idx in buy_signals1.index:
            rsi_val = buy_signals1.loc[idx, 'rsi']
            price = buy_signals1.loc[idx, 'close']
            print(f"  {idx}: RSI = {rsi_val:.2f}, Price = {price:.2f}")
    
    if len(sell_signals1) > 0:
        print("Sell signals:")
        for idx in sell_signals1.index:
            rsi_val = sell_signals1.loc[idx, 'rsi']
            price = sell_signals1.loc[idx, 'close']
            print(f"  {idx}: RSI = {rsi_val:.2f}, Price = {price:.2f}")
    
    result1 = strategy1.run_backtest(data)
    
    print(f"Total trades: {result1['performance']['total_trades']}")
    if result1['trades']:
        for i, trade in enumerate(result1['trades']):
            print(f"Trade {i+1}: {trade['exit_reason']} - Entry: {trade['entry_price']:.2f}, Exit: {trade['exit_price']:.2f}, P&L: {trade['pnl']:.2f}")
    
    # Test 2: Ưu tiên stoploss + DÙNG take profit
    print("\n--- Test 2: Ưu tiên stoploss + DÙNG take profit ---")
    config2 = {
        'strategy': {
            'parameters': {
                'period': 14,
                'overbought': 70,
                'oversold': 30
            }
        },
        'trading': {
            'symbol': 'BTCUSDT',
            'timeframe': '1h',
            'initialCapital': 10000,
            'positionSize': 1
        },
        'riskManagement': {
            'stopLoss': 5,  # 5% stoploss
            'takeProfit': 10,  # 10% take profit
            'maxPositions': 1,
            'prioritizeStoploss': True,  # Ưu tiên stoploss
            'useTakeProfit': True  # DÙNG take profit
        }
    }
    
    strategy2 = RSIStrategy(config2)
    result2 = strategy2.run_backtest(data)
    
    print(f"Total trades: {result2['performance']['total_trades']}")
    if result2['trades']:
        for i, trade in enumerate(result2['trades']):
            print(f"Trade {i+1}: {trade['exit_reason']} - Entry: {trade['entry_price']:.2f}, Exit: {trade['exit_price']:.2f}, P&L: {trade['pnl']:.2f}")
    
    return result1, result2

if __name__ == "__main__":
    test_take_profit_toggle() 