// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit, RefreshCw, DatabaseZap, Loader2, Calendar as CalendarIconLucide } from 'lucide-react'; // Renamed Calendar import
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover
import { Calendar } from "@/components/ui/calendar"; // Import Calendar component
import { format, startOfDay, subYears } from 'date-fns'; // Import date-fns for formatting and date manipulation
import type { DateRange } from "react-day-picker"; // Import DateRange type
import { Label } from "@/components/ui/label"; // Import Label


interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Type for collection status
type CollectionStatus = 'idle' | 'collecting-latest' | 'collecting-historical' | 'success' | 'error';

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
  // State for date range picker
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  const indicatorsIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const currentYear = new Date().getFullYear(); // Get current year for calendar range

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
  const handleCollectData = async (type: 'latest' | 'historical') => {
     const isCollecting = collectionStatus === 'collecting-latest' || collectionStatus === 'collecting-historical';
    if (isCollecting) return; // Prevent multiple clicks

    let startTimeMs: number | undefined = undefined;
    let endTimeMs: number | undefined = undefined;

    if (type === 'historical') {
        if (!dateRange?.from || !dateRange?.to) {
            toast({ title: "Date Range Required", description: "Please select a start and end date for historical data.", variant: "destructive" });
            return;
        }
         // Set startTime to the beginning of the 'from' day
         startTimeMs = startOfDay(dateRange.from).getTime();
         // Set endTime to the *end* of the 'to' day (just before the next day starts)
         endTimeMs = startOfDay(dateRange.to).getTime() + (24 * 60 * 60 * 1000) - 1; // End of the selected day
         console.log(`[AnalysisPanel] Collecting historical data from ${new Date(startTimeMs).toISOString()} to ${new Date(endTimeMs).toISOString()}`);
         setCollectionStatus('collecting-historical');
         setCollectionMessage(`Collecting data from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}... (this may take a while)`);
    } else {
        // This part should ideally not be reachable if the button is removed, but keep logic for safety
        console.log("[AnalysisPanel] Collecting latest data...");
         setCollectionStatus('collecting-latest');
         setCollectionMessage('Collecting latest 1m data...');
    }


    console.log(`[AnalysisPanel] Triggering ${type} data collection...`);

    try {
      // Call the server action - pass time range if historical
      // The action 'collectBinanceOhlcvData' already handles chunking internally for historical data.
      const result = await collectBinanceOhlcvData({
        symbol: 'BTCUSDT',
        interval: '1m',
        limit: 1000, // Limit per API request (action handles multiple requests)
        ...(type === 'historical' && { startTime: startTimeMs, endTime: endTimeMs }),
      });

      if (result.success) {
        setCollectionStatus('success');
        setCollectionMessage(result.message || 'Collection successful.');
        // Use totalFetchedCount and totalInsertedCount from the action result
        toast({ title: "Data Collection", description: `${result.message} (Fetched: ${result.totalFetchedCount ?? 0}, Saved: ${result.totalInsertedCount ?? 0})` });
        console.log("[AnalysisPanel] Data collection successful:", result.message);
        // Clear date range after successful historical collection
        // if (type === 'historical') setDateRange(undefined);
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
       // Reset status immediately after completion (success or error)
       // Removed the setTimeout to allow immediate interaction after completion.
       setCollectionStatus('idle');
       // Keep the message briefly for user feedback
       setTimeout(() => {
           if (collectionStatus !== 'collecting-latest' && collectionStatus !== 'collecting-historical') {
               setCollectionMessage('');
           }
        }, 5000); // Keep message for 5 seconds
    }
  };


  return (
    <Card className={cn(
      // Removed width transition classes, panel handles resizing
      "flex flex-col h-full w-full overflow-hidden border border-border shadow-md bg-card"
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
        // Hide content based on isExpanded state for internal toggle,
        // Panel component handles hiding when externally collapsed.
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
                    <AccordionContent className="px-2 pt-1 pb-2 space-y-3">
                         {/* Data Collection Section */}
                        <div className="space-y-2">
                             <Label className="text-xs text-muted-foreground">Collect BTC/USDT 1m OHLCV</Label>
                            {/* Historical Data Collection */}
                             <div className="flex flex-wrap items-center gap-2"> {/* Use flex-wrap */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        id="date"
                                        variant={"outline"}
                                        size="sm"
                                        className={cn(
                                            "w-[260px] justify-start text-left font-normal h-7 text-xs", // Fixed width for consistency
                                            !dateRange && "text-muted-foreground"
                                        )}
                                         disabled={collectionStatus === 'collecting-latest' || collectionStatus === 'collecting-historical'}
                                        >
                                        <CalendarIconLucide className="mr-2 h-3 w-3" /> {/* Use renamed import */}
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </>
                                            ) : (
                                            format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2} // Show two months
                                            // Remove dropdown props
                                            // captionLayout="dropdown-buttons"
                                            // fromYear={2017}
                                            // toYear={currentYear}
                                            disabled={(date) => date > new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7"
                                    onClick={() => handleCollectData('historical')}
                                    disabled={collectionStatus === 'collecting-latest' || collectionStatus === 'collecting-historical' || !dateRange?.from || !dateRange?.to}
                                >
                                    {(collectionStatus === 'collecting-historical') ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <DatabaseZap className="h-3 w-3 mr-1" />
                                    )}
                                    Collect Range
                                </Button>
                             </div>
                            {/* Status Indicator */}
                            {(collectionStatus !== 'idle' || collectionMessage) && ( // Show if collecting or if there's a message
                                 <div className="pt-1">
                                    <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded",
                                        (collectionStatus === 'collecting-latest' || collectionStatus === 'collecting-historical') && "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 animate-pulse",
                                        collectionStatus === 'success' && "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50", // Only color if status is success
                                        collectionStatus === 'error' && "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50", // Only color if status is error
                                        // Default gray if message exists but status is idle
                                        collectionStatus === 'idle' && collectionMessage && "text-muted-foreground bg-muted/50"
                                    )}>
                                        {/* Show message if available, otherwise show status */}
                                        {collectionMessage || collectionStatus.replace('-', ' ')}
                                    </span>
                                 </div>
                            )}
                            {/* Updated Note */}
                             <p className="text-xs text-muted-foreground pt-1">Note: Historical collection automatically fetches data in chunks. Ensure RLS policies allow upserts.</p>
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
                     <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-accent/50 rounded-md relative group"> {/* Add relative and group */}
                        <div className="flex justify-between items-center w-full">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <BarChart className="h-4 w-4 text-primary" />
                                BTC/USDT Indicators
                            </h4>
                             {/* Moved Refresh Button inside the div, but outside the h4 */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent accordion toggle
                                    fetchIndicators();
                                }}
                                disabled={isFetchingIndicators}
                                className="h-5 w-5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" // Simplified positioning, rely on flex
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
                             <span className="text-xs text-muted-foreground flex items-center gap-1">
                                Last updated:{" "}
                                {indicators.lastUpdated === "N/A" || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                    <span className="inline-block animate-pulse">
                                        <Skeleton className="h-3 w-14 inline-block bg-muted" />
                                    </span>
                                ) : (
                                    indicators.lastUpdated
                                )}
                                {isFetchingIndicators && indicators["Moving Average (50)"] !== "Loading..." && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
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
                                            {value === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                 <Skeleton className="h-3 w-16 ml-auto bg-muted" />
                                            ) : value === "Error" ? (
                                                <span className="text-destructive">Error</span>
                                            ) : value === "N/A" ? (
                                                <span className="text-muted-foreground">N/A</span>
                                            ) : (
                                                value
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Indicator calculations are simplified placeholders. Auto-refreshes ~5s.
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
