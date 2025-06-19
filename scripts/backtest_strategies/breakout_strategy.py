import pandas as pd
import numpy as np
from backtest_strategies.base_strategy import BaseStrategy

class BreakoutStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        self.channel_period = self.strategy_config['parameters'].get('channelPeriod', 20)
        self.multiplier = self.strategy_config['parameters'].get('multiplier', 2)
    
    def calculate_channels(self, data: pd.Series) -> tuple:
        # Calculate rolling high and low
        rolling_high = data.rolling(window=self.channel_period).max()
        rolling_low = data.rolling(window=self.channel_period).min()
        
        # Calculate channel middle and width
        channel_middle = (rolling_high + rolling_low) / 2
        channel_width = rolling_high - rolling_low
        
        # Calculate upper and lower channels
        upper_channel = channel_middle + (channel_width * self.multiplier)
        lower_channel = channel_middle - (channel_width * self.multiplier)
        
        return upper_channel, lower_channel
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()
        
        # Calculate channels
        df['upper_channel'], df['lower_channel'] = self.calculate_channels(df['close'])
        
        # Generate signals
        df['signal'] = 0
        # Buy when price breaks above upper channel
        df.loc[df['close'] > df['upper_channel'], 'signal'] = 1
        # Sell when price breaks below lower channel
        df.loc[df['close'] < df['lower_channel'], 'signal'] = -1
        
        return df 