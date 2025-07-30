#!/usr/bin/env python3
"""
Test script để kiểm tra logic ưu tiên stoploss
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append('scripts')

from backtest_strategies.rsi_strategy import RSIStrategy

def create_test_data_with_stoploss():
    """Tạo dữ liệu test để trigger stoploss"""
    dates = pd.date_range('2024-01-01', periods=60, freq='1H')
    
    # Tạo giá với pattern: giảm -> tăng -> giảm mạnh (trigger stoploss) -> tăng (trigger sell signal)
    prices = []
    for i in range(60):
        if i < 25:
            prices.append(100 - i * 1.2)  # Giảm dần -> RSI thấp (trigger buy)
        elif i < 35:
            prices.append(70 + (i - 25) * 2)  # Tăng dần -> RSI cao (trigger sell)
        elif i < 45:
            prices.append(90 - (i - 35) * 4)  # Giảm mạnh -> trigger stoploss
        else:
            prices.append(50 + (i - 45) * 2)  # Tăng lại -> RSI cao
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + 0.5 for p in prices],
        'low': [p - 0.5 for p in prices],
        'close': prices,
        'volume': [1000] * 60
    }, index=dates)
    
    return data

def test_stoploss_priority():
    """Test logic ưu tiên stoploss"""
    print("=== Testing Stoploss Priority ===")
    
    data = create_test_data_with_stoploss()
    
    # Test 1: Không ưu tiên stoploss (logic cũ)
    print("\n--- Test 1: Không ưu tiên stoploss ---")
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
            'prioritizeStoploss': False  # Không ưu tiên stoploss
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
    
    # Test 2: Ưu tiên stoploss
    print("\n--- Test 2: Ưu tiên stoploss ---")
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
            'prioritizeStoploss': True  # Ưu tiên stoploss
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
    test_stoploss_priority() 