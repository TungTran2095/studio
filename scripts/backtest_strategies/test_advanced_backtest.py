#!/usr/bin/env python3
"""
Test script cho Advanced Backtesting - Không cần database
Sử dụng sample data để demo các tính năng
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, Any

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_sample_data(days: int = 365) -> pd.DataFrame:
    """Generate sample OHLCV data for testing"""
    print(f"Generating {days} days of sample data...")
    
    # Generate dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    dates = pd.date_range(start=start_date, end=end_date, freq='1H')
    
    # Generate price data with some trend and volatility
    np.random.seed(42)  # For reproducible results
    
    # Start with a base price
    base_price = 50000  # BTC price around $50k
    
    # Generate price movements
    returns = np.random.normal(0.0001, 0.02, len(dates))  # Small positive drift, 2% volatility
    
    # Add some trend
    trend = np.linspace(0, 0.1, len(dates))  # 10% upward trend over the period
    returns += trend / len(dates)
    
    # Generate prices
    prices = [base_price]
    for ret in returns[1:]:
        prices.append(prices[-1] * (1 + ret))
    
    # Generate OHLCV data
    data = []
    for i, (date, price) in enumerate(zip(dates, prices)):
        # Generate OHLC from price
        volatility = 0.01  # 1% intraday volatility
        
        open_price = price * (1 + np.random.normal(0, volatility/4))
        high_price = max(open_price, price) * (1 + abs(np.random.normal(0, volatility/2)))
        low_price = min(open_price, price) * (1 - abs(np.random.normal(0, volatility/2)))
        close_price = price
        
        # Generate volume
        base_volume = 1000
        volume = base_volume * (1 + np.random.normal(0, 0.5))
        volume = max(volume, 100)  # Minimum volume
        
        data.append({
            'open_time': date,
            'open': open_price,
            'high': high_price,
            'low': low_price,
            'close': close_price,
            'volume': volume
        })
    
    df = pd.DataFrame(data)
    df.set_index('open_time', inplace=True)
    
    print(f"Generated {len(df)} data points")
    return df

def run_simple_walk_forward_analysis(data: pd.DataFrame) -> Dict[str, Any]:
    """Simple walk-forward analysis simulation"""
    print("Running Walk-Forward Analysis...")
    
    # Split data into periods
    total_days = len(data)
    train_days = 200
    test_days = 50
    step_days = 25
    
    periods = []
    current_start = 0
    
    while current_start + train_days + test_days <= total_days:
        train_end = current_start + train_days
        test_end = train_end + test_days
        
        # Calculate returns for this period
        train_data = data.iloc[current_start:train_end]
        test_data = data.iloc[train_end:test_end]
        
        # Simple return calculation
        train_return = (train_data['close'].iloc[-1] - train_data['close'].iloc[0]) / train_data['close'].iloc[0] * 100
        test_return = (test_data['close'].iloc[-1] - test_data['close'].iloc[0]) / test_data['close'].iloc[0] * 100
        
        periods.append({
            'period': len(periods) + 1,
            'train_return': train_return,
            'test_return': test_return,
            'train_dates': f"{train_data.index[0].date()} to {train_data.index[-1].date()}",
            'test_dates': f"{test_data.index[0].date()} to {test_data.index[-1].date()}"
        })
        
        current_start += step_days
    
    # Calculate summary
    test_returns = [p['test_return'] for p in periods]
    avg_test_return = np.mean(test_returns)
    consistency_score = 1 - (np.std(test_returns) / abs(avg_test_return)) if avg_test_return != 0 else 0
    stability_score = len([r for r in test_returns if r > 0]) / len(test_returns)
    
    return {
        'periods': periods,
        'summary': {
            'total_periods': len(periods),
            'avg_out_of_sample_return': avg_test_return,
            'std_out_of_sample_return': np.std(test_returns),
            'consistency_score': max(0, min(consistency_score, 1)),
            'stability_score': stability_score
        }
    }

def run_simple_monte_carlo_simulation(data: pd.DataFrame, n_simulations: int = 100) -> Dict[str, Any]:
    """Simple Monte Carlo simulation"""
    print(f"Running Monte Carlo Simulation ({n_simulations} simulations)...")
    
    # Calculate historical returns and volatility
    returns = data['close'].pct_change().dropna()
    mean_return = returns.mean()
    volatility = returns.std()
    
    # Run simulations
    simulation_results = []
    for i in range(n_simulations):
        # Generate random price path
        simulated_returns = np.random.normal(mean_return, volatility, 252)  # 1 year
        cumulative_return = np.cumprod(1 + simulated_returns)[-1] - 1
        simulation_results.append(cumulative_return * 100)  # Convert to percentage
    
    # Calculate risk metrics
    var_95 = np.percentile(simulation_results, 5)  # 5th percentile = 95% VaR
    expected_shortfall = np.mean([r for r in simulation_results if r <= var_95])
    probability_of_loss = len([r for r in simulation_results if r < 0]) / len(simulation_results)
    probability_of_positive = len([r for r in simulation_results if r > 0]) / len(simulation_results)
    
    return {
        'simulations': simulation_results,
        'risk_metrics': {
            'var': var_95,
            'expected_shortfall': expected_shortfall,
            'probability_of_loss': probability_of_loss * 100,
            'probability_of_positive_return': probability_of_positive * 100
        },
        'summary': {
            'mean_return': np.mean(simulation_results),
            'std_return': np.std(simulation_results),
            'min_return': np.min(simulation_results),
            'max_return': np.max(simulation_results)
        }
    }

def run_simple_enhanced_backtest(data: pd.DataFrame, initial_capital: float = 10000) -> Dict[str, Any]:
    """Simple enhanced backtest with transaction costs and slippage"""
    print("Running Enhanced Backtest...")
    
    # Simple RSI-like strategy
    def calculate_rsi(prices, period=14):
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    # Calculate RSI
    rsi = calculate_rsi(data['close'])
    
    # Generate signals
    signals = pd.Series(0, index=data.index)
    signals[rsi < 30] = 1  # Buy when oversold
    signals[rsi > 70] = -1  # Sell when overbought
    
    # Simulate trading
    capital = initial_capital
    position = 0
    trades = []
    equity_curve = [capital]
    
    commission_rate = 0.001  # 0.1%
    slippage_rate = 0.0005   # 0.05%
    
    total_commission = 0
    total_slippage = 0
    
    for i in range(1, len(data)):
        current_price = data['close'].iloc[i]
        signal = signals.iloc[i]
        
        # Calculate transaction costs
        if signal == 1 and position == 0:  # Buy signal
            # Apply slippage
            effective_price = current_price * (1 + slippage_rate)
            position_size = (capital * 0.95) / effective_price  # Use 95% of capital
            position = position_size
            
            # Calculate costs
            commission = position_size * effective_price * commission_rate
            slippage_cost = position_size * effective_price * slippage_rate
            
            total_commission += commission
            total_slippage += slippage_cost
            capital -= commission + slippage_cost
            
            trades.append({
                'type': 'buy',
                'price': effective_price,
                'size': position_size,
                'commission': commission,
                'slippage': slippage_cost
            })
            
        elif signal == -1 and position > 0:  # Sell signal
            # Apply slippage
            effective_price = current_price * (1 - slippage_rate)
            sale_value = position * effective_price
            
            # Calculate costs
            commission = sale_value * commission_rate
            slippage_cost = position * effective_price * slippage_rate
            
            total_commission += commission
            total_slippage += slippage_cost
            capital += sale_value - commission - slippage_cost
            
            trades.append({
                'type': 'sell',
                'price': effective_price,
                'size': position,
                'commission': commission,
                'slippage': slippage_cost
            })
            
            position = 0
        
        # Update equity curve
        current_equity = capital + (position * current_price)
        equity_curve.append(current_equity)
    
    # Calculate performance metrics
    total_return = (equity_curve[-1] - initial_capital) / initial_capital * 100
    returns = pd.Series(equity_curve).pct_change().dropna()
    sharpe_ratio = np.sqrt(252) * (returns.mean() / returns.std()) if returns.std() > 0 else 0
    
    # Calculate max drawdown
    peak = equity_curve[0]
    max_drawdown = 0
    for equity in equity_curve:
        if equity > peak:
            peak = equity
        drawdown = (peak - equity) / peak
        max_drawdown = max(max_drawdown, drawdown)
    max_drawdown *= 100
    
    # Calculate win rate
    if len(trades) >= 2:
        buy_trades = [t for t in trades if t['type'] == 'buy']
        sell_trades = [t for t in trades if t['type'] == 'sell']
        
        if len(buy_trades) > 0 and len(sell_trades) > 0:
            profits = []
            for i in range(min(len(buy_trades), len(sell_trades))):
                buy_price = buy_trades[i]['price']
                sell_price = sell_trades[i]['price']
                profit = (sell_price - buy_price) / buy_price
                profits.append(profit)
            
            win_rate = len([p for p in profits if p > 0]) / len(profits) * 100 if profits else 0
        else:
            win_rate = 0
    else:
        win_rate = 0
    
    return {
        'performance': {
            'total_return': total_return,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'win_rate': win_rate,
            'total_trades': len(trades) // 2,  # Count complete buy-sell pairs
            'final_capital': equity_curve[-1]
        },
        'cost_analysis': {
            'total_commission': total_commission,
            'total_slippage': total_slippage,
            'total_costs': total_commission + total_slippage,
            'cost_impact': (total_commission + total_slippage) / initial_capital * 100
        },
        'trades': trades,
        'equity_curve': equity_curve
    }

def main():
    """Main function to run the test"""
    print("Starting Advanced Backtesting Demo...")
    print("=" * 50)
    
    # Generate sample data
    data = generate_sample_data(365)  # 1 year of hourly data
    
    # Run walk-forward analysis
    wf_results = run_simple_walk_forward_analysis(data)
    
    # Run Monte Carlo simulation
    mc_results = run_simple_monte_carlo_simulation(data, n_simulations=100)
    
    # Run enhanced backtest
    enhanced_results = run_simple_enhanced_backtest(data, initial_capital=10000)
    
    # Print results
    print("\nADVANCED BACKTEST RESULTS SUMMARY:")
    print("=" * 50)
    
    # Walk-forward summary
    wf_summary = wf_results['summary']
    print(f"Walk-Forward Analysis:")
    print(f"   - Total periods: {wf_summary['total_periods']}")
    print(f"   - Avg OOS return: {wf_summary['avg_out_of_sample_return']:.2f}%")
    print(f"   - Consistency score: {wf_summary['consistency_score']:.3f}")
    print(f"   - Stability score: {wf_summary['stability_score']:.3f}")
    
    # Monte Carlo summary
    mc_metrics = mc_results['risk_metrics']
    print(f"Monte Carlo Simulation:")
    print(f"   - Simulations: {len(mc_results['simulations'])}")
    print(f"   - VaR (95%): {mc_metrics['var']:.2f}%")
    print(f"   - Expected Shortfall: {mc_metrics['expected_shortfall']:.2f}%")
    print(f"   - Probability of loss: {mc_metrics['probability_of_loss']:.1f}%")
    print(f"   - Probability of positive return: {mc_metrics['probability_of_positive_return']:.1f}%")
    
    # Enhanced backtest summary
    performance = enhanced_results['performance']
    cost_analysis = enhanced_results['cost_analysis']
    print(f"Enhanced Backtest:")
    print(f"   - Total return: {performance['total_return']:.2f}%")
    print(f"   - Sharpe ratio: {performance['sharpe_ratio']:.3f}")
    print(f"   - Max drawdown: {performance['max_drawdown']:.2f}%")
    print(f"   - Win rate: {performance['win_rate']:.1f}%")
    print(f"   - Total trades: {performance['total_trades']}")
    print(f"   - Total costs: ${cost_analysis['total_costs']:.2f}")
    print(f"   - Cost impact: {cost_analysis['cost_impact']:.2f}%")
    
    # Overall assessment
    print(f"Overall Assessment:")
    robustness = (wf_summary['consistency_score'] + wf_summary['stability_score']) / 2
    risk_score = 1 - (abs(mc_metrics['var']) / 20)  # Normalize VaR to 0-1
    performance_score = min(performance['sharpe_ratio'] / 2, 1)  # Normalize Sharpe to 0-1
    
    print(f"   - Strategy robustness: {robustness:.3f}")
    print(f"   - Risk-adjusted performance: {performance_score:.3f}")
    print(f"   - Risk management score: {risk_score:.3f}")
    
    # Save results
    results = {
        'walk_forward_analysis': wf_results,
        'monte_carlo_simulation': mc_results,
        'enhanced_backtest': enhanced_results,
        'summary': {
            'strategy_robustness': robustness,
            'risk_adjusted_performance': performance_score,
            'risk_management_score': risk_score
        }
    }
    
    # Create results directory
    os.makedirs('results/backtests/demo', exist_ok=True)
    
    # Save to file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = f'results/backtests/demo/advanced_demo_{timestamp}.json'
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=4, default=str)
    
    print(f"Results saved to: {results_file}")
    print("Advanced Backtesting Demo completed successfully!")
    
    return results

if __name__ == "__main__":
    main() 