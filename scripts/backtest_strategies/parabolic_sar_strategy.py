import pandas as pd
import numpy as np
from base_strategy import BaseStrategy

class ParabolicSARStrategy(BaseStrategy):
    def __init__(self, config):
        super().__init__(config)
        
        # Strategy specific parameters
        self.acceleration = float(self.strategy_config.get('acceleration', 0.02))
        self.maximum = float(self.strategy_config.get('maximum', 0.2))
        self.confirmation_periods = int(self.strategy_config.get('confirmation_periods', 1))
    
    def calculate_parabolic_sar(self, data):
        """Calculate Parabolic SAR"""
        high = data['high']
        low = data['low']
        close = data['close']
        
        # Initialize arrays
        sar = np.zeros(len(data))
        trend = np.zeros(len(data))
        af = np.zeros(len(data))
        ep = np.zeros(len(data))
        
        # Set initial values
        sar[0] = low.iloc[0]
        trend[0] = 1  # 1 for uptrend, -1 for downtrend
        af[0] = self.acceleration
        ep[0] = high.iloc[0]
        
        for i in range(1, len(data)):
            # Uptrend
            if trend[i-1] == 1:
                sar[i] = sar[i-1] + af[i-1] * (ep[i-1] - sar[i-1])
                
                # Check if SAR is above low
                if sar[i] > low.iloc[i]:
                    sar[i] = low.iloc[i]
                
                # Check for trend reversal
                if close.iloc[i] < sar[i]:
                    trend[i] = -1
                    sar[i] = ep[i-1]
                    af[i] = self.acceleration
                    ep[i] = low.iloc[i]
                else:
                    trend[i] = 1
                    # Update extreme point
                    if high.iloc[i] > ep[i-1]:
                        ep[i] = high.iloc[i]
                        af[i] = min(af[i-1] + self.acceleration, self.maximum)
                    else:
                        ep[i] = ep[i-1]
                        af[i] = af[i-1]
            
            # Downtrend
            else:
                sar[i] = sar[i-1] + af[i-1] * (ep[i-1] - sar[i-1])
                
                # Check if SAR is below high
                if sar[i] < high.iloc[i]:
                    sar[i] = high.iloc[i]
                
                # Check for trend reversal
                if close.iloc[i] > sar[i]:
                    trend[i] = 1
                    sar[i] = ep[i-1]
                    af[i] = self.acceleration
                    ep[i] = high.iloc[i]
                else:
                    trend[i] = -1
                    # Update extreme point
                    if low.iloc[i] < ep[i-1]:
                        ep[i] = low.iloc[i]
                        af[i] = min(af[i-1] + self.acceleration, self.maximum)
                    else:
                        ep[i] = ep[i-1]
                        af[i] = af[i-1]
        
        return pd.Series(sar, index=data.index), pd.Series(trend, index=data.index)
    
    def generate_signals(self, data):
        """Generate trading signals based on Parabolic SAR"""
        signals = data.copy()
        
        # Calculate Parabolic SAR
        sar, trend = self.calculate_parabolic_sar(data)
        signals['parabolic_sar'] = sar
        signals['trend'] = trend
        
        # Initialize signals
        signals['signal'] = 0
        
        # Generate buy signals
        # Buy when trend changes from downtrend to uptrend
        buy_condition = (
            (trend == 1) & 
            (trend.shift(1) == -1) & 
            (data['close'] > sar)
        )
        signals.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals
        # Sell when trend changes from uptrend to downtrend
        sell_condition = (
            (trend == -1) & 
            (trend.shift(1) == 1) & 
            (data['close'] < sar)
        )
        signals.loc[sell_condition, 'signal'] = -1
        
        return signals
