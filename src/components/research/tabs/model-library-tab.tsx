"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  Search,
  Filter,
  Star,
  Download,
  Eye,
  Copy,
  Play,
  TrendingUp,
  BarChart3,
  Calendar
} from "lucide-react";

export function ModelLibraryTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('performance');

  const models = [
    {
      id: '1',
      name: 'BTC Price Prediction LSTM v2.1',
      description: 'Advanced LSTM model for Bitcoin price prediction with sentiment analysis integration',
      category: 'machine_learning',
      algorithm: 'LSTM',
      performance: {
        accuracy: 0.847,
        sharpeRatio: 1.67,
        maxDrawdown: -8.2,
        winRate: 73.4
      },
      author: 'System',
      createdAt: '2024-01-15',
      downloads: 45,
      rating: 4.8,
      tags: ['Bitcoin', 'LSTM', 'Price Prediction', 'Sentiment'],
      isPublic: true,
      trainingTime: '2.3 hours',
      dataSize: '1M records'
    },
    {
      id: '2',
      name: 'Multi-Asset Momentum Strategy',
      description: 'Random Forest model for momentum trading across multiple cryptocurrencies',
      category: 'machine_learning',
      algorithm: 'Random Forest',
      performance: {
        accuracy: 0.723,
        sharpeRatio: 1.45,
        maxDrawdown: -12.3,
        winRate: 67.8
      },
      author: 'User',
      createdAt: '2024-01-14',
      downloads: 32,
      rating: 4.5,
      tags: ['Multi-Asset', 'Momentum', 'Random Forest'],
      isPublic: true,
      trainingTime: '45 minutes',
      dataSize: '500K records'
    },
    {
      id: '3',
      name: 'ETH GARCH Volatility Model',
      description: 'GARCH model for Ethereum volatility prediction and risk management',
      category: 'statistical',
      algorithm: 'GARCH',
      performance: {
        accuracy: 0.691,
        sharpeRatio: 0.89,
        maxDrawdown: -5.1,
        winRate: 58.9
      },
      author: 'System',
      createdAt: '2024-01-13',
      downloads: 28,
      rating: 4.2,
      tags: ['Ethereum', 'GARCH', 'Volatility', 'Risk Management'],
      isPublic: true,
      trainingTime: '20 minutes',
      dataSize: '200K records'
    },
    {
      id: '4',
      name: 'Black-Scholes Options Pricing',
      description: 'Implementation of Black-Scholes model for cryptocurrency options pricing',
      category: 'financial_math',
      algorithm: 'Black-Scholes',
      performance: {
        accuracy: 0.756,
        sharpeRatio: 1.12,
        maxDrawdown: -15.7,
        winRate: 62.3
      },
      author: 'Community',
      createdAt: '2024-01-10',
      downloads: 67,
      rating: 4.6,
      tags: ['Options', 'Black-Scholes', 'Derivatives'],
      isPublic: true,
      trainingTime: '5 minutes',
      dataSize: '50K records'
    },
    {
      id: '5',
      name: 'DeFi Yield Optimization',
      description: 'Optimization model for maximizing yield in DeFi protocols',
      category: 'machine_learning',
      algorithm: 'Genetic Algorithm',
      performance: {
        accuracy: 0.812,
        sharpeRatio: 2.1,
        maxDrawdown: -6.8,
        winRate: 75.2
      },
      author: 'Community',
      createdAt: '2024-01-08',
      downloads: 89,
      rating: 4.9,
      tags: ['DeFi', 'Yield Farming', 'Optimization'],
      isPublic: false,
      trainingTime: '1.5 hours',
      dataSize: '300K records'
    }
  ];

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || model.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const sortedModels = [...filteredModels].sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return b.performance.sharpeRatio - a.performance.sharpeRatio;
      case 'popularity':
        return b.downloads - a.downloads;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'machine_learning':
        return <Brain className="h-4 w-4" />;
      case 'statistical':
        return <BarChart3 className="h-4 w-4" />;
      case 'financial_math':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'machine_learning':
        return 'Machine Learning';
      case 'statistical':
        return 'Statistical';
      case 'financial_math':
        return 'Financial Math';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Thư viện mô hình</h3>
          <p className="text-sm text-muted-foreground">
            Khám phá và sử dụng các mô hình định lượng có sẵn
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm mô hình..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Loại mô hình" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="machine_learning">Machine Learning</SelectItem>
              <SelectItem value="statistical">Statistical</SelectItem>
              <SelectItem value="financial_math">Financial Math</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Hiệu suất</SelectItem>
              <SelectItem value="popularity">Phổ biến</SelectItem>
              <SelectItem value="rating">Đánh giá</SelectItem>
              <SelectItem value="newest">Mới nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedModels.map((model) => (
          <Card key={model.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(model.category)}
                  <Badge variant="outline" className="text-xs">
                    {getCategoryName(model.category)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{model.rating}</span>
                </div>
              </div>
              
              <div>
                <CardTitle className="text-sm leading-tight">{model.name}</CardTitle>
                <CardDescription className="text-xs mt-1 line-clamp-2">
                  {model.description}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Accuracy</div>
                  <div className="font-medium">{(model.performance.accuracy * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sharpe Ratio</div>
                  <div className="font-medium">{model.performance.sharpeRatio}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Max Drawdown</div>
                  <div className="font-medium text-red-600">{model.performance.maxDrawdown}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Win Rate</div>
                  <div className="font-medium">{model.performance.winRate}%</div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {model.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {model.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{model.tags.length - 3}
                  </Badge>
                )}
              </div>

              {/* Meta Information */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Tác giả:</span>
                  <span>{model.author}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian train:</span>
                  <span>{model.trainingTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Downloads:</span>
                  <span>{model.downloads}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2">
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    Xem
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Clone
                  </Button>
                </div>
                
                <div className="flex space-x-1">
                  {model.isPublic && (
                    <Button variant="ghost" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Tải
                    </Button>
                  )}
                  <Button size="sm">
                    <Play className="h-3 w-3 mr-1" />
                    Dùng
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {sortedModels.length === 0 && (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Không tìm thấy mô hình</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Thử thay đổi tiêu chí tìm kiếm hoặc bộ lọc
          </p>
        </div>
      )}

      {/* Upload Model Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Chia sẻ mô hình của bạn</CardTitle>
          <CardDescription>
            Đóng góp mô hình của bạn cho cộng đồng và nhận feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Chia sẻ các mô hình xuất sắc để giúp cộng đồng phát triển
            </div>
            <Button>
              Upload mô hình
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 