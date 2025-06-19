import { useEffect, useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  symbol: string;
  timeframe: string;
  data: OHLCV[];
}

export function PriceChart({ symbol, timeframe, data }: PriceChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Format time based on timeframe
  const getTimeFormat = (timeframe: string) => {
    switch (timeframe) {
      case '1d':
        return '%Y-%m-%d';
      case '1h':
      case '2h':
      case '4h':
      case '6h':
      case '8h':
      case '12h':
        return '%Y-%m-%d %H:00';
      default:
        return '%Y-%m-%d %H:%M';
    }
  };

  const options: Highcharts.Options = {
    chart: {
      type: 'candlestick',
      height: 400,
      backgroundColor: 'transparent'
    },
    title: {
      text: `${symbol} ${timeframe}`,
      style: {
        color: '#888888'
      }
    },
    rangeSelector: {
      enabled: false
    },
    navigator: {
      enabled: false
    },
    scrollbar: {
      enabled: false
    },
    xAxis: {
      type: 'datetime',
      labels: {
        format: getTimeFormat(timeframe),
        style: {
          color: '#888888'
        }
      },
      lineColor: '#2e2e2e',
      tickColor: '#2e2e2e'
    },
    yAxis: [{
      title: {
        text: 'Price',
        style: {
          color: '#888888'
        }
      },
      labels: {
        align: 'right',
        format: '{value:.2f}',
        style: {
          color: '#888888'
        }
      },
      lineColor: '#2e2e2e',
      tickColor: '#2e2e2e',
      height: '60%'
    }, {
      title: {
        text: 'Volume',
        style: {
          color: '#888888'
        }
      },
      labels: {
        align: 'right',
        style: {
          color: '#888888'
        }
      },
      top: '65%',
      height: '35%',
      offset: 0,
      lineColor: '#2e2e2e',
      tickColor: '#2e2e2e'
    }],
    tooltip: {
      split: true,
      xDateFormat: getTimeFormat(timeframe),
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: {
        color: '#ffffff'
      }
    },
    plotOptions: {
      candlestick: {
        color: '#ef4444',
        upColor: '#22c55e',
        lineColor: '#ef4444',
        upLineColor: '#22c55e'
      },
      column: {
        color: 'rgba(136, 136, 136, 0.5)'
      }
    },
    series: [{
      type: 'candlestick',
      name: symbol,
      data: data.map(candle => [
        candle.timestamp,
        candle.open,
        candle.high,
        candle.low,
        candle.close
      ]),
      tooltip: {
        pointFormat: '<b>Open:</b> {point.open:.2f}<br/>' +
                    '<b>High:</b> {point.high:.2f}<br/>' +
                    '<b>Low:</b> {point.low:.2f}<br/>' +
                    '<b>Close:</b> {point.close:.2f}<br/>'
      }
    }, {
      type: 'column',
      name: 'Volume',
      data: data.map(candle => [
        candle.timestamp,
        candle.volume
      ]),
      yAxis: 1,
      tooltip: {
        pointFormat: '<b>Volume:</b> {point.y:.2f}<br/>'
      }
    }]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biểu đồ giá</CardTitle>
        <CardDescription>
          Dữ liệu giá {symbol} {timeframe}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div id="price-chart">
          <HighchartsReact
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={options}
            ref={chartRef}
          />
        </div>
        {data.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Dữ liệu đã tải: {data.length} nến
          </p>
        )}
      </CardContent>
    </Card>
  );
} 