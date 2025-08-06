import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

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
        
        # Generate signals - chỉ tạo signal khi có sự thay đổi trạng thái
        df['signal'] = 0
        
        # Buy signal khi RSI từ trên oversold xuống dưới oversold
        df.loc[(df['rsi'] < self.oversold) & (df['rsi'].shift(1) >= self.oversold), 'signal'] = 1
        
        # Sell signal khi RSI từ dưới overbought lên trên overbought
        df.loc[(df['rsi'] > self.overbought) & (df['rsi'].shift(1) <= self.overbought), 'signal'] = -1
        
        return df 