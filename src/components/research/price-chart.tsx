import { useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PriceChartProps {
  symbol: string;
  timeframe: string;
  data: OHLCV[];
}

export function PriceChart({ symbol, timeframe, data }: PriceChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const options: Highcharts.Options = {
    chart: {
      type: 'line',
      height: 400
    },
    title: {
      text: `${symbol} ${timeframe}`
    },
    xAxis: {
      type: 'datetime',
      labels: {
        format: '{value:%Y-%m-%d %H:%M}'
      }
    },
    yAxis: {
      title: {
        text: 'Price'
      },
      labels: {
        format: '{value:.2f}'
      }
    },
    tooltip: {
      xDateFormat: '%Y-%m-%d %H:%M',
      pointFormat: 'Close: {point.y:.2f}'
    },
    plotOptions: {
      line: {
        color: '#22c55e',
        lineWidth: 2
      }
    },
    accessibility: {
      enabled: false
    },
    series: [{
      type: 'line',
      name: symbol,
      data: data.map(candle => [
        candle.timestamp,
        candle.close
      ])
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