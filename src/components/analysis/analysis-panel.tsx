// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from 'react';
import { useState, useEffect } from 'react'; // Import useState, useEffect
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit, RefreshCw } from 'lucide-react'; // Import icons, add RefreshCw
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Placeholder data for indicators
const initialIndicators = {
    "Moving Average (50)": "Loading...",
    "Moving Average (200)": "Loading...",
    "RSI (14)": "Loading...",
    "MACD": "Loading...",
    "Bollinger Bands": "Loading...",
};

export const AnalysisPanel: FC<AnalysisPanelProps> = ({ isExpanded, onToggle }) => {
  // State for indicators and loading
  const [indicators, setIndicators] = useState(initialIndicators);
  const [isFetchingIndicators, setIsFetchingIndicators] = useState(false);

  // Placeholder function to simulate fetching data
  const fetchIndicators = () => {
      // Only set loading if not already fetching (to avoid quick flashes on interval)
      if (!isFetchingIndicators) {
        setIsFetchingIndicators(true);
      }
      console.log("Simulating indicator fetch...");
      // In a real app, fetch data from an API (e.g., Binance, TradingView API, etc.)
      // and calculate indicators.
      setTimeout(() => {
           const now = new Date().toLocaleTimeString();
           setIndicators({
                "Moving Average (50)": (Math.random() * 10000 + 60000).toFixed(2), // Example values
                "Moving Average (200)": (Math.random() * 5000 + 55000).toFixed(2),
                "RSI (14)": (Math.random() * 40 + 30).toFixed(2), // Example RSI range
                "MACD": `${(Math.random() * 100 - 50).toFixed(2)} / ${(Math.random() * 50 - 25).toFixed(2)}`, // Example MACD format
                "Bollinger Bands": `Upper: ${(Math.random() * 2000 + 61000).toFixed(2)}, Lower: ${(Math.random() * 2000 + 58000).toFixed(2)}`,
           });
           setIsFetchingIndicators(false);
           console.log("Simulated indicators updated at", now);
      }, 800); // Simulate network/calculation delay (reduced from 1500ms)
  };

  // Fetch initially and set an interval to fetch every 5 seconds
  useEffect(() => {
    fetchIndicators(); // Fetch on component mount

    // Set interval to fetch every 5 seconds
    const intervalId = setInterval(fetchIndicators, 5000); // Fetch every 5000 ms

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once on mount for setup


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

                {/* Section 3: Indicators */}
                <div>
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                            <BarChart className="h-5 w-5 text-primary" />
                            BTC/USDT Indicators
                        </h4>
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchIndicators} // Manual refresh still possible
                            disabled={isFetchingIndicators}
                            className="h-6 w-6 text-foreground flex-shrink-0"
                            title="Refresh Indicators"
                        >
                             <RefreshCw className={cn("h-4 w-4", isFetchingIndicators && "animate-spin")} />
                             <span className="sr-only">Refresh Indicators</span>
                        </Button>
                     </div>
                     <p className="text-sm text-muted-foreground mb-3">
                        Technical indicators for BTC/USDT. (Simulated data, updates every 5s)
                    </p>
                    {/* Table for Indicators */}
                     <Table>
                        <TableHeader>
                            <TableRow className="border-border">
                                <TableHead className="text-muted-foreground text-xs w-2/5">Indicator</TableHead>
                                <TableHead className="text-right text-muted-foreground text-xs">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(indicators).map(([key, value]) => (
                                <TableRow key={key} className="border-border">
                                    <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                    <TableCell className="text-right text-foreground text-xs py-1.5">
                                        {/* Show skeleton only if value is still "Loading..." */}
                                        {value === "Loading..." || (isFetchingIndicators && indicators[key as keyof typeof indicators] === "Loading...") ? (
                                            <Skeleton className="h-4 w-20 ml-auto bg-muted" />
                                        ) : (
                                            value
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                </div>
             </div>
           </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};