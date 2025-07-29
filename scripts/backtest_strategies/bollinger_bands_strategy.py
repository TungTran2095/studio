import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class BollingerBandsStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        self.period = self.strategy_config['parameters'].get('period', 20)
        self.std_dev = self.strategy_config['parameters'].get('stdDev', 2)
    
    def calculate_bollinger_bands(self, data: pd.Series) -> tuple:
        # Calculate middle band (SMA)
        middle_band = data.rolling(window=self.period).mean()
        
        # Calculate standard deviation
        std = data.rolling(window=self.period).std()
        
        # Calculate upper and lower bands
        upper_band = middle_band + (std * self.std_dev)
        lower_band = middle_band - (std * self.std_dev)
        
        return upper_band, middle_band, lower_band
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()
        
        # Calculate Bollinger Bands
        df['upper'], df['middle'], df['lower'] = self.calculate_bollinger_bands(df['close'])
        
        # Generate signals
        df['signal'] = 0
        # Buy when price crosses below lower band
        df.loc[df['close'] < df['lower'], 'signal'] = 1
        # Sell when price crosses above upper band
        df.loc[df['close'] > df['upper'], 'signal'] = -1
        
        return df 