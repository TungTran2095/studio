import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class MACrossoverStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        self.fast_period = self.strategy_config['parameters'].get('fastPeriod', 10)
        self.slow_period = self.strategy_config['parameters'].get('slowPeriod', 20)
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()
        
        # Calculate moving averages
        df['fast_ma'] = df['close'].rolling(window=self.fast_period).mean()
        df['slow_ma'] = df['close'].rolling(window=self.slow_period).mean()
        
        # Generate signals - chỉ tạo signal khi có crossover
        df['signal'] = 0
        
        # Buy signal khi fast MA cắt lên trên slow MA
        df.loc[(df['fast_ma'] > df['slow_ma']) & (df['fast_ma'].shift(1) <= df['slow_ma'].shift(1)), 'signal'] = 1
        
        # Sell signal khi fast MA cắt xuống dưới slow MA
        df.loc[(df['fast_ma'] < df['slow_ma']) & (df['fast_ma'].shift(1) >= df['slow_ma'].shift(1)), 'signal'] = -1
        
        return df 