import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from backtest_strategies.base_strategy import BaseStrategy

class EnhancedStrategy(BaseStrategy):
    """
    Enhanced Strategy with advanced features:
    - Position sizing (Kelly Criterion, Risk Parity)
    - Multi-timeframe analysis
    - Volatility-based risk management
    - Dynamic parameter adjustment
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        
        # Enhanced parameters
        self.position_sizing_method = config.get('position_sizing', 'kelly')
        self.risk_per_trade = float(config.get('risk_per_trade', 2)) / 100  # 2% risk per trade
        self.max_position_size = float(config.get('max_position_size', 20)) / 100  # 20% max position
        
        # Multi-timeframe parameters
        self.timeframes = config.get('timeframes', ['1h', '4h', '1d'])
        self.timeframe_weights = config.get('timeframe_weights', [0.5, 0.3, 0.2])
        
        # Volatility parameters
        self.volatility_lookback = config.get('volatility_lookback', 20)
        self.volatility_threshold = config.get('volatility_threshold', 0.02)
        
        # Kelly Criterion parameters
        self.kelly_fraction = config.get('kelly_fraction', 0.25)  # Conservative Kelly
        
    def calculate_kelly_position_size(self, win_rate: float, avg_win: float, avg_loss: float) -> float:
        """
        Calculate position size using Kelly Criterion
        f = (bp - q) / b
        where:
        f = fraction of capital to bet
        b = odds received on the bet
        p = probability of winning
        q = probability of losing (1 - p)
        """
        if avg_loss == 0:
            return 0
        
        # Calculate odds (b)
        b = abs(avg_win / avg_loss)
        
        # Kelly fraction
        kelly_fraction = (b * win_rate - (1 - win_rate)) / b
        
        # Apply conservative Kelly (fraction of full Kelly)
        conservative_kelly = kelly_fraction * self.kelly_fraction
        
        # Ensure within bounds
        return max(0, min(conservative_kelly, self.max_position_size))
    
    def calculate_risk_parity_position_size(self, volatility: float, target_volatility: float = 0.15) -> float:
        """
        Calculate position size using Risk Parity approach
        Position size inversely proportional to volatility
        """
        if volatility == 0:
            return 0
        
        # Risk parity: position size = target_volatility / asset_volatility
        position_size = target_volatility / volatility
        
        # Apply bounds
        return max(0, min(position_size, self.max_position_size))
    
    def calculate_volatility_adjusted_position_size(self, base_position: float, current_volatility: float) -> float:
        """
        Adjust position size based on current volatility
        """
        # Normalize volatility to 0-1 range
        normalized_vol = min(current_volatility / self.volatility_threshold, 2.0)
        
        # Reduce position size when volatility is high
        volatility_multiplier = 1 / (1 + normalized_vol)
        
        return base_position * volatility_multiplier
    
    def get_multi_timeframe_signals(self, data: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """
        Generate signals from multiple timeframes
        """
        signals = {}
        
        for i, timeframe in enumerate(self.timeframes):
            # Resample data to timeframe
            resampled_data = self._resample_data(data, timeframe)
            
            # Generate signals for this timeframe
            timeframe_signals = self._generate_single_timeframe_signals(resampled_data)
            
            # Resample signals back to original timeframe
            original_signals = self._resample_signals_back(timeframe_signals, data.index)
            
            signals[timeframe] = original_signals
        
        return signals
    
    def _resample_data(self, data: pd.DataFrame, timeframe: str) -> pd.DataFrame:
        """
        Resample OHLCV data to different timeframe
        """
        timeframe_map = {
            '1m': '1T', '5m': '5T', '15m': '15T', '30m': '30T',
            '1h': 'H', '4h': '4H', '1d': 'D', '1w': 'W'
        }
        
        rule = timeframe_map.get(timeframe)
        if not rule:
            return data
        
        resampled = data.resample(rule).agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'volume': 'sum'
        }).dropna()
        
        return resampled
    
    def _resample_signals_back(self, signals: pd.DataFrame, target_index: pd.DatetimeIndex) -> pd.DataFrame:
        """
        Resample signals back to original timeframe using forward fill
        """
        # Reindex to target timeframe and forward fill
        resampled_signals = signals.reindex(target_index, method='ffill')
        
        return resampled_signals
    
    def _generate_single_timeframe_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals for a single timeframe (to be overridden by subclasses)
        """
        # Base implementation - should be overridden
        df = data.copy()
        df['signal'] = 0
        return df
    
    def combine_multi_timeframe_signals(self, signals: Dict[str, pd.DataFrame]) -> pd.Series:
        """
        Combine signals from multiple timeframes using weighted average
        """
        combined_signals = pd.Series(0, index=signals[self.timeframes[0]].index)
        
        for i, timeframe in enumerate(self.timeframes):
            if timeframe in signals:
                weight = self.timeframe_weights[i]
                timeframe_signals = signals[timeframe]['signal']
                
                # Align indices
                aligned_signals = timeframe_signals.reindex(combined_signals.index, method='ffill')
                combined_signals += aligned_signals * weight
        
        # Normalize to -1, 0, 1
        combined_signals = np.where(combined_signals > 0.5, 1, 
                                  np.where(combined_signals < -0.5, -1, 0))
        
        return pd.Series(combined_signals, index=combined_signals.index)
    
    def calculate_rolling_volatility(self, data: pd.DataFrame) -> pd.Series:
        """
        Calculate rolling volatility
        """
        returns = data['close'].pct_change()
        volatility = returns.rolling(window=self.volatility_lookback).std()
        return volatility
    
    def calculate_rolling_metrics(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate rolling performance metrics for position sizing
        """
        df = data.copy()
        
        # Calculate rolling volatility
        df['volatility'] = self.calculate_rolling_volatility(data)
        
        # Calculate rolling win rate and average win/loss
        df['rolling_return'] = df['close'].pct_change()
        
        # Simple rolling metrics (can be enhanced)
        df['rolling_win_rate'] = (df['rolling_return'] > 0).rolling(20).mean()
        df['rolling_avg_win'] = df['rolling_return'].where(df['rolling_return'] > 0).rolling(20).mean()
        df['rolling_avg_loss'] = df['rolling_return'].where(df['rolling_return'] < 0).rolling(20).mean()
        
        return df
    
    def generate_enhanced_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate enhanced signals with multi-timeframe analysis and position sizing
        """
        # Get multi-timeframe signals
        multi_tf_signals = self.get_multi_timeframe_signals(data)
        
        # Combine signals
        combined_signal = self.combine_multi_timeframe_signals(multi_tf_signals)
        
        # Calculate rolling metrics
        enhanced_data = self.calculate_rolling_metrics(data)
        
        # Create result DataFrame
        result = data.copy()
        result['signal'] = combined_signal
        result['volatility'] = enhanced_data['volatility']
        result['rolling_win_rate'] = enhanced_data['rolling_win_rate']
        result['rolling_avg_win'] = enhanced_data['rolling_avg_win']
        result['rolling_avg_loss'] = enhanced_data['rolling_avg_loss']
        
        # Calculate position sizes
        result['position_size'] = self.calculate_dynamic_position_sizes(result)
        
        return result
    
    def calculate_dynamic_position_sizes(self, data: pd.DataFrame) -> pd.Series:
        """
        Calculate dynamic position sizes based on market conditions
        """
        position_sizes = pd.Series(0, index=data.index)
        
        for i in range(len(data)):
            if i < 20:  # Need enough data for calculations
                continue
            
            # Get current metrics
            current_volatility = data.iloc[i]['volatility']
            current_win_rate = data.iloc[i]['rolling_win_rate']
            current_avg_win = data.iloc[i]['rolling_avg_win']
            current_avg_loss = data.iloc[i]['rolling_avg_loss']
            
            # Skip if insufficient data
            if pd.isna(current_win_rate) or pd.isna(current_avg_win) or pd.isna(current_avg_loss):
                continue
            
            # Calculate base position size based on method
            if self.position_sizing_method == 'kelly':
                base_position = self.calculate_kelly_position_size(
                    current_win_rate, current_avg_win, current_avg_loss
                )
            elif self.position_sizing_method == 'risk_parity':
                base_position = self.calculate_risk_parity_position_size(current_volatility)
            else:  # Fixed position size
                base_position = self.position_size
            
            # Adjust for volatility
            adjusted_position = self.calculate_volatility_adjusted_position_size(
                base_position, current_volatility
            )
            
            position_sizes.iloc[i] = adjusted_position
        
        return position_sizes
    
    def run_enhanced_backtest(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Run enhanced backtest with dynamic position sizing
        """
        # Generate enhanced signals
        enhanced_signals = self.generate_enhanced_signals(data)
        
        # Initialize tracking variables
        capital = self.initial_capital
        position = 0
        trades = []
        equity_curve = [capital]
        
        # Track performance metrics
        total_trades = 0
        winning_trades = 0
        total_pnl = 0
        
        for i in range(1, len(enhanced_signals)):
            current_price = enhanced_signals.iloc[i]['close']
            signal = enhanced_signals.iloc[i]['signal']
            position_size = enhanced_signals.iloc[i]['position_size']
            
            # Entry logic
            if signal == 1 and position == 0:
                # Use dynamic position size
                trade_size = (capital * position_size) / current_price
                position = trade_size
                
                trades.append({
                    'entry_time': enhanced_signals.index[i],
                    'entry_price': current_price,
                    'size': trade_size,
                    'position_size_used': position_size,
                    'type': 'long'
                })
            
            # Exit logic
            elif signal == -1 and position > 0:
                pnl = (current_price - trades[-1]['entry_price']) * position
                capital += pnl
                
                trades[-1].update({
                    'exit_time': enhanced_signals.index[i],
                    'exit_price': current_price,
                    'pnl': pnl,
                    'pnl_pct': (current_price - trades[-1]['entry_price']) / trades[-1]['entry_price'] * 100
                })
                
                total_trades += 1
                if pnl > 0:
                    winning_trades += 1
                total_pnl += pnl
                
                position = 0
            
            # Update equity curve
            current_equity = capital + (position * current_price)
            equity_curve.append(current_equity)
        
        # Calculate performance metrics
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        total_return = (capital - self.initial_capital) / self.initial_capital * 100
        
        # Calculate Sharpe ratio
        returns = pd.Series(equity_curve).pct_change().dropna()
        sharpe_ratio = np.sqrt(252) * (returns.mean() / returns.std()) if len(returns) > 0 and returns.std() > 0 else 0
        
        # Calculate max drawdown
        peak = equity_curve[0]
        max_drawdown = 0
        for equity in equity_curve:
            if equity > peak:
                peak = equity
            drawdown = (peak - equity) / peak
            max_drawdown = max(max_drawdown, drawdown)
        max_drawdown *= 100
        
        return {
            'trades': trades,
            'equity_curve': equity_curve,
            'performance': {
                'total_return': total_return,
                'sharpe_ratio': sharpe_ratio,
                'max_drawdown': max_drawdown,
                'win_rate': win_rate * 100,
                'total_trades': total_trades,
                'winning_trades': winning_trades,
                'losing_trades': total_trades - winning_trades,
                'total_pnl': total_pnl
            },
            'enhanced_metrics': {
                'avg_position_size': np.mean([t.get('position_size_used', 0) for t in trades]),
                'position_size_volatility': np.std([t.get('position_size_used', 0) for t in trades]),
                'dynamic_adjustments': len([t for t in trades if t.get('position_size_used', 0) != self.position_size])
            }
        } 