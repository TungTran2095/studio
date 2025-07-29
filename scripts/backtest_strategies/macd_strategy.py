import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class MACDStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        self.fast_ema = self.strategy_config['parameters'].get('fastEMA', 12)
        self.slow_ema = self.strategy_config['parameters'].get('slowEMA', 26)
        self.signal_period = self.strategy_config['parameters'].get('signalPeriod', 9)
    
    def calculate_macd(self, data: pd.Series) -> tuple:
        # Calculate EMAs
        fast_ema = data.ewm(span=self.fast_ema, adjust=False).mean()
        slow_ema = data.ewm(span=self.slow_ema, adjust=False).mean()
        
        # Calculate MACD line
        macd_line = fast_ema - slow_ema
        
        # Calculate signal line
        signal_line = macd_line.ewm(span=self.signal_period, adjust=False).mean()
        
        # Calculate histogram
        histogram = macd_line - signal_line
        
        return macd_line, signal_line, histogram
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()
        
        # Calculate MACD components
        df['macd'], df['signal_line'], df['histogram'] = self.calculate_macd(df['close'])
        
        # Generate signals
        df['signal'] = 0
        # Buy when MACD crosses above signal line
        df.loc[(df['macd'] > df['signal_line']) & (df['macd'].shift(1) <= df['signal_line'].shift(1)), 'signal'] = 1
        # Sell when MACD crosses below signal line
        df.loc[(df['macd'] < df['signal_line']) & (df['macd'].shift(1) >= df['signal_line'].shift(1)), 'signal'] = -1
        
        return df 