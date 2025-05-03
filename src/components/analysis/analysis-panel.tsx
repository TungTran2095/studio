// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit, RefreshCw, DatabaseZap, Loader2 } from 'lucide-react'; // Added DatabaseZap, Loader2
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTechnicalIndicators } from '@/actions/fetch-indicators';
import type { IndicatorsData } from '@/actions/fetch-indicators';
import { collectBinanceOhlcvData } from '@/actions/collect-data'; // Import the new collect action
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Type for collection status
type CollectionStatus = 'idle' | 'collecting' | 'success' | 'error';

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
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('idle');
  const [collectionMessage, setCollectionMessage] = useState<string>('');
  const { toast } = useToast();
  const indicatorsIntervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // --- Indicator Fetching Logic ---
  const fetchIndicators = useCallback(async () => {
    if (isFetchingIndicators) return;
    setIsFetchingIndicators(true);
    console.log("[AnalysisPanel] Fetching real-time indicators for BTCUSDT...");
    try {
      const result = await fetchTechnicalIndicators({ symbol: 'BTCUSDT', interval: '1h', limit: 200 });
      if (result.success && result.data) {
        setIndicators(result.data);
      } else {
        console.error("[AnalysisPanel] Error fetching indicators:", result.error);
         setIndicators(prev => ({
             ...initialIndicators,
              "Moving Average (50)": "Error", "Moving Average (200)": "Error", "RSI (14)": "Error", "MACD": "Error", "Bollinger Bands": "Error",
             lastUpdated: new Date().toLocaleTimeString(),
         }));
        toast({ title: "Error Fetching Indicators", description: result.error || "Failed.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("[AnalysisPanel] Unexpected error fetching indicators:", error);
       setIndicators(prev => ({
           ...initialIndicators,
            "Moving Average (50)": "Error", "Moving Average (200)": "Error", "RSI (14)": "Error", "MACD": "Error", "Bollinger Bands": "Error",
           lastUpdated: new Date().toLocaleTimeString(),
       }));
      toast({ title: "Error", description: "Unexpected error fetching indicators.", variant: "destructive" });
    } finally {
      setIsFetchingIndicators(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetchingIndicators, toast]); // Removed fetchIndicators

  // Effect for indicators interval
  useEffect(() => {
    fetchIndicators(); // Fetch on mount
    if (indicatorsIntervalIdRef.current) clearInterval(indicatorsIntervalIdRef.current);
    indicatorsIntervalIdRef.current = setInterval(fetchIndicators, 5000); // Refresh every 5 seconds
    return () => { if (indicatorsIntervalIdRef.current) clearInterval(indicatorsIntervalIdRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchIndicators]);


  // --- Data Collection Logic ---
  const handleCollectData = async () => {
    if (collectionStatus === 'collecting') return; // Prevent multiple clicks

    setCollectionStatus('collecting');
    setCollectionMessage('Collecting latest 1m data...');
    console.log("[AnalysisPanel] Triggering data collection...");

    try {
      // Call the server action - fetch default (100 records)
      const result = await collectBinanceOhlcvData();

      if (result.success) {
        setCollectionStatus('success');
        setCollectionMessage(result.message || 'Collection successful.');
        toast({ title: "Data Collection", description: result.message });
        console.log("[AnalysisPanel] Data collection successful:", result.message);
      } else {
        setCollectionStatus('error');
        setCollectionMessage(result.message || 'Collection failed.');
        toast({ title: "Data Collection Error", description: result.message, variant: "destructive" });
        console.error("[AnalysisPanel] Data collection failed:", result.message);
      }
    } catch (error: any) {
      setCollectionStatus('error');
      const errorMsg = error.message || "An unexpected error occurred.";
      setCollectionMessage(`Error: ${errorMsg}`);
      toast({ title: "Collection Error", description: errorMsg, variant: "destructive" });
      console.error("[AnalysisPanel] Unexpected error during data collection:", error);
    } finally {
      // Optionally reset status after a delay?
      // setTimeout(() => setCollectionStatus('idle'), 3000);
    }
  };


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
            {/* Use Accordion for collapsible sections */}
            <Accordion type="multiple" defaultValue={["item-1", "item-3"]} className="w-full space-y-1">

                {/* Section 1: Ensemble Learning (with Data Collection) */}
                <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-accent/50 rounded-md">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-primary" />
                            Ensemble Learning
                        </h4>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pt-1 pb-2 space-y-2">
                        {/* Data Collection Section */}
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                                Collect BTC/USDT 1m OHLCV data into Supabase.
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7" // Slightly larger button
                                    onClick={handleCollectData}
                                    disabled={collectionStatus === 'collecting'}
                                >
                                    {collectionStatus === 'collecting' ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <DatabaseZap className="h-3 w-3 mr-1" />
                                    )}
                                    Collect Latest Data
                                </Button>
                                {/* Status Indicator */}
                                {collectionStatus !== 'idle' && (
                                     <span className={cn(
                                         "text-xs px-1.5 py-0.5 rounded",
                                         collectionStatus === 'collecting' && "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 animate-pulse",
                                         collectionStatus === 'success' && "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50",
                                         collectionStatus === 'error' && "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50"
                                     )}>
                                        {collectionMessage}
                                     </span>
                                )}
                            </div>
                        </div>
                         <Separator className="my-2" />
                         {/* Placeholder for model config */}
                        <p className="text-xs text-muted-foreground">
                            Configure and run ensemble learning models. (Placeholder)
                        </p>
                        <Button size="sm" variant="outline" className="text-xs h-6" disabled>Configure Model</Button>
                    </AccordionContent>
                </AccordionItem>

                {/* Section 2: Reinforcement Learning */}
                <AccordionItem value="item-2" className="border-b-0">
                    <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-accent/50 rounded-md">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Bot className="h-4 w-4 text-primary" />
                            Reinforcement Learning
                        </h4>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pt-1 pb-2">
                        <p className="text-xs text-muted-foreground mb-2">
                            Train and deploy RL agents for trading strategies. (Placeholder)
                        </p>
                        <Button size="sm" variant="outline" className="text-xs h-6" disabled>Train Agent</Button>
                    </AccordionContent>
                </AccordionItem>

                {/* Section 3: Indicators */}
                <AccordionItem value="item-3" className="border-b-0">
                    <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-accent/50 rounded-md">
                        <div className="flex justify-between items-center w-full">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <BarChart className="h-4 w-4 text-primary" />
                                BTC/USDT Indicators
                            </h4>
                            {/* Refresh button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); fetchIndicators(); }}
                                disabled={isFetchingIndicators}
                                className="h-5 w-5 text-muted-foreground hover:text-foreground flex-shrink-0 mr-1"
                                title="Refresh Indicators"
                            >
                                <RefreshCw className={cn("h-3 w-3", isFetchingIndicators && "animate-spin")} />
                                <span className="sr-only">Refresh Indicators</span>
                            </Button>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pt-1 pb-2">
                         <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-muted-foreground">
                                Technical indicators for BTC/USDT (1h interval).
                            </p>
                            <span className="text-xs text-muted-foreground">
                                Last updated: {indicators.lastUpdated === "N/A" || (isFetchingIndicators && indicators.lastUpdated === "N/A") ?
                                    <Skeleton className="h-3 w-14 inline-block bg-muted" />
                                    : indicators.lastUpdated
                                } (Auto ~5s)
                            </span>
                         </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border">
                                    <TableHead className="text-muted-foreground text-xs w-2/5 h-8">Indicator</TableHead>
                                    <TableHead className="text-right text-muted-foreground text-xs h-8">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(indicators)
                                    .filter(([key]) => key !== 'lastUpdated')
                                    .map(([key, value]) => (
                                    <TableRow key={key} className="border-border">
                                        <TableCell className="font-medium text-foreground text-xs py-1">{key}</TableCell>
                                        <TableCell className="text-right text-foreground text-xs py-1">
                                            {value === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") || value === "Error" ? (
                                                value === "Error" ? <span className="text-destructive">Error</span> : <Skeleton className="h-3 w-16 ml-auto bg-muted" />
                                            ) : (
                                                value === "N/A" ? <span className="text-muted-foreground">N/A</span> : value
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Indicator calculations are simplified placeholders.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
           </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
