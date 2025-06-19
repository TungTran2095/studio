import pandas as pd
import numpy as np
from backtest_strategies.base_strategy import BaseStrategy

class RSIStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        self.period = self.strategy_config['parameters'].get('period', 14)
        self.overbought = self.strategy_config['parameters'].get('overbought', 70)
        self.oversold = self.strategy_config['parameters'].get('oversold', 30)
    
    def calculate_rsi(self, data: pd.Series) -> pd.Series:
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()
        
        # Calculate RSI
        df['rsi'] = self.calculate_rsi(df['close'])
        
        # Generate signals
        df['signal'] = 0
        df.loc[df['rsi'] < self.oversold, 'signal'] = 1  # Buy signal when oversold
        df.loc[df['rsi'] > self.overbought, 'signal'] = -1  # Sell signal when overbought
        
        return df 