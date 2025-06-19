import pandas as pd
import numpy as np
from typing import Dict, Any, List
from abc import ABC, abstractmethod

class BaseStrategy(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.trading_config = config.get('trading', {})
        self.risk_config = config.get('riskManagement', {})
        self.strategy_config = config.get('strategy', {})
        
        # Trading parameters
        self.symbol = self.trading_config.get('symbol', 'BTCUSDT')
        self.timeframe = self.trading_config.get('timeframe', '1h')
        self.initial_capital = float(self.trading_config.get('initialCapital', 10000))
        self.position_size = float(self.trading_config.get('positionSize', 1))
        
        # Risk management parameters
        self.stop_loss = float(self.risk_config.get('stopLoss', 2)) / 100
        self.take_profit = float(self.risk_config.get('takeProfit', 4)) / 100
        self.max_positions = int(self.risk_config.get('maxPositions', 1))
        self.max_drawdown = float(self.risk_config.get('maxDrawdown', 10)) / 100
        self.trailing_stop = bool(self.risk_config.get('trailingStop', True))
        self.trailing_stop_distance = float(self.risk_config.get('trailingStopDistance', 1)) / 100
        
        # Trading state
        self.capital = self.initial_capital
        self.positions = []
        self.trades = []
        self.equity_curve = [self.initial_capital]
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on strategy logic.
        Must be implemented by each strategy.
        """
        pass
    
    def run_backtest(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Run backtest with the given data and strategy parameters.
        Returns backtest results including trades and performance metrics.
        """
        # Generate signals
        signals = self.generate_signals(data)
        
        # Initialize results
        trades = []
        equity = [self.initial_capital]
        current_capital = self.initial_capital
        max_capital = self.initial_capital
        max_drawdown = 0
        
        # Track positions
        in_position = False
        entry_price = 0
        position_size = 0
        
        # Iterate through data
        for i in range(1, len(signals)):
            current_price = signals.iloc[i]['close']
            signal = signals.iloc[i]['signal']
            
            # Check for exit conditions if in position
            if in_position:
                # Calculate profit/loss
                pnl = (current_price - entry_price) * position_size
                pnl_pct = (current_price - entry_price) / entry_price
                
                # Check stop loss
                if pnl_pct <= -self.stop_loss:
                    trades.append({
                        'entry_time': signals.index[i-1],
                        'exit_time': signals.index[i],
                        'entry_price': entry_price,
                        'exit_price': current_price,
                        'size': position_size,
                        'pnl': pnl,
                        'pnl_pct': pnl_pct,
                        'type': 'long',
                        'exit_reason': 'stop_loss'
                    })
                    current_capital += pnl
                    in_position = False
                
                # Check take profit
                elif pnl_pct >= self.take_profit:
                    trades.append({
                        'entry_time': signals.index[i-1],
                        'exit_time': signals.index[i],
                        'entry_price': entry_price,
                        'exit_price': current_price,
                        'size': position_size,
                        'pnl': pnl,
                        'pnl_pct': pnl_pct,
                        'type': 'long',
                        'exit_reason': 'take_profit'
                    })
                    current_capital += pnl
                    in_position = False
                
                # Check signal exit
                elif signal == -1:
                    trades.append({
                        'entry_time': signals.index[i-1],
                        'exit_time': signals.index[i],
                        'entry_price': entry_price,
                        'exit_price': current_price,
                        'size': position_size,
                        'pnl': pnl,
                        'pnl_pct': pnl_pct,
                        'type': 'long',
                        'exit_reason': 'signal'
                    })
                    current_capital += pnl
                    in_position = False
            
            # Check for entry if not in position
            elif signal == 1 and not in_position:
                entry_price = current_price
                position_size = (current_capital * self.position_size) / current_price
                in_position = True
            
            # Update equity curve
            equity.append(current_capital)
            
            # Update max drawdown
            if current_capital > max_capital:
                max_capital = current_capital
            drawdown = (max_capital - current_capital) / max_capital
            max_drawdown = max(max_drawdown, drawdown)
        
        # Calculate performance metrics
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t['pnl'] > 0])
        losing_trades = total_trades - winning_trades
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        avg_win = np.mean([t['pnl'] for t in trades if t['pnl'] > 0]) if winning_trades > 0 else 0
        avg_loss = np.mean([t['pnl'] for t in trades if t['pnl'] < 0]) if losing_trades > 0 else 0
        
        total_return = (current_capital - self.initial_capital) / self.initial_capital * 100
        
        # Calculate Sharpe Ratio (assuming risk-free rate = 0)
        returns = pd.Series(equity).pct_change().dropna()
        sharpe_ratio = np.sqrt(252) * (returns.mean() / returns.std()) if len(returns) > 0 else 0
        
        return {
            'trades': trades,
            'equity_curve': equity,
            'performance': {
                'total_return': total_return,
                'sharpe_ratio': sharpe_ratio,
                'max_drawdown': max_drawdown * 100,
                'total_trades': total_trades,
                'winning_trades': winning_trades,
                'losing_trades': losing_trades,
                'win_rate': win_rate * 100,
                'average_win': avg_win,
                'average_loss': avg_loss,
                'final_capital': current_capital
            }
        } 