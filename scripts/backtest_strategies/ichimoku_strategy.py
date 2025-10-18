import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class IchimokuStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.tenkan_period = int(self.strategy_config.get('tenkan_period', 9))
        self.kijun_period = int(self.strategy_config.get('kijun_period', 26))
        self.senkou_span_b_period = int(self.strategy_config.get('senkou_span_b_period', 52))
        self.displacement = int(self.strategy_config.get('displacement', 26))
        self.confirmation_periods = int(self.strategy_config.get('confirmation_periods', 2))
    
    def calculate_ichimoku(self, data):
        """Calculate Ichimoku Cloud components"""
        high = data['high']
        low = data['low']
        close = data['close']
        
        # Tenkan-sen (Conversion Line)
        tenkan = (high.rolling(window=self.tenkan_period).max() + 
                  low.rolling(window=self.tenkan_period).min()) / 2
        
        # Kijun-sen (Base Line)
        kijun = (high.rolling(window=self.kijun_period).max() + 
                low.rolling(window=self.kijun_period).min()) / 2
        
        # Senkou Span A (Leading Span A)
        senkou_span_a = ((tenkan + kijun) / 2).shift(self.displacement)
        
        # Senkou Span B (Leading Span B)
        senkou_span_b = ((high.rolling(window=self.senkou_span_b_period).max() + 
                          low.rolling(window=self.senkou_span_b_period).min()) / 2).shift(self.displacement)
        
        # Chikou Span (Lagging Span)
        chikou = close.shift(-self.displacement)
        
        return tenkan, kijun, senkou_span_a, senkou_span_b, chikou
    
    def generate_signals(self, data):
        """Generate trading signals based on Ichimoku Cloud"""
        signals = data.copy()
        
        # Calculate Ichimoku components
        tenkan, kijun, senkou_span_a, senkou_span_b, chikou = self.calculate_ichimoku(data)
        signals['tenkan'] = tenkan
        signals['kijun'] = kijun
        signals['senkou_span_a'] = senkou_span_a
        signals['senkou_span_b'] = senkou_span_b
        signals['chikou'] = chikou
        
        # Initialize signals
        signals['signal'] = 0
        
        # Generate buy signals
        # Buy when price is above cloud, tenkan crosses above kijun, and chikou confirms
        buy_condition = (
            (data['close'] > senkou_span_a) & 
            (data['close'] > senkou_span_b) & 
            (tenkan > kijun) & 
            (tenkan.shift(1) <= kijun.shift(1)) & 
            (chikou > data['close'].shift(self.displacement))  # Chikou so sánh với giá 26 kỳ trước
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when price is below cloud, tenkan crosses below kijun, and chikou confirms
        sell_condition = (
            (data['close'] < senkou_span_a) & 
            (data['close'] < senkou_span_b) & 
            (tenkan < kijun) & 
            (tenkan.shift(1) >= kijun.shift(1)) & 
            (chikou < data['close'].shift(self.displacement))  # Chikou so sánh với giá 26 kỳ trước
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
