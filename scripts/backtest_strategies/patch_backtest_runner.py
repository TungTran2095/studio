import pandas as pd
import numpy as np
import json
import argparse
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
from decimal import Decimal

# Import strategies
from rsi_strategy import RSIStrategy
from ma_crossover_strategy import MACrossoverStrategy  
from macd_strategy import MACDStrategy
from bollinger_bands_strategy import BollingerBandsStrategy
from breakout_strategy import BreakoutStrategy
from stochastic_strategy import StochasticStrategy
from williams_r_strategy import WilliamsRStrategy
from adx_strategy import ADXStrategy
from ichimoku_strategy import IchimokuStrategy
from parabolic_sar_strategy import ParabolicSARStrategy
from keltner_channel_strategy import KeltnerChannelStrategy
from vwap_strategy import VWAPStrategy

def convert_datetime_to_string(obj):
    """Convert datetime objects to string for JSON serialization"""
    if isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat()
    elif isinstance(obj, np.datetime64):
        return pd.Timestamp(obj).isoformat()
    elif isinstance(obj, (np.integer, np.floating)):
        # Handle NaN values
        if np.isnan(obj):
            return None
        return obj.item()
    elif isinstance(obj, np.ndarray):
        # Handle NaN values in arrays
        result = []
        for x in obj.tolist():
            if isinstance(x, (np.floating, float)) and np.isnan(x):
                result.append(None)
            elif hasattr(x, 'item'):
                result.append(x.item())
            else:
                result.append(convert_datetime_to_string(x))
        return result
    elif isinstance(obj, dict):
        return {k: convert_datetime_to_string(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_string(item) for item in obj]
    elif isinstance(obj, float) and np.isnan(obj):
        # Handle regular Python float NaN
        return None
    return obj

def load_patch_data(start_date: str, end_date: str, symbol: str = 'BTC', timeframe: str = '1h', 
                    supabase_url: str = None, supabase_key: str = None) -> pd.DataFrame:
    """
    Load data cho một patch cụ thể từ Supabase - giống như backtest bình thường
    """
    try:
        from supabase import create_client, Client
        
        # Supabase config - từ arguments hoặc env vars
        if supabase_url and supabase_key:
            url = supabase_url
            key = supabase_key
        else:
            url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
            
        supabase: Client = create_client(url, key)
        
        # Chỉ dùng bảng 1m như backtest bình thường
        table_name = "OHLCV_BTC_USDT_1m"
        
        # Query data cho patch
        response = supabase.table(table_name).select('*').gte('open_time', start_date).lte('open_time', end_date).order('open_time', desc=False).execute()
        
        if not response.data:
            raise ValueError(f"No data found for period {start_date} to {end_date} in {table_name}")
            
        # Convert to DataFrame
        df = pd.DataFrame(response.data)
        
        # Rename columns to match expected format
        df = df.rename(columns={
            'open_price': 'open',
            'high_price': 'high', 
            'low_price': 'low',
            'close_price': 'close',
            'volume': 'volume'
        })
        
        # Convert to float
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)
            
        # Set datetime index
        df['open_time'] = pd.to_datetime(df['open_time'])
        df = df.set_index('open_time')
        
        # Resample data theo timeframe - giống như backtest bình thường
        if timeframe != '1m':  # Nếu không phải 1 phút thì cần resample
            # Map timeframe to pandas offset string
            timeframe_map = {
                '1m': '1T',
                '3m': '3T',
                '5m': '5T',
                '15m': '15T',
                '30m': '30T',
                '1h': 'H',
                '2h': '2H',
                '4h': '4H',
                '6h': '6H',
                '8h': '8H',
                '12h': '12H',
                '1d': 'D',
                '3d': '3D',
                '1w': 'W',
                '1M': 'M'
            }
            
            rule = timeframe_map.get(timeframe)
            if not rule:
                raise ValueError(f"Invalid timeframe: {timeframe}")
            
            # Resample OHLCV data
            df = df.resample(rule).agg({
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last',
                'volume': 'sum'
            }).dropna()
        
        return df
        
    except Exception as e:
        # Don't print error to avoid JSON parsing issues
        return None

def generate_patches(start_date: str, end_date: str, days_per_patch: int) -> List[Dict[str, str]]:
    """
    Generate patches từ start_date đến end_date
    """
    patches = []
    current_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    while current_start < end:
        current_end = current_start + timedelta(days=days_per_patch)
        if current_end > end:
            current_end = end
            
        patches.append({
            'startDate': current_start.isoformat(),
            'endDate': current_end.isoformat()
        })
        
        current_start = current_end
        
    return patches

def run_patch_backtest_with_strategy(patch_data: pd.DataFrame, config: Dict[str, Any], initial_capital: float) -> Dict[str, Any]:
    """
    Chạy backtest cho một patch sử dụng strategy classes
    """
    # Strategy mapping
    strategy_map = {
        'ma_crossover': MACrossoverStrategy,
        'rsi': RSIStrategy,
        'macd': MACDStrategy,
        'bollinger_bands': BollingerBandsStrategy,
        'breakout': BreakoutStrategy,
        'stochastic': StochasticStrategy,
        'williams_r': WilliamsRStrategy,
        'adx': ADXStrategy,
        'ichimoku': IchimokuStrategy,
        'parabolic_sar': ParabolicSARStrategy,
        'keltner_channel': KeltnerChannelStrategy,
        'vwap': VWAPStrategy
    }
    
    # Get strategy class
    strategy_type = config.get('strategyType', config.get('strategy', {}).get('type', 'rsi'))
    if strategy_type not in strategy_map:
        raise ValueError(f"Strategy type '{strategy_type}' not supported")
        
    StrategyClass = strategy_map[strategy_type]
    
    # Prepare config for strategy class
    strategy_config = {
        'trading': {
            'symbol': config.get('symbol', 'BTCUSDT'),
            'timeframe': config.get('timeframe', '1h'),  # Sử dụng timeframe từ config
            'initialCapital': initial_capital,
            'positionSize': config.get('positionSize', 1.0),
            'maker_fee': config.get('maker_fee', 0.1),
            'taker_fee': config.get('taker_fee', 0.1)
        },
        'riskManagement': {
            'stopLoss': config.get('stopLoss', 2.0),  # Sử dụng từ config
            'takeProfit': config.get('takeProfit', 4.0),  # Sử dụng từ config
            'maxPositions': 1,
            'maxDrawdown': 10.0,
            'trailingStop': config.get('trailingStop', True),  # Sử dụng từ config
            'trailingStopDistance': config.get('trailingStopDistance', 1.0),
            'prioritizeStoploss': config.get('prioritizeStoploss', True),  # Sử dụng từ config
            'useTakeProfit': config.get('useTakeProfit', True)  # Sử dụng từ config
        },
        'strategy': {
            'type': strategy_type,
            'parameters': {
                # RSI parameters
                'period': config.get('rsiPeriod', 14),
                'overbought': config.get('overbought', 70),
                'oversold': config.get('oversold', 30),
                # MA Crossover parameters
                'fastPeriod': config.get('fastPeriod', 10),
                'slowPeriod': config.get('slowPeriod', 20),
                # MACD parameters
                'fastEMA': config.get('fastEMA', 12),
                'slowEMA': config.get('slowEMA', 26),
                'signalPeriod': config.get('signalPeriod', 9),
                # Bollinger Bands parameters
                'bbPeriod': config.get('bbPeriod', 20),
                'bbStdDev': config.get('bbStdDev', 2),
                # Breakout parameters
                'channelPeriod': config.get('channelPeriod', 20),
                'multiplier': config.get('multiplier', 2),
                # Stochastic parameters
                'k_period': config.get('stochasticKPeriod', 14),
                'd_period': config.get('stochasticDPeriod', 3),
                'smooth_k': config.get('stochasticSmoothPeriod', 3),
                'smooth_d': config.get('stochasticSmoothPeriod', 3),
                # Williams %R parameters
                'period': config.get('williamsRPeriod', 14),
                'oversold': config.get('williamsROversold', -80),
                # ADX parameters
                'adx_period': config.get('adxPeriod', 14),
                'adx_threshold': config.get('adxThreshold', 25),
                # Ichimoku parameters
                'tenkan_period': config.get('ichimokuTenkan', 9),
                'kijun_period': config.get('ichimokuKijun', 26),
                # Parabolic SAR parameters
                'acceleration': config.get('parabolicSARAcceleration', 0.02),
                'maximum': config.get('parabolicSARMaxAcceleration', 0.2),
                # Keltner Channel parameters
                'ema_period': config.get('keltnerChannelPeriod', 20),
                'atr_period': config.get('keltnerChannelPeriod', 10),
                'multiplier': config.get('keltnerChannelMultiplier', 2.0),
                # VWAP parameters
                'vwap_period': config.get('vwapPeriod', 20),
                'std_dev_multiplier': config.get('vwapStdDev', 2.0)
            }
        }
    }
    
    # Initialize strategy
    strategy = StrategyClass(strategy_config)
    
    # Run backtest
    results = strategy.run_backtest(patch_data)
    
    # Extract indicators data
    indicators_data = extract_indicators_data(strategy, patch_data, strategy_type)
    
    # Return formatted results - clean up all datetime objects
    result = {
        'initialCapital': initial_capital,
        'finalCapital': results['performance']['final_capital'],
        'totalReturn': results['performance']['total_return'],
        'totalTrades': len(results['trades']),
        'winRate': results['performance']['win_rate'],
        'avgWin': results['performance']['average_win'],
        'avgLoss': results['performance']['average_loss'], 
        'maxDrawdown': results['performance']['max_drawdown'],
        'sharpeRatio': results['performance'].get('sharpe_ratio', 0),
        'trades': results['trades'],
        'indicators': indicators_data
    }
    
    # Clean up all datetime objects in the entire result
    return convert_datetime_to_string(result)

def aggregate_patch_results(patch_results: List[Dict[str, Any]], initial_capital: float) -> Dict[str, Any]:
    """
    Tổng hợp kết quả từ các patches
    """
    if not patch_results:
        return {
            'initialCapital': initial_capital,
            'finalCapital': initial_capital,
            'totalReturn': 0,
            'totalTrades': 0,
            'winRate': 0,
            'avgWin': 0,
            'avgLoss': 0,
            'maxDrawdown': 0,
            'sharpeRatio': 0
        }
    
    # Aggregate metrics
    final_capital = patch_results[-1]['finalCapital'] if patch_results else initial_capital
    total_return = ((final_capital - initial_capital) / initial_capital) * 100
    total_trades = sum(r['totalTrades'] for r in patch_results)
    
    # Calculate overall win rate
    all_trades = []
    for patch in patch_results:
        all_trades.extend(patch.get('trades', []))
    
    if all_trades:
        winning_trades = [t for t in all_trades if t.get('pnl', 0) > 0]
        win_rate = len(winning_trades) / len(all_trades) * 100
        
        if winning_trades:
            avg_win = sum(t['pnl'] for t in winning_trades) / len(winning_trades)
        else:
            avg_win = 0
            
        losing_trades = [t for t in all_trades if t.get('pnl', 0) < 0]
        if losing_trades:
            avg_loss = sum(t['pnl'] for t in losing_trades) / len(losing_trades)
        else:
            avg_loss = 0
    else:
        win_rate = 0
        avg_win = 0
        avg_loss = 0
    
    # Max drawdown across all patches
    max_drawdown = max((r.get('maxDrawdown', 0) for r in patch_results), default=0)
    
    result = {
        'initialCapital': initial_capital,
        'finalCapital': final_capital,
        'totalReturn': total_return,
        'totalTrades': total_trades,
        'winRate': win_rate,
        'avgWin': avg_win,
        'avgLoss': avg_loss,
        'maxDrawdown': max_drawdown,
        'sharpeRatio': 0  # Calculate if needed
    }
    
    # Clean up datetime objects
    return convert_datetime_to_string(result)

def extract_indicators_data(strategy, patch_data: pd.DataFrame, strategy_type: str) -> Dict[str, Any]:
    """
    Extract indicators data for chart display
    """
    try:
        # Generate signals to get indicators
        signals_data = strategy.generate_signals(patch_data)
        
        # Convert timestamps to milliseconds
        timestamps = (signals_data.index.astype(np.int64) // 10**6).tolist()
        close_prices = signals_data['close'].tolist()
        
        indicators = {
            'timestamps': timestamps,
            'close_prices': close_prices,
            'indicators': {}
        }
        
        # Extract indicators based on strategy type
        if strategy_type == 'rsi':
            if 'rsi' in signals_data.columns:
                indicators['indicators']['rsi'] = signals_data['rsi'].tolist()
                
        elif strategy_type == 'ma_crossover':
            if 'fast_ma' in signals_data.columns:
                indicators['indicators']['fast_ma'] = signals_data['fast_ma'].tolist()
            if 'slow_ma' in signals_data.columns:
                indicators['indicators']['slow_ma'] = signals_data['slow_ma'].tolist()
                
        elif strategy_type == 'macd':
            if 'macd' in signals_data.columns:
                indicators['indicators']['macd'] = signals_data['macd'].tolist()
            if 'signal_line' in signals_data.columns:
                indicators['indicators']['signal_line'] = signals_data['signal_line'].tolist()
            if 'histogram' in signals_data.columns:
                indicators['indicators']['histogram'] = signals_data['histogram'].tolist()
                
        elif strategy_type == 'bollinger_bands':
            if 'upper' in signals_data.columns:
                indicators['indicators']['upper'] = signals_data['upper'].tolist()
            if 'middle' in signals_data.columns:
                indicators['indicators']['middle'] = signals_data['middle'].tolist()
            if 'lower' in signals_data.columns:
                indicators['indicators']['lower'] = signals_data['lower'].tolist()
                
        elif strategy_type == 'breakout':
            if 'upper_channel' in signals_data.columns:
                indicators['indicators']['upper_channel'] = signals_data['upper_channel'].tolist()
            if 'lower_channel' in signals_data.columns:
                indicators['indicators']['lower_channel'] = signals_data['lower_channel'].tolist()
                
        elif strategy_type == 'stochastic':
            if 'stoch_k' in signals_data.columns:
                indicators['indicators']['stoch_k'] = signals_data['stoch_k'].tolist()
            if 'stoch_d' in signals_data.columns:
                indicators['indicators']['stoch_d'] = signals_data['stoch_d'].tolist()
                
        elif strategy_type == 'williams_r':
            if 'williams_r' in signals_data.columns:
                indicators['indicators']['williams_r'] = signals_data['williams_r'].tolist()
                
        elif strategy_type == 'adx':
            if 'adx' in signals_data.columns:
                indicators['indicators']['adx'] = signals_data['adx'].tolist()
            if 'di_plus' in signals_data.columns:
                indicators['indicators']['di_plus'] = signals_data['di_plus'].tolist()
            if 'di_minus' in signals_data.columns:
                indicators['indicators']['di_minus'] = signals_data['di_minus'].tolist()
                
        elif strategy_type == 'ichimoku':
            if 'tenkan' in signals_data.columns:
                indicators['indicators']['tenkan'] = signals_data['tenkan'].tolist()
            if 'kijun' in signals_data.columns:
                indicators['indicators']['kijun'] = signals_data['kijun'].tolist()
            if 'senkou_span_a' in signals_data.columns:
                indicators['indicators']['senkou_span_a'] = signals_data['senkou_span_a'].tolist()
            if 'senkou_span_b' in signals_data.columns:
                indicators['indicators']['senkou_span_b'] = signals_data['senkou_span_b'].tolist()
            if 'chikou' in signals_data.columns:
                indicators['indicators']['chikou'] = signals_data['chikou'].tolist()
                
        elif strategy_type == 'parabolic_sar':
            if 'parabolic_sar' in signals_data.columns:
                indicators['indicators']['parabolic_sar'] = signals_data['parabolic_sar'].tolist()
            if 'trend' in signals_data.columns:
                indicators['indicators']['trend'] = signals_data['trend'].tolist()
                
        elif strategy_type == 'keltner_channel':
            if 'keltner_ema' in signals_data.columns:
                indicators['indicators']['keltner_ema'] = signals_data['keltner_ema'].tolist()
            if 'keltner_upper' in signals_data.columns:
                indicators['indicators']['keltner_upper'] = signals_data['keltner_upper'].tolist()
            if 'keltner_lower' in signals_data.columns:
                indicators['indicators']['keltner_lower'] = signals_data['keltner_lower'].tolist()
            if 'keltner_atr' in signals_data.columns:
                indicators['indicators']['keltner_atr'] = signals_data['keltner_atr'].tolist()
                
        elif strategy_type == 'vwap':
            if 'vwap' in signals_data.columns:
                indicators['indicators']['vwap'] = signals_data['vwap'].tolist()
            if 'vwap_upper' in signals_data.columns:
                indicators['indicators']['vwap_upper'] = signals_data['vwap_upper'].tolist()
            if 'vwap_lower' in signals_data.columns:
                indicators['indicators']['vwap_lower'] = signals_data['vwap_lower'].tolist()
            if 'vwap_std' in signals_data.columns:
                indicators['indicators']['vwap_std'] = signals_data['vwap_std'].tolist()
        
        return indicators
        
    except Exception as e:
        return {
            'timestamps': [],
            'close_prices': [],
            'indicators': {}
        }

def main():
    parser = argparse.ArgumentParser(description='Patch Backtest Runner')
    parser.add_argument('--experiment_id', required=True, help='Experiment ID')
    parser.add_argument('--config', required=True, help='Configuration JSON')
    parser.add_argument('--supabase_url', required=False, help='Supabase URL')
    parser.add_argument('--supabase_key', required=False, help='Supabase Service Role Key')
    
    args = parser.parse_args()
    
    try:
        # Parse config
        config = json.loads(args.config)
        
        # Extract parameters
        start_date = config.get('startDate')
        end_date = config.get('endDate')
        patch_days = config.get('patchDays', 30)
        initial_capital = float(config.get('initialCapital', 10000))
        
        # Generate patches
        patches = generate_patches(start_date, end_date, patch_days)
        
        # Run backtest for each patch
        patch_results = []
        current_capital = initial_capital
        all_trades = []
        all_indicators = {
            'timestamps': [],
            'close_prices': [],
            'indicators': {}
        }
        
        for i, patch in enumerate(patches):
            # Load data for this patch
            patch_data = load_patch_data(
                patch['startDate'], 
                patch['endDate'],
                config.get('symbol', 'BTC'),
                config.get('timeframe', '1h'),
                args.supabase_url,
                args.supabase_key
            )
            
            if patch_data is None:
                # Log the issue for debugging
                error_info = f"No data loaded for patch {i+1}: {patch['startDate']} to {patch['endDate']}"
                continue
                
            if len(patch_data) == 0:
                # Log the issue for debugging  
                error_info = f"Empty data for patch {i+1}: {patch['startDate']} to {patch['endDate']}"
                continue
            
            # Run backtest for this patch
            patch_result = run_patch_backtest_with_strategy(patch_data, config, current_capital)
            patch_results.append(patch_result)
            
            # Aggregate trades
            all_trades.extend(patch_result.get('trades', []))
            
            # Aggregate indicators
            patch_indicators = patch_result.get('indicators', {})
            if patch_indicators.get('timestamps'):
                all_indicators['timestamps'].extend(patch_indicators['timestamps'])
                all_indicators['close_prices'].extend(patch_indicators['close_prices'])
                
                # Merge indicators
                for indicator_name, values in patch_indicators.get('indicators', {}).items():
                    if indicator_name not in all_indicators['indicators']:
                        all_indicators['indicators'][indicator_name] = []
                    all_indicators['indicators'][indicator_name].extend(values)
            
            # Rebalance: update capital for next patch
            current_capital = patch_result['finalCapital']
        
        # Aggregate results
        total_results = aggregate_patch_results(patch_results, initial_capital)
        
        # Output results with trades and indicators
        results = {
            'success': True,
            'results': total_results,
            'patches': patch_results,
            'trades': all_trades,  # All trades from all patches
            'indicators': all_indicators,  # All indicators from all patches
            'experiment_id': args.experiment_id
        }
        
        # Clean up datetime objects before JSON serialization
        clean_results = convert_datetime_to_string(results)
        
        # Output JSON to stdout with NaN handling
        json_output = json.dumps(clean_results, allow_nan=False, default=str)
        print(json_output)
        
    except Exception as e:
        import traceback
        
        error_result = {
            'success': False,
            'error': str(e),
            'experiment_id': args.experiment_id
        }
        clean_error = convert_datetime_to_string(error_result)
        print(json.dumps(clean_error, allow_nan=False, default=str))
        sys.exit(1)

if __name__ == "__main__":
    main() 