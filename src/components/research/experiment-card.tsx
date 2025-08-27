import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingUp, TrendingDown, BarChart3, Target, Zap } from 'lucide-react';
import { parseExperimentForCard, formatTradingMetrics, TradingMetrics } from '@/lib/research/experiment-utils';

interface ExperimentCardProps {
  experiment: any;
  onViewDetails: (experimentId: string) => void;
}

export function ExperimentCard({ experiment, onViewDetails }: ExperimentCardProps) {
  const cardData = parseExperimentForCard(experiment);
  const formattedMetrics = cardData.tradingMetrics ? formatTradingMetrics(cardData.tradingMetrics) : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'backtest': return <BarChart3 className="w-4 h-4" />;
      case 'hypothesis_test': return <Target className="w-4 h-4" />;
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      case 'monte_carlo': return <Zap className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(cardData.type)}
            <CardTitle className="text-lg font-semibold">{cardData.name}</CardTitle>
          </div>
          <Badge className={getStatusColor(cardData.status)}>
            {cardData.type === 'backtest' ? 'Backtest' : cardData.type}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Tạo lúc: {formatDate(cardData.createdAt)}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Trading Metrics Section */}
        {formattedMetrics && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">📊 Kết quả Trading</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Tổng trades:</span>
                <span className="font-medium">{formattedMetrics.totalTrades}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Win rate:</span>
                <span className="font-medium">{formattedMetrics.winRate}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">Tổng return:</span>
                <span className={`font-medium ${parseFloat(formattedMetrics.totalReturn) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formattedMetrics.totalReturn}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Avg Win:</span>
                <span className="font-medium text-green-600">{formattedMetrics.avgWinNet}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-gray-600">Avg Loss:</span>
                <span className="font-medium text-red-600">{formattedMetrics.avgLossNet}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-600" />
                <span className="text-gray-600">Max DD:</span>
                <span className="font-medium text-orange-600">{formattedMetrics.maxDrawdown}</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {cardData.status === 'running' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Tiến độ</span>
              <span>{cardData.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${cardData.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={() => onViewDetails(cardData.id)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Chi tiết
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
