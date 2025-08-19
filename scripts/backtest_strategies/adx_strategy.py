import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class ADXStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.adx_period = int(self.strategy_config.get('adx_period', 14))
        self.di_period = int(self.strategy_config.get('di_period', 14))
        self.adx_threshold = float(self.strategy_config.get('adx_threshold', 25))
        self.trend_strength = float(self.strategy_config.get('trend_strength', 30))
    
    def calculate_adx(self, data):
        """Calculate ADX, +DI, and -DI"""
        high = data['high']
        low = data['low']
        close = data['close']
        
        # Calculate True Range
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Calculate Directional Movement
        dm_plus = high - high.shift(1)
        dm_minus = low.shift(1) - low
        
        # Filter directional movement
        dm_plus = np.where((dm_plus > dm_minus) & (dm_plus > 0), dm_plus, 0)
        dm_minus = np.where((dm_minus > dm_plus) & (dm_minus > 0), dm_minus, 0)
        
        # Smooth the values
        tr_smooth = tr.rolling(window=self.di_period).mean()
        dm_plus_smooth = pd.Series(dm_plus).rolling(window=self.di_period).mean()
        dm_minus_smooth = pd.Series(dm_minus).rolling(window=self.di_period).mean()
        
        # Calculate +DI and -DI
        di_plus = 100 * (dm_plus_smooth / tr_smooth)
        di_minus = 100 * (dm_minus_smooth / tr_smooth)
        
        # Calculate ADX
        dx = 100 * abs(di_plus - di_minus) / (di_plus + di_minus)
        adx = dx.rolling(window=self.adx_period).mean()
        
        return adx, di_plus, di_minus
    
    def generate_signals(self, data):
        """Generate trading signals based on ADX"""
        signals = data.copy()
        
        # Calculate ADX
        adx, di_plus, di_minus = self.calculate_adx(data)
        signals['adx'] = adx
        signals['di_plus'] = di_plus
        signals['di_minus'] = di_minus
        
        # Initialize signals
        signals['signal'] = 0
        
        # Generate buy signals
        # Buy when ADX > threshold, +DI > -DI, and trend is strong
        buy_condition = (
            (adx > self.adx_threshold) & 
            (di_plus > di_minus) & 
            (adx > self.trend_strength)
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when ADX > threshold, -DI > +DI, and trend is strong
        sell_condition = (
            (adx > self.adx_threshold) & 
            (di_minus > di_plus) & 
            (adx > self.trend_strength)
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
