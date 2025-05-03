// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit, RefreshCw, DatabaseZap, Loader2, Calendar as CalendarIconLucide, Play, History, Brain, SplitSquareHorizontal, Settings, Settings2 } from 'lucide-react'; // Added Settings icons
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTechnicalIndicators } from '@/actions/fetch-indicators';
import type { IndicatorsData } from '@/actions/fetch-indicators';
import { collectBinanceOhlcvData } from '@/actions/collect-data';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch"; // Import Switch


interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Type for collection status
type CollectionStatus = 'idle' | 'collecting-historical' | 'success' | 'error';
// Type for LSTM training status
type LstmTrainingStatus = 'idle' | 'training' | 'completed' | 'error';

// Initial state for indicators
const initialIndicators: IndicatorsData = {
    "Moving Average (50)": "Loading...",
    "Moving Average (200)": "Loading...",
    "RSI (14)": "Loading...",
    "MACD": "Loading...",
    "Bollinger Bands": "Loading...",
    lastUpdated: "N/A",
};

// Placeholder type for validation results
type ValidationResult = { model: string; metric: string; value: string | number };

// Default LSTM Configuration
const defaultLstmConfig = {
  units: 50,
  layers: 2,
  timesteps: 60,
  dropout: 0.2,
  learningRate: 0.001,
  batchSize: 64,
  epochs: 100,
};


export const AnalysisPanel: FC<AnalysisPanelProps> = ({ isExpanded, onToggle }) => {
  const [indicators, setIndicators] = useState<IndicatorsData>(initialIndicators);
  const [isFetchingIndicators, setIsFetchingIndicators] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('idle');
  const [collectionMessage, setCollectionMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState("ensemble"); // Default tab
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  const indicatorsIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const [trainTestSplit, setTrainTestSplit] = useState([80]);

  // --- LSTM Training State ---
  const [useDefaultLstmConfig, setUseDefaultLstmConfig] = useState(true); // State for the switch
  const [lstmUnits, setLstmUnits] = useState(defaultLstmConfig.units);
  const [lstmLayers, setLstmLayers] = useState(defaultLstmConfig.layers);
  const [lstmTimesteps, setLstmTimesteps] = useState(defaultLstmConfig.timesteps);
  const [lstmDropout, setLstmDropout] = useState(defaultLstmConfig.dropout);
  const [lstmLearningRate, setLstmLearningRate] = useState(defaultLstmConfig.learningRate);
  const [lstmBatchSize, setLstmBatchSize] = useState(defaultLstmConfig.batchSize);
  const [lstmEpochs, setLstmEpochs] = useState(defaultLstmConfig.epochs);
  const [lstmTrainingStatus, setLstmTrainingStatus] = useState<LstmTrainingStatus>('idle');
  const [lstmTrainingMessage, setLstmTrainingMessage] = useState<string>('');
  const [lstmValidationResults, setLstmValidationResults] = useState<ValidationResult[]>([]);


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
  }, [isFetchingIndicators, toast]);

  // Effect for indicators interval - Only run if indicators tab is active or initially
  useEffect(() => {
     const startFetching = () => {
        fetchIndicators(); // Fetch on start/switch
        if (indicatorsIntervalIdRef.current) clearInterval(indicatorsIntervalIdRef.current);
        indicatorsIntervalIdRef.current = setInterval(fetchIndicators, 5000); // Refresh every 5 seconds
    };

    const stopFetching = () => {
        if (indicatorsIntervalIdRef.current) {
            clearInterval(indicatorsIntervalIdRef.current);
            indicatorsIntervalIdRef.current = null;
            console.log("[AnalysisPanel] Indicator refresh stopped.");
        }
    };

    // Start fetching if the indicators tab is active
    if (activeTab === 'indicators') {
         console.log("[AnalysisPanel] Indicators tab active, starting refresh.");
         startFetching();
    } else {
         // Stop fetching if another tab is active
         stopFetching();
         // Optionally fetch once when panel expands if not on indicators tab
         if (isExpanded && indicators.lastUpdated === "N/A") {
             console.log("[AnalysisPanel] Fetching initial indicators for non-active tab.");
             fetchIndicators();
         }
    }

    // Cleanup on component unmount or tab change
    return () => stopFetching();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchIndicators, isExpanded]);


  // --- Data Collection Logic ---
  const handleCollectData = async () => {
     if (collectionStatus === 'collecting-historical') return; // Prevent multiple clicks

    if (!dateRange?.from || !dateRange?.to) {
        toast({ title: "Date Range Required", description: "Please select a start and end date for historical data.", variant: "destructive" });
        return;
    }

     // Set startTime to the beginning of the 'from' day
     const startTimeMs = dateRange.from.getTime();
     // Set endTime to the *end* of the 'to' day (just before the next day starts)
     const endTimeMs = dateRange.to.getTime() + (24 * 60 * 60 * 1000) - 1; // End of the selected day

     console.log(`[AnalysisPanel] Collecting historical data from ${new Date(startTimeMs).toISOString()} to ${new Date(endTimeMs).toISOString()}`);
     setCollectionStatus('collecting-historical');
     setCollectionMessage(`Collecting data from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}... (this may take a while)`);

    try {
      const result = await collectBinanceOhlcvData({
        symbol: 'BTCUSDT',
        interval: '1m',
        limit: 1000,
        startTime: startTimeMs,
        endTime: endTimeMs,
      });

      if (result.success) {
        setCollectionStatus('success');
        setCollectionMessage(result.message || 'Collection successful.');
        toast({ title: "Data Collection", description: `${result.message} (Fetched: ${result.totalFetchedCount ?? 0}, Saved: ${result.totalInsertedCount ?? 0})` });
        console.log("[AnalysisPanel] Data collection successful:", result.message);
        // setDateRange(undefined); // Clear date range? Optional.
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
       // Reset status immediately after completion
       setCollectionStatus('idle');
       // Keep the message briefly
       setTimeout(() => {
           // Check status *again* before clearing message, in case another operation started
           if (collectionStatus === 'idle') {
               setCollectionMessage('');
           }
        }, 5000);
    }
  };

   // --- LSTM Training Logic (Simulated) ---
   const handleStartLstmTraining = async () => {
    if (lstmTrainingStatus === 'training') return;

    const trainingConfig = useDefaultLstmConfig
      ? defaultLstmConfig
      : {
          units: lstmUnits,
          layers: lstmLayers,
          timesteps: lstmTimesteps,
          dropout: lstmDropout,
          learningRate: lstmLearningRate,
          batchSize: lstmBatchSize,
          epochs: lstmEpochs,
        };

    console.log(`[AnalysisPanel] Starting LSTM Training (Simulated) with ${useDefaultLstmConfig ? 'DEFAULT' : 'CUSTOM'} config:`, {
        ...trainingConfig,
        trainTestSplit: trainTestSplit[0],
    });

    setLstmTrainingStatus('training');
    setLstmTrainingMessage(`Training LSTM model (${trainingConfig.epochs} epochs)...`);
    setLstmValidationResults([]); // Clear previous results

    // --- SIMULATION ---
    // Replace this with your actual call to the backend (Server Action or API)
    // The backend would handle fetching data, preprocessing, training, and returning results.
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate training time

    // Simulate success or error
    const success = Math.random() > 0.2; // 80% success rate

    if (success) {
        setLstmTrainingStatus('completed');
        const simulatedRMSE = (Math.random() * 50 + 10).toFixed(4); // Simulate RMSE
        const simulatedMAE = (Math.random() * 40 + 8).toFixed(4); // Simulate MAE
        setLstmTrainingMessage('LSTM Training Completed Successfully.');
        setLstmValidationResults([
            { model: 'LSTM', metric: 'RMSE', value: simulatedRMSE },
            { model: 'LSTM', metric: 'MAE', value: simulatedMAE },
        ]);
        toast({ title: "LSTM Training", description: "Training completed successfully." });
    } else {
        setLstmTrainingStatus('error');
        const errorMsg = 'Simulated training failure.';
        setLstmTrainingMessage(`Error: ${errorMsg}`);
        toast({ title: "LSTM Training Error", description: errorMsg, variant: "destructive" });
    }
    // --- END SIMULATION ---

    // Reset status after a delay
    setTimeout(() => {
        if (lstmTrainingStatus !== 'training') { // Avoid resetting if a new training started
             setLstmTrainingStatus('idle');
             setLstmTrainingMessage('');
        }
    }, 8000);
   };


  return (
    <Card className={cn(
      "flex flex-col h-full w-full overflow-hidden border-none shadow-none bg-card"
    )}>
      {/* Header */}
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className={cn(
          "text-lg font-medium text-foreground transition-opacity duration-300 ease-in-out whitespace-nowrap overflow-hidden",
          !isExpanded && "opacity-0 w-0"
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
        "flex-1 p-0 overflow-hidden flex flex-col transition-opacity duration-300 ease-in-out",
        !isExpanded && "opacity-0 p-0"
      )}>
        {isExpanded && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 h-9 flex-shrink-0 rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="ensemble" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <BrainCircuit className="h-3.5 w-3.5 mr-1" /> Ensemble
              </TabsTrigger>
              <TabsTrigger value="rl" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <Bot className="h-3.5 w-3.5 mr-1" /> RL
              </TabsTrigger>
              <TabsTrigger value="indicators" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <BarChart className="h-3.5 w-3.5 mr-1" /> Indicators
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 overflow-y-auto">
               <div className="p-3 space-y-1"> {/* Reduced space-y */}
                    {/* Ensemble Tab Content */}
                    <TabsContent value="ensemble" className="mt-0">
                         <Accordion type="multiple" className="w-full" defaultValue={['collect-data', 'model-training']}>
                            {/* 1. Collect Data Section */}
                            <AccordionItem value="collect-data" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-t text-foreground"> {/* Increased py, added text-foreground */}
                                    <div className="flex items-center gap-2">
                                        <DatabaseZap className="h-4 w-4" />
                                        Collect OHLCV Data
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3"> {/* Adjusted padding */}
                                     <Label className="text-xs text-muted-foreground">Collect BTC/USDT 1m OHLCV</Label>
                                     {/* Date Range Picker */}
                                     <div className="flex flex-wrap items-center gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                id="date"
                                                variant={"outline"}
                                                size="sm"
                                                className={cn(
                                                    "w-[260px] justify-start text-left font-normal h-7 text-xs",
                                                    !dateRange && "text-muted-foreground"
                                                )}
                                                 disabled={collectionStatus === 'collecting-historical'}
                                                >
                                                <CalendarIconLucide className="mr-2 h-3 w-3" />
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
                                                    numberOfMonths={2}
                                                    disabled={(date) => date > new Date()}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7"
                                            onClick={handleCollectData}
                                            disabled={collectionStatus === 'collecting-historical' || !dateRange?.from || !dateRange?.to}
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
                                    {(collectionStatus !== 'idle' || collectionMessage) && (
                                         <div className="pt-1">
                                            <span className={cn(
                                                "text-xs px-1.5 py-0.5 rounded",
                                                collectionStatus === 'collecting-historical' && "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 animate-pulse",
                                                collectionStatus === 'success' && "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50",
                                                collectionStatus === 'error' && "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50",
                                                collectionStatus === 'idle' && collectionMessage && "text-muted-foreground bg-muted/50"
                                            )}>
                                                {collectionMessage || collectionStatus.replace('-', ' ')}
                                            </span>
                                         </div>
                                    )}
                                     <p className="text-xs text-muted-foreground pt-1">Collects 1-minute data for the specified range and saves to Supabase.</p>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 2. Model Training Section */}
                             <AccordionItem value="model-training" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground"> {/* Added text-foreground */}
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-4 w-4" />
                                        Model Training
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-4"> {/* Increased spacing */}
                                    <p className="text-xs text-muted-foreground">Configure and train time series forecasting models using collected data.</p>

                                    {/* Train/Test Split */}
                                    <div className="space-y-2 border-t border-border pt-3">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="train-test-split" className="text-xs flex items-center gap-1"><SplitSquareHorizontal className="h-3 w-3"/>Train/Test Split</Label>
                                            <span className="text-xs text-muted-foreground">{trainTestSplit[0]}% / {100 - trainTestSplit[0]}%</span>
                                        </div>
                                        <Slider
                                            id="train-test-split"
                                            min={10}
                                            max={90}
                                            step={5}
                                            value={trainTestSplit}
                                            onValueChange={setTrainTestSplit}
                                            className="w-[95%] mx-auto pt-1"
                                            disabled={lstmTrainingStatus === 'training'}
                                        />
                                        <p className="text-xs text-muted-foreground pt-1">Adjust the percentage of data used for training vs. validation.</p>
                                    </div>

                                    {/* LSTM Model Configuration */}
                                    <div className="space-y-3 border-t border-border pt-3">
                                         {/* Config Toggle Switch - Inverted logic */}
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium flex items-center gap-1">
                                                 {useDefaultLstmConfig ? <Settings className="h-3 w-3" /> : <Settings2 className="h-3 w-3" />}
                                                 LSTM Configuration
                                            </Label>
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="lstm-config-switch" className="text-xs text-muted-foreground">
                                                     {useDefaultLstmConfig ? "Default" : "Custom"}
                                                </Label>
                                                <Switch
                                                    id="lstm-config-switch"
                                                    checked={useDefaultLstmConfig} // Checked means default
                                                    onCheckedChange={setUseDefaultLstmConfig} // Direct set
                                                    disabled={lstmTrainingStatus === 'training'}
                                                />
                                            </div>
                                        </div>

                                        {/* Parameter Inputs (Conditionally Disabled) */}
                                         {/* Apply disabled styles when useDefaultLstmConfig is true */}
                                        <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2 transition-opacity", useDefaultLstmConfig && "opacity-50 pointer-events-none")}>
                                            <div className="space-y-1">
                                                <Label htmlFor="lstm-units" className="text-xs">Units/Layer</Label>
                                                <Input id="lstm-units" type="number" value={lstmUnits} onChange={(e) => setLstmUnits(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lstm-layers" className="text-xs">Layers</Label>
                                                <Input id="lstm-layers" type="number" value={lstmLayers} onChange={(e) => setLstmLayers(parseInt(e.target.value) || 1)} min="1" max="5" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lstm-timesteps" className="text-xs">Timesteps (Lookback)</Label>
                                                <Input id="lstm-timesteps" type="number" value={lstmTimesteps} onChange={(e) => setLstmTimesteps(parseInt(e.target.value) || 10)} min="10" max="120" step="10" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lstm-dropout" className="text-xs">Dropout Rate</Label>
                                                <Input id="lstm-dropout" type="number" value={lstmDropout} onChange={(e) => setLstmDropout(parseFloat(e.target.value) || 0.0)} min="0.0" max="0.8" step="0.1" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lstm-lr" className="text-xs">Learning Rate</Label>
                                                <Input id="lstm-lr" type="number" value={lstmLearningRate} onChange={(e) => setLstmLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lstm-batch" className="text-xs">Batch Size</Label>
                                                <Input id="lstm-batch" type="number" value={lstmBatchSize} onChange={(e) => setLstmBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                             <div className="space-y-1 col-span-2">
                                                <Label htmlFor="lstm-epochs" className="text-xs">Epochs</Label>
                                                <Input id="lstm-epochs" type="number" value={lstmEpochs} onChange={(e) => setLstmEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className="h-7 text-xs" disabled={useDefaultLstmConfig || lstmTrainingStatus === 'training'} />
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleStartLstmTraining} disabled={lstmTrainingStatus === 'training'}>
                                            {lstmTrainingStatus === 'training' ? (
                                                 <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            ) : (
                                                <Play className="h-3 w-3 mr-1" />
                                            )}
                                            Start LSTM Training
                                        </Button>
                                         {/* Training Status */}
                                         {(lstmTrainingStatus !== 'idle' || lstmTrainingMessage) && (
                                            <div className="pt-1">
                                                <span className={cn(
                                                    "text-xs px-1.5 py-0.5 rounded",
                                                    lstmTrainingStatus === 'training' && "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 animate-pulse",
                                                    lstmTrainingStatus === 'completed' && "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50",
                                                    lstmTrainingStatus === 'error' && "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50",
                                                    lstmTrainingStatus === 'idle' && lstmTrainingMessage && "text-muted-foreground bg-muted/50"
                                                )}>
                                                    {lstmTrainingMessage || lstmTrainingStatus}
                                                </span>
                                            </div>
                                         )}
                                        <p className="text-xs text-muted-foreground pt-1">Note: Training runs on a separate backend (not implemented here). This UI simulates the process.</p>
                                    </div>

                                     {/* Model Validation Results */}
                                     <div className="space-y-2 border-t border-border pt-3">
                                         <Label className="text-xs block">Validation Results</Label>
                                         <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs h-8">Model</TableHead>
                                                    <TableHead className="text-xs h-8">Metric</TableHead>
                                                    <TableHead className="text-right text-xs h-8">Value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {lstmTrainingStatus === 'training' && (
                                                    <>
                                                     <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-2/3 bg-muted" /></TableCell></TableRow>
                                                     <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-1/2 bg-muted" /></TableCell></TableRow>
                                                    </>
                                                )}
                                                {(lstmTrainingStatus === 'completed' || lstmTrainingStatus === 'error') && lstmValidationResults.length === 0 && lstmTrainingStatus !== 'training' && (
                                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-2">No validation results yet.</TableCell></TableRow>
                                                )}
                                                {lstmValidationResults.map((result, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="text-xs py-1">{result.model}</TableCell>
                                                        <TableCell className="text-xs py-1">{result.metric}</TableCell>
                                                        <TableCell className="text-right text-xs py-1">{result.value}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {/* Placeholder for other models */}
                                                 <TableRow className="opacity-50">
                                                    <TableCell className="text-xs py-1 text-muted-foreground">N-BEATS (Placeholder)</TableCell>
                                                    <TableCell className="text-xs py-1 text-muted-foreground">RMSE</TableCell>
                                                    <TableCell className="text-right text-xs py-1 text-muted-foreground">-</TableCell>
                                                </TableRow>
                                                <TableRow className="opacity-50">
                                                    <TableCell className="text-xs py-1 text-muted-foreground">LightGBM (Placeholder)</TableCell>
                                                    <TableCell className="text-xs py-1 text-muted-foreground">MAE</TableCell>
                                                    <TableCell className="text-right text-xs py-1 text-muted-foreground">-</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                     </div>

                                </AccordionContent>
                            </AccordionItem>

                            {/* 3. Model Testing Section */}
                            <AccordionItem value="model-testing" className="border-b-0">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-b text-foreground"> {/* Added text-foreground */}
                                    <div className="flex items-center gap-2">
                                        <History className="h-4 w-4" />
                                        Model Testing
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-4">
                                    <p className="text-xs text-muted-foreground">Perform backtesting and front testing on trained models.</p>
                                     {/* Placeholder for test config */}
                                    <div className="space-y-2 border-t border-border pt-3">
                                         <Label className="text-xs">Testing Configuration (Placeholder)</Label>
                                         <Select disabled>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select Trained Model..." />
                                            </SelectTrigger>
                                            {/* Options would be populated with trained models */}
                                             <SelectContent>
                                                <SelectItem value="lstm" disabled={lstmTrainingStatus !== 'completed'}>LSTM (Trained)</SelectItem>
                                                <SelectItem value="nbeats" disabled>N-BEATS (Placeholder)</SelectItem>
                                             </SelectContent>
                                        </Select>
                                         <div className="flex gap-2 pt-1">
                                             <Input type="text" placeholder="Backtest Period (e.g., 30d)" className="h-8 text-xs" disabled />
                                             <Input type="text" placeholder="Front Test Period (e.g., 7d)" className="h-8 text-xs" disabled />
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="text-xs h-7" disabled>
                                        <Play className="h-3 w-3 mr-1" />
                                        Run Tests (Placeholder)
                                    </Button>
                                    {/* Placeholder for results table */}
                                     <Label className="text-xs text-muted-foreground pt-2 block">Test Results (Placeholder)</Label>
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs h-8">Model</TableHead>
                                                <TableHead className="text-xs h-8">Metric</TableHead>
                                                <TableHead className="text-right text-xs h-8">Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="text-xs py-1">LSTM</TableCell>
                                                <TableCell className="text-xs py-1">P/L %</TableCell>
                                                <TableCell className="text-right text-xs py-1">-</TableCell>
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="text-xs py-1">LSTM</TableCell>
                                                <TableCell className="text-xs py-1">Sharpe Ratio</TableCell>
                                                <TableCell className="text-right text-xs py-1">-</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </TabsContent>

                    {/* RL Tab Content */}
                    <TabsContent value="rl" className="mt-0 space-y-2">
                        {/* Add Accordion structure here if needed, similar to Ensemble */}
                        <p className="text-xs text-muted-foreground mb-2">
                            Train and deploy RL agents for trading strategies. (Placeholder - UI only)
                        </p>
                         <Accordion type="multiple" className="w-full">
                             <AccordionItem value="rl-config" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-t text-foreground"> {/* Added text-foreground */}
                                    <div className="flex items-center gap-2"><Bot className="h-4 w-4" />Agent Configuration</div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <Label className="text-xs">Select RL Algorithm</Label>
                                    <Select disabled><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="e.g., PPO, DQN..." /></SelectTrigger></Select>
                                    <Label className="text-xs">Environment Settings</Label>
                                    <Input type="text" placeholder="Reward Function..." className="h-8 text-xs" disabled/>
                                    <Input type="text" placeholder="State Space Features..." className="h-8 text-xs" disabled/>
                                </AccordionContent>
                             </AccordionItem>
                             <AccordionItem value="rl-training" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground"> {/* Added text-foreground */}
                                    <div className="flex items-center gap-2"><Play className="h-4 w-4" />Train Agent</div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <Input type="number" placeholder="Training Timesteps" className="h-8 text-xs" disabled/>
                                    <Button size="sm" variant="outline" className="text-xs h-7" disabled>Start RL Training (Placeholder)</Button>
                                    <p className="text-xs text-muted-foreground pt-1">Status: Idle</p>
                                </AccordionContent>
                             </AccordionItem>
                             <AccordionItem value="rl-testing" className="border-b-0">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-b text-foreground"> {/* Added text-foreground */}
                                     <div className="flex items-center gap-2"><History className="h-4 w-4" />Agent Testing</div>
                                </AccordionTrigger>
                                 <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <p className="text-xs text-muted-foreground">Backtest the trained RL agent.</p>
                                    <Button size="sm" variant="outline" className="text-xs h-7" disabled>Run Backtest (Placeholder)</Button>
                                    {/* Placeholder for RL results */}
                                    <Label className="text-xs text-muted-foreground pt-2 block">RL Test Results</Label>
                                     <Table>
                                        <TableHeader><TableRow><TableHead className="text-xs h-8">Metric</TableHead><TableHead className="text-right text-xs h-8">Value</TableHead></TableRow></TableHeader>
                                        <TableBody><TableRow><TableCell className="text-xs py-1">Total Reward</TableCell><TableCell className="text-right text-xs py-1">-</TableCell></TableRow></TableBody>
                                    </Table>
                                </AccordionContent>
                             </AccordionItem>
                        </Accordion>
                    </TabsContent>

                     {/* Indicators Tab Content */}
                    <TabsContent value="indicators" className="mt-0 space-y-2">
                         <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-muted-foreground">
                                Technical indicators for BTC/USDT (1h interval).
                            </p>
                             <div className="text-xs text-muted-foreground flex items-center gap-1">
                                Last updated:{" "}
                                {indicators.lastUpdated === "N/A" || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                     <Skeleton className="h-3 w-14 inline-block bg-muted" />
                                ) : (
                                    indicators.lastUpdated
                                )}
                                {isFetchingIndicators && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                {/* Manual Refresh Button */}
                                <span onClick={(e) => e.stopPropagation()}> {/* Prevent accordion toggle */}
                                     <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={fetchIndicators}
                                        disabled={isFetchingIndicators}
                                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                        title="Refresh Indicators"
                                    >
                                        <RefreshCw className={cn("h-3 w-3", isFetchingIndicators && "animate-spin")} />
                                        <span className="sr-only">Refresh Indicators</span>
                                    </Button>
                                </span>
                            </div>
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
                            Note: Indicator calculations are simplified placeholders. Auto-refreshes ~5s when tab is active.
                        </p>
                    </TabsContent>
                </div>
            </ScrollArea>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
