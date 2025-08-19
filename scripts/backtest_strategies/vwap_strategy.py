import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class VWAPStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.vwap_period = int(self.strategy_config.get('vwap_period', 20))
        self.std_dev_multiplier = float(self.strategy_config.get('std_dev_multiplier', 2.0))
        self.confirmation_periods = int(self.strategy_config.get('confirmation_periods', 2))
        self.volume_threshold = float(self.strategy_config.get('volume_threshold', 1.5))
    
    def calculate_vwap(self, data):
        """Calculate VWAP and standard deviation bands"""
        # Calculate VWAP
        typical_price = (data['high'] + data['low'] + data['close']) / 3
        volume_price = typical_price * data['volume']
        
        # Rolling VWAP
        vwap = volume_price.rolling(window=self.vwap_period).sum() / data['volume'].rolling(window=self.vwap_period).sum()
        
        # Calculate standard deviation
        price_diff = typical_price - vwap
        squared_diff = price_diff ** 2
        weighted_squared_diff = squared_diff * data['volume']
        variance = weighted_squared_diff.rolling(window=self.vwap_period).sum() / data['volume'].rolling(window=self.vwap_period).sum()
        std_dev = np.sqrt(variance)
        
        # Calculate bands
        upper_band = vwap + (self.std_dev_multiplier * std_dev)
        lower_band = vwap - (self.std_dev_multiplier * std_dev)
        
        return vwap, upper_band, lower_band, std_dev
    
    def generate_signals(self, data):
        """Generate trading signals based on VWAP"""
        signals = data.copy()
        
        # Calculate VWAP
        vwap, upper_band, lower_band, std_dev = self.calculate_vwap(data)
        signals['vwap'] = vwap
        signals['vwap_upper'] = upper_band
        signals['vwap_lower'] = lower_band
        signals['vwap_std'] = std_dev
        
        # Initialize signals
        signals['signal'] = 0
        
        # Calculate volume ratio (current volume vs average volume)
        avg_volume = data['volume'].rolling(window=self.vwap_period).mean()
        volume_ratio = data['volume'] / avg_volume
        
        # Generate buy signals
        # Buy when price is below VWAP, near lower band, with high volume
        buy_condition = (
            (data['close'] < vwap) & 
            (data['close'] >= lower_band) & 
            (volume_ratio > self.volume_threshold) &
            (data['close'] > data['close'].shift(1))
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when price is above VWAP, near upper band, with high volume
        sell_condition = (
            (data['close'] > vwap) & 
            (data['close'] <= upper_band) & 
            (volume_ratio > self.volume_threshold) &
            (data['close'] < data['close'].shift(1))
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
