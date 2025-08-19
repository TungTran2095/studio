import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class WilliamsRStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.period = int(self.strategy_config.get('period', 14))
        self.overbought = float(self.strategy_config.get('overbought', -20))
        self.oversold = float(self.strategy_config.get('oversold', -80))
        self.confirmation_periods = int(self.strategy_config.get('confirmation_periods', 2))
    
    def calculate_williams_r(self, data):
        """Calculate Williams %R"""
        highest_high = data['high'].rolling(window=self.period).max()
        lowest_low = data['low'].rolling(window=self.period).min()
        
        williams_r = -100 * ((highest_high - data['close']) / (highest_high - lowest_low))
        return williams_r
    
    def generate_signals(self, data):
        """Generate trading signals based on Williams %R"""
        signals = data.copy()
        
        # Calculate Williams %R
        williams_r = self.calculate_williams_r(data)
        signals['williams_r'] = williams_r
        
        # Initialize signals
        signals['signal'] = 0
        
        # Generate buy signals
        # Buy when Williams %R moves above oversold level
        buy_condition = (
            (williams_r < self.oversold) & 
            (williams_r.shift(1) >= self.oversold)
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when Williams %R moves below overbought level
        sell_condition = (
            (williams_r > self.overbought) & 
            (williams_r.shift(1) <= self.overbought)
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
