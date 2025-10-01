import os
import sys
import json
import argparse
from datetime import datetime
import pandas as pd

# Reuse existing loaders/strategies
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from backtest_runner import load_data  # type: ignore
from ichimoku_strategy import IchimokuStrategy  # type: ignore


def run_ichimoku_single(symbol: str, timeframe: str, start_date: str, end_date: str, config_overrides: dict | None = None):
    # Load data via the same path as normal backtests (Supabase + resample)
    df = load_data(symbol, timeframe, start_date, end_date)

    # Build minimal config compatible with strategy
    cfg = {
        'trading': {
            'symbol': symbol,
            'timeframe': timeframe,
            'startDate': start_date,
            'endDate': end_date,
        },
        'strategy': {
            'type': 'ichimoku',
        }
    }
    if config_overrides:
        cfg['strategy'].update(config_overrides)

    strategy = IchimokuStrategy(cfg)
    results = strategy.run_backtest(df)
    return results


def aggregate_results(per_tf: list[dict]):
    # Simple aggregation across TF: average metrics and sum trades
    total_trades = sum(x.get('performance', {}).get('total_trades', len(x.get('trades', []))) for x in per_tf)
    # Prefer keys from first
    agg = {
        'total_trades': total_trades,
        'winrate': 0.0,
        'sharpe': 0.0,
        'pnl': 0.0,
        'maxDrawdown': 0.0,
    }
    n = 0
    wrs, sh, pnl, mdd = [], [], [], []
    for x in per_tf:
        perf = x.get('performance', {})
        if 'winrate' in perf: wrs.append(perf['winrate'])
        if 'sharpe' in perf: sh.append(perf['sharpe'])
        if 'total_pnl' in perf: pnl.append(perf['total_pnl'])
        if 'max_drawdown' in perf: mdd.append(perf['max_drawdown'])
    if wrs:
        agg['winrate'] = sum(wrs)/len(wrs)
    if sh:
        agg['sharpe'] = sum(sh)/len(sh)
    if pnl:
        agg['pnl'] = sum(pnl)
    if mdd:
        agg['maxDrawdown'] = max(mdd)
    return agg


def main():
    parser = argparse.ArgumentParser(description='MTF backtest runner (Ichimoku)')
    parser.add_argument('--symbol', type=str, required=True)
    parser.add_argument('--timeframes', type=str, default='5m,15m,30m,1h')
    parser.add_argument('--start_date', type=str, required=False)
    parser.add_argument('--end_date', type=str, required=False)
    parser.add_argument('--config_overrides', type=str, required=False, help='JSON for strategy overrides')
    args = parser.parse_args()

    symbol = args.symbol.upper()
    timeframes = [t.strip() for t in args.timeframes.split(',') if t.strip()]
    start_date = args.start_date or '2023-01-01'
    end_date = args.end_date or datetime.utcnow().strftime('%Y-%m-%d')
    overrides = json.loads(args.config_overrides) if args.config_overrides else None

    results = []
    for tf in timeframes:
        try:
            r = run_ichimoku_single(symbol, tf, start_date, end_date, overrides)
            perf = r.get('performance', {})
            results.append({
                'timeframe': tf,
                'performance': perf,
                'trades_count': perf.get('total_trades', len(r.get('trades', [])))
            })
        except Exception as e:
            results.append({'timeframe': tf, 'error': str(e)})

    agg = aggregate_results(results)
    print(json.dumps({'success': True, 'symbol': symbol, 'timeframes': timeframes, 'aggregate': agg, 'results': results}))


if __name__ == '__main__':
    main()







