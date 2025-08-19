#!/usr/bin/env python3
"""
Test script để kiểm tra logic Monte Carlo mới
"""

import numpy as np
import pandas as pd

def test_monte_carlo_logic():
    """Test logic Monte Carlo mới"""
    print("Testing Monte Carlo Logic...")
    
    # Test parameters
    initial_capital = 10000
    total_trades = 100
    win_rate = 65  # 65%
    avg_win_net = 2.0  # 2% lãi trên giá trị giao dịch
    avg_loss_net = -1.5  # -1.5% lỗ trên giá trị giao dịch
    position_size = 0.1  # 10% vốn mỗi trade
    
    print(f"Initial Capital: ${initial_capital:,.2f}")
    print(f"Total Trades: {total_trades}")
    print(f"Win Rate: {win_rate}%")
    print(f"Avg Win Net: {avg_win_net}%")
    print(f"Avg Loss Net: {avg_loss_net}%")
    print(f"Position Size: {position_size * 100}%")
    
    # Old logic (sai)
    print("\n=== OLD LOGIC (WRONG) ===")
    equity_old = initial_capital
    for trade in range(total_trades):
        is_win = np.random.random() < win_rate / 100
        if is_win:
            # Sai: áp dụng trực tiếp avg_win_net vào vốn
            win_amount = avg_win_net / 100
            equity_old *= (1 + win_amount)
        else:
            # Sai: áp dụng trực tiếp avg_loss_net vào vốn
            loss_amount = abs(avg_loss_net) / 100
            equity_old *= (1 - loss_amount)
    
    total_return_old = (equity_old - initial_capital) / initial_capital * 100
    print(f"Final Equity: ${equity_old:,.2f}")
    print(f"Total Return: {total_return_old:.2f}%")
    print(f"Expected Return: {total_trades * win_rate/100 * avg_win_net + total_trades * (1-win_rate/100) * avg_loss_net:.2f}%")
    
    # New logic (đúng)
    print("\n=== NEW LOGIC (CORRECT) ===")
    equity_new = initial_capital
    for trade in range(total_trades):
        is_win = np.random.random() < win_rate / 100
        if is_win:
            # Đúng: chuyển avg_win_net thành tỷ lệ tăng vốn
            win_amount = (avg_win_net / 100) * position_size
            equity_new *= (1 + win_amount)
        else:
            # Đúng: chuyển avg_loss_net thành tỷ lệ giảm vốn
            loss_amount = (abs(avg_loss_net) / 100) * position_size
            equity_new *= (1 - loss_amount)
    
    total_return_new = (equity_new - initial_capital) / initial_capital * 100
    print(f"Final Equity: ${equity_new:,.2f}")
    print(f"Total Return: {total_return_new:.2f}%")
    
    # Tính toán lý thuyết
    expected_win_trades = total_trades * win_rate / 100
    expected_loss_trades = total_trades * (1 - win_rate / 100)
    expected_return = (expected_win_trades * avg_win_net * position_size + 
                      expected_loss_trades * avg_loss_net * position_size)
    print(f"Expected Return: {expected_return:.2f}%")
    
    # So sánh
    print(f"\n=== COMPARISON ===")
    print(f"Old Logic Return: {total_return_old:.2f}%")
    print(f"New Logic Return: {total_return_new:.2f}%")
    print(f"Theoretical Return: {expected_return:.2f}%")
    print(f"Old vs New Difference: {abs(total_return_old - total_return_new):.2f}%")
    
    # Kiểm tra tính hợp lý
    print(f"\n=== VALIDATION ===")
    if abs(total_return_new - expected_return) < 5:  # Cho phép sai số 5%
        print("✅ New logic is reasonable and close to theoretical expectation")
    else:
        print("❌ New logic may still have issues")
    
    if total_return_old > total_return_new * 10:  # Old logic quá cao
        print("✅ Old logic was indeed too optimistic")
    else:
        print("❌ Old logic may not be the main issue")
    
    return {
        'old_return': total_return_old,
        'new_return': total_return_new,
        'theoretical_return': expected_return
    }

def run_multiple_simulations(n_simulations=1000):
    """Chạy nhiều simulation để kiểm tra tính ổn định"""
    print(f"\nRunning {n_simulations} simulations...")
    
    results = []
    for i in range(n_simulations):
        result = test_monte_carlo_logic()
        results.append(result)
        
        if (i + 1) % 100 == 0:
            print(f"Completed {i + 1}/{n_simulations} simulations")
    
    # Tính toán thống kê
    old_returns = [r['old_return'] for r in results]
    new_returns = [r['new_return'] for r in results]
    theoretical_returns = [r['theoretical_return'] for r in results]
    
    print(f"\n=== STATISTICS ===")
    print(f"Old Logic - Mean: {np.mean(old_returns):.2f}%, Std: {np.std(old_returns):.2f}%")
    print(f"New Logic - Mean: {np.mean(new_returns):.2f}%, Std: {np.std(new_returns):.2f}%")
    print(f"Theoretical - Mean: {np.mean(theoretical_returns):.2f}%")
    
    return results

if __name__ == "__main__":
    # Test single simulation
    test_monte_carlo_logic()
    
    # Test multiple simulations
    run_multiple_simulations(100)
