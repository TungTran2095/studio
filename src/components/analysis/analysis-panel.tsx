// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react'; // Import useCallback, useRef
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTechnicalIndicators } from '@/actions/fetch-indicators'; // Import the Server Action
import type { IndicatorsData } from '@/actions/fetch-indicators'; // Import the type
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Initial state for indicators
const initialIndicators: IndicatorsData = {
    "Moving Average (50)": "Loading...",
    "Moving Average (200)": "Loading...",
    "RSI (14)": "Loading...",
    "MACD": "Loading...",
    "Bollinger Bands": "Loading...",
    lastUpdated: "N/A",
};

export const AnalysisPanel: FC<AnalysisPanelProps> = ({ isExpanded, onToggle }) => {
  const [indicators, setIndicators] = useState<IndicatorsData>(initialIndicators);
  const [isFetchingIndicators, setIsFetchingIndicators] = useState(false);
  const { toast } = useToast();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID

  // Function to fetch indicator data using the Server Action
  const fetchIndicators = useCallback(async () => {
    // Avoid fetching if already fetching or if panel is collapsed (optional optimization)
    if (isFetchingIndicators) return; // Removed !isExpanded condition
    // if (isFetchingIndicators || !isExpanded) return;

    setIsFetchingIndicators(true);
    console.log("[AnalysisPanel] Fetching real-time indicators for BTCUSDT...");

    try {
      const result = await fetchTechnicalIndicators({ symbol: 'BTCUSDT', interval: '1h', limit: 200 }); // Fetch 1-hour data

      if (result.success && result.data) {
        setIndicators(result.data);
        console.log("[AnalysisPanel] Indicators updated at", result.data.lastUpdated);
      } else {
        console.error("[AnalysisPanel] Error fetching indicators:", result.error);
        // Keep existing data but show error? Or reset to 'Error'?
        // Resetting to 'Error' provides clearer feedback
         setIndicators(prev => ({
             ...initialIndicators, // Reset structure
              "Moving Average (50)": "Error",
              "Moving Average (200)": "Error",
              "RSI (14)": "Error",
              "MACD": "Error",
              "Bollinger Bands": "Error",
             lastUpdated: new Date().toLocaleTimeString(),
         }));
        toast({
          title: "Error Fetching Indicators",
          description: result.error || "Failed to fetch indicator data.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[AnalysisPanel] Unexpected error fetching indicators:", error);
       setIndicators(prev => ({
            ...initialIndicators, // Reset structure
             "Moving Average (50)": "Error",
             "Moving Average (200)": "Error",
             "RSI (14)": "Error",
             "MACD": "Error",
             "Bollinger Bands": "Error",
            lastUpdated: new Date().toLocaleTimeString(),
        }));
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching indicators.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingIndicators(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetchingIndicators, toast]); // Removed isExpanded from dependencies

  // Effect to fetch initially and set interval
  useEffect(() => {
    fetchIndicators(); // Fetch on mount

    // Clear any existing interval before setting a new one
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    // Set interval to fetch every 5 seconds
    intervalIdRef.current = setInterval(fetchIndicators, 5000);

    // Cleanup interval on component unmount
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [fetchIndicators]); // Depend on fetchIndicators function

  // Optional: Pause interval when panel is collapsed and resume when expanded
  // useEffect(() => {
  //   if (!isExpanded && intervalIdRef.current) {
  //     console.log("[AnalysisPanel] Collapsed, pausing indicator updates.");
  //     clearInterval(intervalIdRef.current);
  //     intervalIdRef.current = null;
  //   } else if (isExpanded && !intervalIdRef.current) {
  //     console.log("[AnalysisPanel] Expanded, resuming indicator updates.");
  //     fetchIndicators(); // Fetch immediately on expand
  //     intervalIdRef.current = setInterval(fetchIndicators, 5000);
  //   }
  // }, [isExpanded, fetchIndicators]);


  return (
    <Card className={cn(
      "flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out border border-border shadow-md bg-card"
    )}>
      {/* Header */}
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className={cn(
          "text-lg font-medium text-foreground transition-opacity duration-300 ease-in-out",
          !isExpanded && "opacity-0 w-0 overflow-hidden"
        )}>
          Analysis Tools
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground flex-shrink-0">
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Analysis Panel</span>
        </Button>
      </CardHeader>

     {/* Content Area */}
      <CardContent className={cn(
        "flex-1 p-3 overflow-hidden flex flex-col gap-4 transition-opacity duration-300 ease-in-out",
        !isExpanded && "opacity-0 p-0"
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
                     <p className="text-sm text-muted-foreground mb-1">
                         {/* Updated description */}
                        Technical indicators for BTC/USDT (1h interval).
                     </p>
                     {/* Show last updated time */}
                    <p className="text-xs text-muted-foreground mb-3">
                         Last updated: {indicators.lastUpdated === "N/A" || isFetchingIndicators && indicators.lastUpdated === "N/A" ?
                             <Skeleton className="h-3 w-16 inline-block bg-muted" />
                              : indicators.lastUpdated
                         } (Updates every 5s)
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
                            {/* Map over indicator keys, excluding lastUpdated */}
                            {Object.entries(indicators)
                                .filter(([key]) => key !== 'lastUpdated')
                                .map(([key, value]) => (
                                <TableRow key={key} className="border-border">
                                    <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                    <TableCell className="text-right text-foreground text-xs py-1.5">
                                        {/* Show skeleton if loading OR if value is 'Loading...' or 'Error' */}
                                        {isFetchingIndicators || value === "Loading..." || value === "Error" ? (
                                            value === "Error" ? <span className="text-destructive">Error</span> : <Skeleton className="h-4 w-20 ml-auto bg-muted" />
                                        ) : (
                                            value === "N/A" ? <span className="text-muted-foreground">N/A</span> : value // Handle "N/A"
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                      <p className="text-xs text-muted-foreground mt-2">
                         Note: Indicator calculations are simplified placeholders.
                      </p>
                </div>
             </div>
           </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
