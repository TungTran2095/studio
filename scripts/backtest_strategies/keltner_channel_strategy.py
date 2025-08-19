import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class KeltnerChannelStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.ema_period = int(self.strategy_config.get('ema_period', 20))
        self.atr_period = int(self.strategy_config.get('atr_period', 10))
        self.multiplier = float(self.strategy_config.get('multiplier', 2.0))
        self.confirmation_periods = int(self.strategy_config.get('confirmation_periods', 2))
    
    def calculate_keltner_channels(self, data):
        """Calculate Keltner Channels"""
        # Calculate EMA
        ema = data['close'].ewm(span=self.ema_period).mean()
        
        # Calculate ATR
        high_low = data['high'] - data['low']
        high_close = np.abs(data['high'] - data['close'].shift())
        low_close = np.abs(data['low'] - data['close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        atr = true_range.rolling(window=self.atr_period).mean()
        
        # Calculate channels
        upper_channel = ema + (self.multiplier * atr)
        lower_channel = ema - (self.multiplier * atr)
        
        return ema, upper_channel, lower_channel, atr
    
    def generate_signals(self, data):
        """Generate trading signals based on Keltner Channels"""
        signals = data.copy()
        
        # Calculate Keltner Channels
        ema, upper_channel, lower_channel, atr = self.calculate_keltner_channels(data)
        signals['keltner_ema'] = ema
        signals['keltner_upper'] = upper_channel
        signals['keltner_lower'] = lower_channel
        signals['keltner_atr'] = atr
        
        # Initialize signals
        signals['signal'] = 0
        
        # Generate buy signals
        # Buy when price bounces off lower channel and moves above EMA
        buy_condition = (
            (data['close'] >= lower_channel) & 
            (data['close'] > ema) & 
            (data['close'].shift(1) < ema.shift(1)) &
            (data['close'] > data['close'].shift(1))
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when price hits upper channel and moves below EMA
        sell_condition = (
            (data['close'] <= upper_channel) & 
            (data['close'] < ema) & 
            (data['close'].shift(1) > ema.shift(1)) &
            (data['close'] < data['close'].shift(1))
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
