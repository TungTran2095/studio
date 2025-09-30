"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SignalDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signal: any;
}

export function SignalDetailModal({ open, onOpenChange, signal }: SignalDetailModalProps) {
  if (!signal) return null;

  const renderSignalDetails = (details: any, strategy: string) => {
    switch (strategy.toLowerCase()) {
      case 'ichimoku':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Tenkan-sen</div>
                <div className="font-mono text-lg">${details.tenkanSen?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Kijun-sen</div>
                <div className="font-mono text-lg">${details.kijunSen?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Senkou Span A</div>
                <div className="font-mono text-lg">${details.senkouSpanA?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Senkou Span B</div>
                <div className="font-mono text-lg">${details.senkouSpanB?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Chikou Span</div>
                <div className="font-mono text-lg">${details.chikouSpan?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Giá hiện tại</div>
                <div className="font-mono text-lg">${details.currentPrice?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Trạng thái:</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={details.priceAboveCloud ? 'default' : 'secondary'}>
                  {details.priceAboveCloud ? 'Giá trên mây' : 'Giá dưới mây'}
                </Badge>
                <Badge variant={details.tenkanAboveKijun ? 'default' : 'secondary'}>
                  {details.tenkanAboveKijun ? 'Tenkan > Kijun' : 'Tenkan < Kijun'}
                </Badge>
              </div>
            </div>
          </div>
        );

      case 'ma_crossover':
      case 'ma_cross':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Fast MA</div>
                <div className="font-mono text-lg">${details.fastMA?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Slow MA</div>
                <div className="font-mono text-lg">${details.slowMA?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>
            
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">Giá hiện tại</div>
              <div className="font-mono text-lg">${details.currentPrice?.toFixed(2) || 'N/A'}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Trạng thái:</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={details.fastAboveSlow ? 'default' : 'secondary'}>
                  {details.fastAboveSlow ? 'Fast > Slow' : 'Fast < Slow'}
                </Badge>
                <Badge variant="outline">
                  Spread: ${details.maSpread?.toFixed(2) || 'N/A'}
                </Badge>
              </div>
            </div>
          </div>
        );

      case 'rsi':
        return (
          <div className="space-y-3">
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">RSI</div>
              <div className="font-mono text-lg">{details.rsi?.toFixed(2) || 'N/A'}</div>
            </div>
            
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">Giá hiện tại</div>
              <div className="font-mono text-lg">${details.currentPrice?.toFixed(2) || 'N/A'}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Trạng thái:</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={details.overbought ? 'destructive' : 'secondary'}>
                  {details.overbought ? 'Overbought' : 'Not Overbought'}
                </Badge>
                <Badge variant={details.oversold ? 'default' : 'secondary'}>
                  {details.oversold ? 'Oversold' : 'Not Oversold'}
                </Badge>
                <Badge variant={details.neutral ? 'outline' : 'secondary'}>
                  {details.neutral ? 'Neutral' : 'Not Neutral'}
                </Badge>
              </div>
            </div>
          </div>
        );

      case 'bollinger_bands':
      case 'bollinger':
      case 'bb':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">SMA</div>
                <div className="font-mono text-lg">${details.sma?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Giá hiện tại</div>
                <div className="font-mono text-lg">${details.currentPrice?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Upper Band</div>
                <div className="font-mono text-lg">${details.upperBand?.toFixed(2) || 'N/A'}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Lower Band</div>
                <div className="font-mono text-lg">${details.lowerBand?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Trạng thái:</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={details.priceAboveUpper ? 'destructive' : 'secondary'}>
                  {details.priceAboveUpper ? 'Giá trên Upper Band' : 'Giá dưới Upper Band'}
                </Badge>
                <Badge variant={details.priceBelowLower ? 'default' : 'secondary'}>
                  {details.priceBelowLower ? 'Giá dưới Lower Band' : 'Giá trên Lower Band'}
                </Badge>
                <Badge variant={details.priceInMiddle ? 'outline' : 'secondary'}>
                  {details.priceInMiddle ? 'Giá trong Band' : 'Giá ngoài Band'}
                </Badge>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 border rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết Signal</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">Thời gian</div>
              <div className="font-medium">
                {new Date(signal.timestamp).toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">Signal</div>
              <Badge 
                variant={signal.signal === 'buy' ? 'default' : signal.signal === 'sell' ? 'destructive' : 'secondary'}
                className={
                  signal.signal === 'buy' ? 'bg-green-600' : 
                  signal.signal === 'sell' ? 'bg-red-600' : 
                  'bg-gray-500'
                }
              >
                {signal.action}
              </Badge>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">Giá</div>
              <div className="font-mono text-lg">${signal.price?.toFixed(2) || 'N/A'}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">Strategy</div>
              <Badge variant="outline">
                {signal.strategy?.toUpperCase() || 'N/A'}
              </Badge>
            </div>
          </div>

          {/* Chi tiết strategy */}
          {signal.details && (
            <div>
              <div className="text-sm font-medium mb-3">Chi tiết Strategy:</div>
              {renderSignalDetails(signal.details, signal.strategy)}
            </div>
          )}

          {/* Parameters */}
          {signal.parameters && (
            <div>
              <div className="text-sm font-medium mb-3">Tham số:</div>
              <div className="p-3 border rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(signal.parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
