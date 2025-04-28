// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from "react";
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit } from 'lucide-react'; // Import icons
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const AnalysisPanel: FC<AnalysisPanelProps> = ({ isExpanded, onToggle }) => {
  return (
    <Card className={cn(
      "flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out border border-border shadow-md bg-card"
    )}>
      {/* Header with Title and Toggle Button */}
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className={cn(
          "text-lg font-medium text-foreground transition-opacity duration-300 ease-in-out",
          !isExpanded && "opacity-0 w-0 overflow-hidden" // Hide title when collapsed
        )}>
          Analysis Tools
        </CardTitle>
         {/* Toggle Button - Always visible */}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground flex-shrink-0">
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Analysis Panel</span>
        </Button>
      </CardHeader>

     {/* Content Area - Only visible when expanded */}
      <CardContent className={cn(
        "flex-1 p-3 overflow-hidden flex flex-col gap-4 transition-opacity duration-300 ease-in-out",
        !isExpanded && "opacity-0 p-0" // Hide content when collapsed
      )}>
        {isExpanded && (
          <ScrollArea className="h-full">
            <div className="space-y-4">
                {/* Placeholder Section 1: Ensemble Learning */}
                <div>
                    <h4 className="text-md font-semibold mb-2 text-foreground flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        Ensemble Learning
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        Configure and run ensemble learning models. (Placeholder)
                    </p>
                    {/* Add more UI elements here later */}
                    <Button size="sm" variant="outline" className="mt-2 text-xs" disabled>Configure</Button>
                </div>

                <Separator />

                {/* Placeholder Section 2: Reinforcement Learning */}
                <div>
                    <h4 className="text-md font-semibold mb-2 text-foreground flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Reinforcement Learning
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        Train and deploy RL agents for trading strategies. (Placeholder)
                    </p>
                    {/* Add more UI elements here later */}
                     <Button size="sm" variant="outline" className="mt-2 text-xs" disabled>Train Agent</Button>
                </div>

                <Separator />

                {/* Placeholder Section 3: Indicators */}
                <div>
                    <h4 className="text-md font-semibold mb-2 text-foreground flex items-center gap-2">
                        <BarChart className="h-5 w-5 text-primary" />
                        BTC/USDT Indicators
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        View technical indicators for BTC/USDT. (Placeholder)
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                        <li>Moving Averages</li>
                        <li>RSI</li>
                        <li>MACD</li>
                        <li>Bollinger Bands</li>
                    </ul>
                    {/* Add more UI elements here later */}
                </div>
             </div>
           </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
