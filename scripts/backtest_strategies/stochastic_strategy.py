import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class StochasticStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.k_period = int(self.strategy_config.get('k_period', 14))
        self.d_period = int(self.strategy_config.get('d_period', 3))
        self.overbought = float(self.strategy_config.get('overbought', 80))
        self.oversold = float(self.strategy_config.get('oversold', 20))
        self.smooth_k = int(self.strategy_config.get('smooth_k', 3))
        self.smooth_d = int(self.strategy_config.get('smooth_d', 3))
    
    def calculate_stochastic(self, data):
        """Calculate Stochastic Oscillator"""
        low_min = data['low'].rolling(window=self.k_period).min()
        high_max = data['high'].rolling(window=self.k_period).max()
        
        # %K line
        k_line = 100 * ((data['close'] - low_min) / (high_max - low_min))
        k_line = k_line.rolling(window=self.smooth_k).mean()
        
        # %D line (signal line)
        d_line = k_line.rolling(window=self.d_period).mean()
        
        return k_line, d_line
    
    def generate_signals(self, data):
        """Generate trading signals based on Stochastic Oscillator"""
        signals = data.copy()
        
        # Calculate Stochastic
        k_line, d_line = self.calculate_stochastic(data)
        signals['stoch_k'] = k_line
        signals['stoch_d'] = d_line
        
        # Initialize signals
        signals['signal'] = 0
        
        # Generate buy signals
        # Buy when %K crosses above %D from oversold territory
        buy_condition = (
            (k_line < self.oversold) & 
            (k_line > d_line) & 
            (k_line.shift(1) <= d_line.shift(1))
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when %K crosses below %D from overbought territory
        sell_condition = (
            (k_line > self.overbought) & 
            (k_line < d_line) & 
            (k_line.shift(1) >= d_line.shift(1))
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
