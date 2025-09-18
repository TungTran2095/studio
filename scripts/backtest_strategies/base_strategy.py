import pandas as pd
import numpy as np
from typing import Dict, Any, List
from abc import ABC, abstractmethod

class BaseStrategy(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.trading_config = config.get('trading', {})
        self.risk_config = config.get('riskManagement', {})
        self.strategy_config = config.get('strategy', {})
        
        # Trading parameters
        self.symbol = self.trading_config.get('symbol', 'BTCUSDT')
        self.timeframe = self.trading_config.get('timeframe', '1h')
        self.initial_capital = float(self.trading_config.get('initialCapital', 10000))
        self.position_size = float(self.trading_config.get('positionSize', 1))
        # Transaction fee (đơn vị %)
        self.maker_fee = float(self.trading_config.get('maker_fee', 0.1)) / 100
        self.taker_fee = float(self.trading_config.get('taker_fee', 0.1)) / 100
        
        # Risk management parameters
        self.stop_loss = float(self.risk_config.get('stopLoss', 2)) / 100
        self.take_profit = float(self.risk_config.get('takeProfit', 4)) / 100
        self.max_positions = int(self.risk_config.get('maxPositions', 1))
        self.max_drawdown = float(self.risk_config.get('maxDrawdown', 10)) / 100
        self.trailing_stop = bool(self.risk_config.get('trailingStop', True))
        self.trailing_stop_distance = float(self.risk_config.get('trailingStopDistance', 1)) / 100
        
        # Priority settings
        self.prioritize_stoploss = bool(self.risk_config.get('prioritizeStoploss', False))
        self.use_take_profit = bool(self.risk_config.get('useTakeProfit', False))
        
        # Trading state
        self.capital = self.initial_capital
        self.positions = []
        self.trades = []
        self.equity_curve = [self.initial_capital]
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on strategy logic.
        Must be implemented by each strategy.
        """
        pass
    
    def run_backtest(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Run backtest with the given data and strategy parameters.
        Returns backtest results including trades and performance metrics.
        """
        # Generate signals
        signals = self.generate_signals(data)
        
        # Initialize results
        trades = []
        equity = [self.initial_capital]
        current_capital = self.initial_capital
        max_capital = self.initial_capital
        max_drawdown = 0
        total_fee = 0
        entry_fee_last_trade = 0
        
        # Track positions
        in_position = False
        entry_price = 0
        position_size = 0
        entry_time = None
        entry_indicators = {}
        
        # Iterate through data
        for i in range(1, len(signals)):
            current_price = signals.iloc[i]['close']
            signal = signals.iloc[i]['signal']
            
            # Debug: print signal info (commented out)
            # if signal != 0:
            #     print(f"Signal at index {i}: {signal}, price: {current_price}, in_position: {in_position}")
            
            # Check for position exit (stoploss priority, then signal, then take profit)
            if in_position:
                exit_reason = None
                should_exit = False
                
                # 1. Check stoploss first (highest priority)
                if self.prioritize_stoploss:
                    stoploss_price = entry_price * (1 - self.stop_loss)
                    if current_price <= stoploss_price:
                        exit_reason = 'stoploss'
                        should_exit = True
                
                # 2. Check sell signal (second priority)
                if not should_exit and signal == -1:
                    exit_reason = 'signal'
                    should_exit = True
                
                # 3. Check take profit (third priority) - chỉ khi bật use_take_profit
                if not should_exit and self.prioritize_stoploss and self.use_take_profit:
                    take_profit_price = entry_price * (1 + self.take_profit)
                    if current_price >= take_profit_price:
                        exit_reason = 'take_profit'
                        should_exit = True
                
                # Execute exit if any condition is met
                if should_exit:
                    # Calculate profit/loss
                    pnl = (current_price - entry_price) * position_size
                    pnl_pct = (current_price - entry_price) / entry_price  # Tỷ lệ thay đổi giá (0.05 = 5%)
                    # Maker fee khi thoát lệnh
                    exit_fee = current_price * position_size * self.maker_fee
                    
                    # Lấy giá trị indicator tại thời điểm bán
                    exit_indicators = {}
                    for col in signals.columns:
                        if col not in ['open', 'high', 'low', 'close', 'volume', 'signal']:
                            exit_indicators[col] = signals.iloc[i][col]
                    
                    # Tạo trade record với cả entry và exit indicators
                    trade_record = {
                        'entry_time': entry_time,  # Sử dụng thời gian mua thực tế
                        'exit_time': signals.index[i],
                        'entry_price': entry_price,
                        'exit_price': current_price,
                        'size': position_size,
                        'pnl': pnl - entry_fee_last_trade - exit_fee,
                        'pnl_pct': pnl_pct,
                        'type': 'long',
                        'exit_reason': exit_reason,  # Sử dụng exit_reason từ logic trên
                        'entry_fee': entry_fee_last_trade,
                        'exit_fee': exit_fee
                    }
                    
                    # Thêm entry indicators với prefix "entry_"
                    for key, value in entry_indicators.items():
                        trade_record[f'entry_{key}'] = value
                    
                    # Thêm exit indicators với prefix "exit_"
                    for key, value in exit_indicators.items():
                        trade_record[f'exit_{key}'] = value
                    
                    trades.append(trade_record)
                    current_capital += pnl - exit_fee
                    total_fee += exit_fee
                    in_position = False
                    entry_fee_last_trade = 0
            # Bỏ qua sell signal khi không có position
            elif signal == -1 and not in_position:
                pass  # Skip sell signal when no position
            
            # Legacy logic: Check for signal-based exit when prioritize_stoploss is False
            elif in_position and signal == -1 and not self.prioritize_stoploss:
                # Calculate profit/loss
                pnl = (current_price - entry_price) * position_size
                pnl_pct = (current_price - entry_price) / entry_price  # Tỷ lệ thay đổi giá (0.05 = 5%)
                # Maker fee khi thoát lệnh
                exit_fee = current_price * position_size * self.maker_fee
                
                # Lấy giá trị indicator tại thời điểm bán
                exit_indicators = {}
                for col in signals.columns:
                    if col not in ['open', 'high', 'low', 'close', 'volume', 'signal']:
                        exit_indicators[col] = signals.iloc[i][col]
                
                # Tạo trade record với cả entry và exit indicators
                trade_record = {
                    'entry_time': entry_time,  # Sử dụng thời gian mua thực tế
                    'exit_time': signals.index[i],
                    'entry_price': entry_price,
                    'exit_price': current_price,
                    'size': position_size,
                    'pnl': pnl - entry_fee_last_trade - exit_fee,
                    'pnl_pct': pnl_pct,
                    'type': 'long',
                    'exit_reason': 'signal',
                    'entry_fee': entry_fee_last_trade,
                    'exit_fee': exit_fee
                }
                
                # Thêm entry indicators với prefix "entry_"
                for key, value in entry_indicators.items():
                    trade_record[f'entry_{key}'] = value
                
                # Thêm exit indicators với prefix "exit_"
                for key, value in exit_indicators.items():
                    trade_record[f'exit_{key}'] = value
                
                trades.append(trade_record)
                current_capital += pnl - exit_fee
                total_fee += exit_fee
                in_position = False
                entry_fee_last_trade = 0
            
            # Check for entry if not in position - Mua khi có signal mua
            elif signal == 1 and not in_position:
                entry_price = current_price
                entry_time = signals.index[i]  # Lưu thời gian mua thực tế
                position_size = (current_capital * self.position_size) / current_price
                # Taker fee khi vào lệnh
                entry_fee = current_price * position_size * self.taker_fee
                current_capital -= entry_fee
                total_fee += entry_fee
                entry_fee_last_trade = entry_fee
                in_position = True
                
                # Lưu thông tin entry để sử dụng khi exit
                entry_indicators = {}
                for col in signals.columns:
                    if col not in ['open', 'high', 'low', 'close', 'volume', 'signal']:
                        entry_indicators[col] = signals.iloc[i][col]
            
            # Update equity curve
            equity.append(current_capital)
            
            # Update max drawdown
            if current_capital > max_capital:
                max_capital = current_capital
            drawdown = (max_capital - current_capital) / max_capital
            max_drawdown = max(max_drawdown, drawdown)
        
        # Close any remaining position at the end
        if in_position:
            # print(f"  Closing remaining position at end - price: {current_price}")
            # Calculate profit/loss
            pnl = (current_price - entry_price) * position_size
            pnl_pct = (current_price - entry_price) / entry_price  # Tỷ lệ thay đổi giá (0.05 = 5%)
            # Maker fee khi thoát lệnh
            exit_fee = current_price * position_size * self.maker_fee
            
            # Lấy giá trị indicator tại thời điểm bán
            exit_indicators = {}
            for col in signals.columns:
                if col not in ['open', 'high', 'low', 'close', 'volume', 'signal']:
                    # Tìm giá trị indicator hợp lệ gần nhất
                    for j in range(len(signals)-1, -1, -1):
                        if not pd.isna(signals.iloc[j][col]) and signals.iloc[j][col] != 0:
                            exit_indicators[col] = signals.iloc[j][col]
                            break
                    else:
                        exit_indicators[col] = 0
            
            # Tạo trade record với cả entry và exit indicators
            trade_record = {
                'entry_time': entry_time,  # Sử dụng thời gian mua thực tế
                'exit_time': signals.index[-1],  # Last time
                'entry_price': entry_price,
                'exit_price': current_price,
                'size': position_size,
                'pnl': pnl - entry_fee_last_trade - exit_fee,
                'pnl_pct': pnl_pct,
                'type': 'long',
                'exit_reason': 'end_of_backtest',
                'entry_fee': entry_fee_last_trade,
                'exit_fee': exit_fee
            }
            
            # Thêm entry indicators với prefix "entry_"
            for key, value in entry_indicators.items():
                trade_record[f'entry_{key}'] = value
            
            # Thêm exit indicators với prefix "exit_"
            for key, value in exit_indicators.items():
                trade_record[f'exit_{key}'] = value
            
            trades.append(trade_record)
            current_capital += pnl - exit_fee
            total_fee += exit_fee
        
        # Calculate performance metrics
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t['pnl'] > 0])
        losing_trades = total_trades - winning_trades
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        avg_win = np.mean([t['pnl'] for t in trades if t['pnl'] > 0]) if winning_trades > 0 else 0
        avg_loss = np.mean([t['pnl'] for t in trades if t['pnl'] < 0]) if losing_trades > 0 else 0
        
        # Tính toán tỷ lệ lãi net trung bình và tỷ lệ lỗ net trung bình
        avg_win_net = 0
        avg_loss_net = 0
        
        if total_trades > 0:
            # Tính tỷ lệ lợi nhuận cho từng giao dịch
            for trade in trades:
                entry_value = trade['entry_price'] * trade['size']
                net_pnl = trade['pnl']  # Đã trừ phí
                
                # Tính tỷ lệ lợi nhuận NET dựa trên pnl thực tế (đã trừ phí)
                if entry_value > 0:
                    # profit_ratio = (net_pnl / entry_value) * 100
                    # net_pnl đã trừ phí, entry_value = entry_price * size
                    trade['profit_ratio'] = (net_pnl / entry_value) * 100
                else:
                    trade['profit_ratio'] = 0
            
            # Tính tỷ lệ lãi net trung bình = avg tỷ lệ lợi nhuận các giao dịch lãi
            winning_trade_ratios = [t['profit_ratio'] for t in trades if t['pnl'] > 0]
            avg_win_net = np.mean(winning_trade_ratios) if winning_trade_ratios else 0
            
            # Tính tỷ lệ lỗ net trung bình = avg tỷ lệ lợi nhuận các giao dịch lỗ
            losing_trade_ratios = [t['profit_ratio'] for t in trades if t['pnl'] < 0]
            avg_loss_net = np.mean(losing_trade_ratios) if losing_trade_ratios else 0
            
            # Debug: in ra để kiểm tra (commented out to avoid JSON parsing issues)
            # print(f"Debug - Total trades: {total_trades}")
            # print(f"Debug - Winning trades: {winning_trades}")
            # print(f"Debug - Losing trades: {losing_trades}")
            # print(f"Debug - Win rate: {win_rate * 100:.2f}%")
            # print(f"Debug - Avg win net: {avg_win_net:.4f}%")
            # print(f"Debug - Avg loss net: {avg_loss_net:.4f}%")
            
            # In ra chi tiết từng trade để kiểm tra (commented out to avoid JSON parsing issues)
            # print("\n=== DEBUG TRADES ===")
            # for i, trade in enumerate(trades[:5]):  # Chỉ in 5 trades đầu
            #     entry_value = trade['entry_price'] * trade['size']
            #     net_pnl = trade['pnl']
            #     profit_ratio = trade['profit_ratio']
            #     print(f"Trade {i+1}: entry_price={trade['entry_price']:.2f}, exit_price={trade['exit_price']:.2f}, size={trade['size']:.6f}")
            #     print(f"  entry_value={entry_value:.2f}, net_pnl={net_pnl:.4f}, profit_ratio={profit_ratio:.4f}%")
            #     print(f"  pnl_pct={trade['pnl_pct']:.6f}, pnl_pct%={trade['pnl_pct']*100:.4f}%")
            #     print(f"  Check: profit_ratio = ({net_pnl:.4f} / {entry_value:.2f}) * 100 = {profit_ratio:.4f}%")
            #     print("---")
            
            # if len(trades) > 5:
            #     print(f"... và {len(trades)-5} trades khác")
        
        total_return = (current_capital - self.initial_capital) / self.initial_capital * 100
        
        # Calculate Sharpe Ratio (assuming risk-free rate = 0)
        returns = pd.Series(equity).pct_change().dropna()
        sharpe_ratio = np.sqrt(252) * (returns.mean() / returns.std()) if len(returns) > 0 else 0
        
        return {
            'trades': trades,
            'equity_curve': equity,
            'performance': {
                'total_return': total_return,
                'sharpe_ratio': sharpe_ratio,
                'max_drawdown': max_drawdown * 100,
                'total_trades': total_trades,
                'winning_trades': winning_trades,
                'losing_trades': losing_trades,
                'win_rate': win_rate * 100,
                'average_win': avg_win,
                'average_loss': avg_loss,
                'avg_win_net': avg_win_net,
                'avg_loss_net': avg_loss_net,
                'final_capital': current_capital,
                'total_fee': total_fee
            }
        } 