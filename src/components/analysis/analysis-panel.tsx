
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
import { Switch } from "@/components/ui/switch";
// Import the generic training server action and types
import { startTrainingJob } from '@/actions/train-lstm'; // Keep file name for now, action is generic
import type { LstmTrainingConfig, NBeatsTrainingConfig, LightGBMTrainingConfig, TrainingResult } from '@/actions/train-lstm'; // Import all config types
import { Progress } from "@/components/ui/progress"; // Import Progress


interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Type for collection status
type CollectionStatus = 'idle' | 'collecting-historical' | 'success' | 'error';
// Type for training status (client-side view)
type TrainingStatus = 'idle' | 'training' | 'completed' | 'error';
type ModelType = 'LSTM' | 'N-BEATS' | 'LightGBM'; // Add more models as needed

// Initial state for indicators
const initialIndicators: IndicatorsData = {
    "Moving Average (50)": "Loading...",
    "Moving Average (200)": "Loading...",
    "RSI (14)": "Loading...",
    "MACD": "Loading...",
    "Bollinger Bands": "Loading...",
    lastUpdated: "N/A",
};

// Placeholder type for validation results - matches TrainingResult structure
type ValidationResult = { model: string; metric: string; value: string | number };


// Default configurations for different models
const defaultLstmConfig: LstmTrainingConfig = {
  units: 50,
  layers: 2,
  timesteps: 60,
  dropout: 0.2,
  learningRate: 0.001,
  batchSize: 64,
  epochs: 100,
};

// Default N-BEATS Config (align with Python script args where possible)
const defaultNBeatsConfig: NBeatsTrainingConfig = {
    input_chunk_length: 20,
    output_chunk_length: 5,
    num_stacks: 30,
    num_blocks: 1,
    num_layers: 4,
    layer_widths: 256,
    learningRate: 0.001,
    batchSize: 64,
    epochs: 50,
};
// Default LightGBM Config (align with Python script args)
const defaultLightGBMConfig: LightGBMTrainingConfig = {
    num_leaves: 31,
    learningRate: 0.05,
    feature_fraction: 0.9,
    bagging_fraction: 0.8,
    bagging_freq: 5,
    boosting_type: 'gbdt',
    numIterations: 100,
    lags: 5, // Default lag features
    forecast_horizon: 1, // Default forecast step
    batchSize: 64, // Added for consistency
    epochs: 100, // Added for consistency (maps to numIterations)
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

  // --- Model Training State ---
  const [selectedModel, setSelectedModel] = useState<ModelType>('LSTM'); // State for selected model
  const [useDefaultConfig, setUseDefaultConfig] = useState(true); // State for config switch

  // LSTM specific state
  const [lstmUnits, setLstmUnits] = useState(defaultLstmConfig.units);
  const [lstmLayers, setLstmLayers] = useState(defaultLstmConfig.layers);
  const [lstmTimesteps, setLstmTimesteps] = useState(defaultLstmConfig.timesteps);
  const [lstmDropout, setLstmDropout] = useState(defaultLstmConfig.dropout);
  const [lstmLearningRate, setLstmLearningRate] = useState(defaultLstmConfig.learningRate);
  const [lstmBatchSize, setLstmBatchSize] = useState(defaultLstmConfig.batchSize);
  const [lstmEpochs, setLstmEpochs] = useState(defaultLstmConfig.epochs);

  // N-BEATS specific state (Match defaultNBeatsConfig structure)
  const [nbeatsInputChunk, setNbeatsInputChunk] = useState(defaultNBeatsConfig.input_chunk_length);
  const [nbeatsOutputChunk, setNbeatsOutputChunk] = useState(defaultNBeatsConfig.output_chunk_length);
  const [nbeatsNumStacks, setNbeatsNumStacks] = useState(defaultNBeatsConfig.num_stacks);
  const [nbeatsNumBlocks, setNbeatsNumBlocks] = useState(defaultNBeatsConfig.num_blocks);
  const [nbeatsNumLayers, setNbeatsNumLayers] = useState(defaultNBeatsConfig.num_layers);
  const [nbeatsLayerWidths, setNbeatsLayerWidths] = useState(defaultNBeatsConfig.layer_widths);
  const [nbeatsLearningRate, setNbeatsLearningRate] = useState(defaultNBeatsConfig.learningRate);
  const [nbeatsBatchSize, setNbeatsBatchSize] = useState(defaultNBeatsConfig.batchSize);
  const [nbeatsEpochs, setNbeatsEpochs] = useState(defaultNBeatsConfig.epochs);

  // LightGBM specific state (Match defaultLightGBMConfig structure)
  const [lgbmNumLeaves, setLgbmNumLeaves] = useState(defaultLightGBMConfig.num_leaves);
  const [lgbmLearningRate, setLgbmLearningRate] = useState(defaultLightGBMConfig.learningRate);
  const [lgbmFeatureFraction, setLgbmFeatureFraction] = useState(defaultLightGBMConfig.feature_fraction);
  const [lgbmBaggingFraction, setLgbmBaggingFraction] = useState(defaultLightGBMConfig.bagging_fraction);
  const [lgbmBaggingFreq, setLgbmBaggingFreq] = useState(defaultLightGBMConfig.bagging_freq);
  const [lgbmBoostingType, setLgbmBoostingType] = useState<'gbdt' | 'dart' | 'goss'>(defaultLightGBMConfig.boosting_type);
  const [lgbmNumIterations, setLgbmNumIterations] = useState(defaultLightGBMConfig.numIterations);
  const [lgbmLags, setLgbmLags] = useState(defaultLightGBMConfig.lags);
  const [lgbmForecastHorizon, setLgbmForecastHorizon] = useState(defaultLightGBMConfig.forecast_horizon);

  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('idle');
  const [trainingMessage, setTrainingMessage] = useState<string>('');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<number | null>(null);


  // --- Indicator Fetching Logic --- (No changes needed here)
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

  // Effect for indicators interval
  useEffect(() => {
     const startFetching = () => {
        fetchIndicators();
        if (indicatorsIntervalIdRef.current) clearInterval(indicatorsIntervalIdRef.current);
        indicatorsIntervalIdRef.current = setInterval(fetchIndicators, 5000);
    };

    const stopFetching = () => {
        if (indicatorsIntervalIdRef.current) {
            clearInterval(indicatorsIntervalIdRef.current);
            indicatorsIntervalIdRef.current = null;
            console.log("[AnalysisPanel] Indicator refresh stopped.");
        }
    };

    if (activeTab === 'indicators') {
         console.log("[AnalysisPanel] Indicators tab active, starting refresh.");
         startFetching();
    } else {
         stopFetching();
         if (isExpanded && indicators.lastUpdated === "N/A") {
             console.log("[AnalysisPanel] Fetching initial indicators for non-active tab.");
             fetchIndicators();
         }
    }

    return () => stopFetching();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchIndicators, isExpanded]);


  // --- Data Collection Logic --- (No changes needed here)
  const handleCollectData = async () => {
     if (collectionStatus === 'collecting-historical') return;

    if (!dateRange?.from || !dateRange?.to) {
        toast({ title: "Date Range Required", description: "Please select a start and end date for historical data.", variant: "destructive" });
        return;
    }

     const startTimeMs = dateRange.from.getTime();
     const endTimeMs = dateRange.to.getTime() + (24 * 60 * 60 * 1000) - 1;

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
       // Keep status indicator for a bit longer
       setTimeout(() => {
           setCollectionStatus('idle');
           setCollectionMessage('');
        }, 8000); // Reset after 8 seconds
    }
  };

   // --- Model Training Logic ---
   const handleStartTraining = async () => {
    if (trainingStatus === 'training') return;

    let config: LstmTrainingConfig | NBeatsTrainingConfig | LightGBMTrainingConfig;

    // Determine config based on selectedModel and useDefaultConfig
    switch (selectedModel) {
      case 'LSTM':
        config = useDefaultConfig
          ? defaultLstmConfig
          : {
              units: lstmUnits, layers: lstmLayers, timesteps: lstmTimesteps, dropout: lstmDropout,
              learningRate: lstmLearningRate, batchSize: lstmBatchSize, epochs: lstmEpochs,
            };
        break;
      case 'N-BEATS':
        config = useDefaultConfig
          ? defaultNBeatsConfig
          : {
              input_chunk_length: nbeatsInputChunk, output_chunk_length: nbeatsOutputChunk,
              num_stacks: nbeatsNumStacks, num_blocks: nbeatsNumBlocks, num_layers: nbeatsNumLayers,
              layer_widths: nbeatsLayerWidths, learningRate: nbeatsLearningRate,
              batchSize: nbeatsBatchSize, epochs: nbeatsEpochs,
            };
        break;
      case 'LightGBM':
        config = useDefaultConfig
          ? defaultLightGBMConfig
          : {
              num_leaves: lgbmNumLeaves, learningRate: lgbmLearningRate,
              feature_fraction: lgbmFeatureFraction, bagging_fraction: lgbmBaggingFraction,
              bagging_freq: lgbmBaggingFreq, boosting_type: lgbmBoostingType,
              numIterations: lgbmNumIterations, lags: lgbmLags, forecast_horizon: lgbmForecastHorizon,
              // Add batchSize/epochs from default for consistency, though script uses numIterations
              batchSize: defaultLightGBMConfig.batchSize, epochs: defaultLightGBMConfig.epochs
            };
        break;
      default:
        toast({ title: "Error", description: "Invalid model selected.", variant: "destructive"});
        return;
    }

    const input = {
        modelType: selectedModel,
        config: config,
        trainTestSplitRatio: trainTestSplit[0] / 100,
    };

    console.log(`[AnalysisPanel] Requesting ${selectedModel} Training Job with ${useDefaultConfig ? 'DEFAULT' : 'CUSTOM'} config:`, input);

    setTrainingStatus('training');
    setTrainingMessage(`Requesting ${selectedModel} training...`);
    setValidationResults([]);
    setTrainingProgress(5); // Simulate starting progress

    // Simulate progress increase
    const progressInterval = setInterval(() => {
        setTrainingProgress(prev => {
            if (prev === null || prev >= 95) return prev;
            return Math.min(95, prev + Math.floor(Math.random() * 10) + 5);
        });
    }, 1500);


    try {
        // Call the generic startTrainingJob action
        const result: TrainingResult = await startTrainingJob(input);

        clearInterval(progressInterval);

        if (result.success) {
            setTrainingStatus('completed');
            setTrainingProgress(100);
            setTrainingMessage(result.message || `${selectedModel} Training Completed.`);
            const validationData: ValidationResult[] = [];
            if (result.results?.rmse) {
                validationData.push({ model: selectedModel, metric: 'RMSE', value: result.results.rmse.toFixed(4) });
            }
            if (result.results?.mae) {
                validationData.push({ model: selectedModel, metric: 'MAE', value: result.results.mae.toFixed(4) });
            }
            setValidationResults(validationData);
            toast({ title: `${selectedModel} Training`, description: result.message });
            console.log(`[AnalysisPanel] ${selectedModel} Training Job successful:`, result);
        } else {
            setTrainingStatus('error');
            setTrainingProgress(null);
            const errorMsg = result.message || `Backend ${selectedModel} job failed.`;
            setTrainingMessage(`Error: ${errorMsg}`);
            toast({ title: `${selectedModel} Training Error`, description: errorMsg, variant: "destructive" });
            console.error(`[AnalysisPanel] ${selectedModel} Training Job failed:`, result);
        }
    } catch (error: any) {
        clearInterval(progressInterval);
        setTrainingStatus('error');
        setTrainingProgress(null);
        const errorMsg = error.message || 'An unexpected error occurred.';
        setTrainingMessage(`Error: ${errorMsg}`);
        toast({ title: "Training Request Error", description: errorMsg, variant: "destructive" });
        console.error(`[AnalysisPanel] Error calling startTrainingJob action for ${selectedModel}:`, error);
    } finally {
        // Keep status indicator for a bit longer
        setTimeout(() => {
             setTrainingStatus('idle');
             setTrainingProgress(null);
             // Optionally clear message after timeout: setTrainingMessage('');
        }, 8000);
    }
   };

   // --- Render specific config inputs based on selectedModel ---
   const renderModelConfigInputs = () => {
     const commonDisabled = useDefaultConfig || trainingStatus === 'training';
     const gridClass = cn("grid grid-cols-2 gap-x-4 gap-y-2 transition-opacity", commonDisabled && "opacity-50 pointer-events-none");

     switch (selectedModel) {
       case 'LSTM':
         return (
             <div className={gridClass}>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-units" className="text-xs">Units/Layer</Label>
                     <Input id="lstm-units" type="number" value={lstmUnits} onChange={(e) => setLstmUnits(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-layers" className="text-xs">Layers</Label>
                     <Input id="lstm-layers" type="number" value={lstmLayers} onChange={(e) => setLstmLayers(parseInt(e.target.value) || 1)} min="1" max="5" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-timesteps" className="text-xs">Timesteps (Lookback)</Label>
                     <Input id="lstm-timesteps" type="number" value={lstmTimesteps} onChange={(e) => setLstmTimesteps(parseInt(e.target.value) || 10)} min="10" max="120" step="10" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-dropout" className="text-xs">Dropout Rate</Label>
                     <Input id="lstm-dropout" type="number" value={lstmDropout} onChange={(e) => setLstmDropout(parseFloat(e.target.value) || 0.0)} min="0.0" max="0.8" step="0.1" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-lr" className="text-xs">Learning Rate</Label>
                     <Input id="lstm-lr" type="number" value={lstmLearningRate} onChange={(e) => setLstmLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-batch" className="text-xs">Batch Size</Label>
                     <Input id="lstm-batch" type="number" value={lstmBatchSize} onChange={(e) => setLstmBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1 col-span-2">
                     <Label htmlFor="lstm-epochs" className="text-xs">Epochs</Label>
                     <Input id="lstm-epochs" type="number" value={lstmEpochs} onChange={(e) => setLstmEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className="h-7 text-xs" disabled={commonDisabled} />
                 </div>
             </div>
         );
        case 'N-BEATS':
            return (
                <div className={gridClass}>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-input" className="text-xs">Input Chunk</Label>
                        <Input id="nbeats-input" type="number" value={nbeatsInputChunk} onChange={(e) => setNbeatsInputChunk(parseInt(e.target.value) || 10)} min="5" max="100" step="5" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-output" className="text-xs">Output Chunk</Label>
                        <Input id="nbeats-output" type="number" value={nbeatsOutputChunk} onChange={(e) => setNbeatsOutputChunk(parseInt(e.target.value) || 1)} min="1" max="20" step="1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-stacks" className="text-xs">Num Stacks</Label>
                        <Input id="nbeats-stacks" type="number" value={nbeatsNumStacks} onChange={(e) => setNbeatsNumStacks(parseInt(e.target.value) || 10)} min="1" max="50" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-blocks" className="text-xs">Blocks/Stack</Label>
                        <Input id="nbeats-blocks" type="number" value={nbeatsNumBlocks} onChange={(e) => setNbeatsNumBlocks(parseInt(e.target.value) || 1)} min="1" max="5" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="nbeats-layers" className="text-xs">Layers/Block</Label>
                        <Input id="nbeats-layers" type="number" value={nbeatsNumLayers} onChange={(e) => setNbeatsNumLayers(parseInt(e.target.value) || 2)} min="1" max="8" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-widths" className="text-xs">Layer Widths</Label>
                        <Input id="nbeats-widths" type="number" value={nbeatsLayerWidths} onChange={(e) => setNbeatsLayerWidths(parseInt(e.target.value) || 128)} min="32" max="512" step="32" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-lr" className="text-xs">Learning Rate</Label>
                        <Input id="nbeats-lr" type="number" value={nbeatsLearningRate} onChange={(e) => setNbeatsLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="nbeats-batch" className="text-xs">Batch Size</Label>
                        <Input id="nbeats-batch" type="number" value={nbeatsBatchSize} onChange={(e) => setNbeatsBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="nbeats-epochs" className="text-xs">Epochs</Label>
                        <Input id="nbeats-epochs" type="number" value={nbeatsEpochs} onChange={(e) => setNbeatsEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <p className="text-xs text-muted-foreground col-span-2">(N-BEATS script is placeholder)</p>
                </div>
            );
        case 'LightGBM':
            return (
                <div className={gridClass}>
                     <div className="space-y-1">
                        <Label htmlFor="lgbm-leaves" className="text-xs">Num Leaves</Label>
                        <Input id="lgbm-leaves" type="number" value={lgbmNumLeaves} onChange={(e) => setLgbmNumLeaves(parseInt(e.target.value) || 20)} min="10" max="100" step="1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-lr" className="text-xs">Learning Rate</Label>
                        <Input id="lgbm-lr" type="number" value={lgbmLearningRate} onChange={(e) => setLgbmLearningRate(parseFloat(e.target.value) || 0.01)} min="0.001" max="0.1" step="0.001" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="lgbm-feat-frac" className="text-xs">Feature Fraction</Label>
                        <Input id="lgbm-feat-frac" type="number" value={lgbmFeatureFraction} onChange={(e) => setLgbmFeatureFraction(parseFloat(e.target.value) || 0.1)} min="0.1" max="1.0" step="0.1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-bag-frac" className="text-xs">Bagging Fraction</Label>
                        <Input id="lgbm-bag-frac" type="number" value={lgbmBaggingFraction} onChange={(e) => setLgbmBaggingFraction(parseFloat(e.target.value) || 0.1)} min="0.1" max="1.0" step="0.1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-bag-freq" className="text-xs">Bagging Freq</Label>
                        <Input id="lgbm-bag-freq" type="number" value={lgbmBaggingFreq} onChange={(e) => setLgbmBaggingFreq(parseInt(e.target.value) || 1)} min="0" max="20" step="1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="lgbm-boosting" className="text-xs">Boosting Type</Label>
                        <Select value={lgbmBoostingType} onValueChange={(v) => setLgbmBoostingType(v as 'gbdt'|'dart'|'goss')} disabled={commonDisabled}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gbdt" className="text-xs">gbdt</SelectItem>
                                <SelectItem value="dart" className="text-xs">dart</SelectItem>
                                <SelectItem value="goss" className="text-xs">goss</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-lags" className="text-xs">Lag Features</Label>
                        <Input id="lgbm-lags" type="number" value={lgbmLags} onChange={(e) => setLgbmLags(parseInt(e.target.value) || 1)} min="1" max="20" step="1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-horizon" className="text-xs">Forecast Horizon</Label>
                        <Input id="lgbm-horizon" type="number" value={lgbmForecastHorizon} onChange={(e) => setLgbmForecastHorizon(parseInt(e.target.value) || 1)} min="1" max="10" step="1" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="lgbm-iterations" className="text-xs">Iterations</Label>
                        <Input id="lgbm-iterations" type="number" value={lgbmNumIterations} onChange={(e) => setLgbmNumIterations(parseInt(e.target.value) || 50)} min="20" max="1000" step="10" className="h-7 text-xs" disabled={commonDisabled} />
                    </div>
                </div>
            );
       default:
         return null;
     }
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
        !isExpanded && "opacity-0 p-0" // Ensures content area is hidden when collapsed
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
               <div className="p-3 space-y-1">
                    {/* Ensemble Tab Content */}
                    <TabsContent value="ensemble" className="mt-0">
                         <Accordion type="multiple" className="w-full" defaultValue={['collect-data', 'model-training']}>
                            {/* 1. Collect Data Section */}
                            <AccordionItem value="collect-data" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-t text-foreground">
                                    <div className="flex items-center gap-2">
                                        <DatabaseZap className="h-4 w-4" />
                                        Collect OHLCV Data
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                     <Label className="text-xs text-muted-foreground">Collect BTC/USDT 1m OHLCV</Label>
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
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-4 w-4" />
                                        Model Training
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-4">
                                    <p className="text-xs text-muted-foreground">Configure and train time series forecasting models using collected data.</p>

                                    {/* Model Selection */}
                                    <div className="space-y-2 border-t border-border pt-3">
                                        <Label htmlFor="model-select" className="text-xs">Select Model</Label>
                                        <Select
                                            value={selectedModel}
                                            onValueChange={(value) => setSelectedModel(value as ModelType)}
                                            disabled={trainingStatus === 'training'}
                                        >
                                            <SelectTrigger id="model-select" className="h-8 text-xs">
                                                <SelectValue placeholder="Select a model..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="LSTM" className="text-xs">LSTM</SelectItem>
                                                <SelectItem value="N-BEATS" className="text-xs">N-BEATS</SelectItem>
                                                <SelectItem value="LightGBM" className="text-xs">LightGBM</SelectItem>
                                                {/* Add other models here */}
                                            </SelectContent>
                                        </Select>
                                    </div>

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
                                            disabled={trainingStatus === 'training'}
                                        />
                                    </div>

                                    {/* Model Configuration (Conditional) */}
                                    <div className="space-y-3 border-t border-border pt-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium flex items-center gap-1">
                                                 {useDefaultConfig ? <Settings className="h-3 w-3" /> : <Settings2 className="h-3 w-3" />}
                                                 {selectedModel} Configuration
                                            </Label>
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="config-switch" className="text-xs text-muted-foreground">
                                                     {useDefaultConfig ? "Default" : "Custom"}
                                                </Label>
                                                <Switch
                                                    id="config-switch"
                                                    checked={!useDefaultConfig} // Inverted logic: checked = custom
                                                    onCheckedChange={(checked) => setUseDefaultConfig(!checked)}
                                                    disabled={trainingStatus === 'training'}
                                                />
                                            </div>
                                        </div>
                                        {/* Render specific inputs */}
                                        {renderModelConfigInputs()}

                                        {/* Start Training Button */}
                                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleStartTraining} disabled={trainingStatus === 'training'}>
                                            {trainingStatus === 'training' ? (
                                                 <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            ) : (
                                                <Play className="h-3 w-3 mr-1" />
                                            )}
                                            Start Training
                                        </Button>

                                        {/* Training Status & Progress */}
                                        {(trainingStatus !== 'idle' || trainingMessage) && (
                                            <div className="pt-1 space-y-1">
                                                {trainingStatus === 'training' && trainingProgress !== null && (
                                                    <Progress value={trainingProgress} className="h-2 w-full" />
                                                )}
                                                <span className={cn(
                                                    "text-xs px-1.5 py-0.5 rounded block w-fit", // Use block for message positioning
                                                    trainingStatus === 'training' && "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 animate-pulse",
                                                    trainingStatus === 'completed' && "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50",
                                                    trainingStatus === 'error' && "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50",
                                                    trainingStatus === 'idle' && trainingMessage && "text-muted-foreground bg-muted/50"
                                                )}>
                                                    {trainingMessage || trainingStatus}
                                                    {trainingStatus === 'training' && trainingProgress !== null && ` (${trainingProgress.toFixed(0)}%)`}
                                                </span>
                                            </div>
                                         )}
                                        <p className="text-xs text-muted-foreground pt-1">Note: This triggers a backend Python script.</p>
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
                                                {trainingStatus === 'training' && (
                                                    <>
                                                     <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-2/3 bg-muted" /></TableCell></TableRow>
                                                     <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-1/2 bg-muted" /></TableCell></TableRow>
                                                    </>
                                                )}
                                                {(trainingStatus === 'completed' || trainingStatus === 'error') && validationResults.length === 0 && trainingStatus !== 'training' && (
                                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-2">No validation results yet.</TableCell></TableRow>
                                                )}
                                                {validationResults.map((result, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="text-xs py-1">{result.model}</TableCell>
                                                        <TableCell className="text-xs py-1">{result.metric}</TableCell>
                                                        <TableCell className="text-right text-xs py-1">{result.value}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {/* Placeholder for other models if not trained */}
                                                {!validationResults.some(r => r.model === 'N-BEATS') && trainingStatus !== 'training' && (
                                                    <TableRow className="opacity-50">
                                                        <TableCell className="text-xs py-1 text-muted-foreground">N-BEATS</TableCell>
                                                        <TableCell className="text-xs py-1 text-muted-foreground">RMSE</TableCell>
                                                        <TableCell className="text-right text-xs py-1 text-muted-foreground">-</TableCell>
                                                    </TableRow>
                                                )}
                                                {!validationResults.some(r => r.model === 'LightGBM') && trainingStatus !== 'training' && (
                                                     <TableRow className="opacity-50">
                                                        <TableCell className="text-xs py-1 text-muted-foreground">LightGBM</TableCell>
                                                        <TableCell className="text-xs py-1 text-muted-foreground">MAE</TableCell>
                                                        <TableCell className="text-right text-xs py-1 text-muted-foreground">-</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                     </div>

                                </AccordionContent>
                            </AccordionItem>

                            {/* 3. Model Testing Section */}
                            <AccordionItem value="model-testing" className="border-b-0">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-b text-foreground">
                                    <div className="flex items-center gap-2">
                                        <History className="h-4 w-4" />
                                        Model Testing
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-4">
                                    <p className="text-xs text-muted-foreground">Perform backtesting and front testing on trained models.</p>
                                    <div className="space-y-2 border-t border-border pt-3">
                                         <Label className="text-xs">Testing Configuration (Placeholder)</Label>
                                         <Select disabled={validationResults.length === 0 || trainingStatus === 'training'}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select Trained Model..." />
                                            </SelectTrigger>
                                             <SelectContent>
                                                 {validationResults.map(vr => (
                                                     <SelectItem key={vr.model} value={vr.model.toLowerCase()} className="text-xs">{vr.model} (Trained)</SelectItem>
                                                 ))}
                                                  {validationResults.length === 0 && (
                                                     <SelectItem value="none" disabled className="text-xs">No models trained yet</SelectItem>
                                                  )}
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
                                                <TableCell className="text-xs py-1">{validationResults[0]?.model ?? 'N/A'}</TableCell>
                                                <TableCell className="text-xs py-1">P/L %</TableCell>
                                                <TableCell className="text-right text-xs py-1">-</TableCell>
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="text-xs py-1">{validationResults[0]?.model ?? 'N/A'}</TableCell>
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
                        <p className="text-xs text-muted-foreground mb-2">
                            Train and deploy RL agents for trading strategies. (Placeholder - UI only)
                        </p>
                         <Accordion type="multiple" className="w-full">
                             <AccordionItem value="rl-config" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-t text-foreground">
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
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                    <div className="flex items-center gap-2"><Play className="h-4 w-4" />Train Agent</div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <Input type="number" placeholder="Training Timesteps" className="h-8 text-xs" disabled/>
                                    <Button size="sm" variant="outline" className="text-xs h-7" disabled>Start RL Training (Placeholder)</Button>
                                    <p className="text-xs text-muted-foreground pt-1">Status: Idle</p>
                                    <Progress value={null} className="h-2 w-full" /> {/* Placeholder Progress */}
                                </AccordionContent>
                             </AccordionItem>
                             <AccordionItem value="rl-testing" className="border-b-0">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-b text-foreground">
                                     <div className="flex items-center gap-2"><History className="h-4 w-4" />Agent Testing</div>
                                </AccordionTrigger>
                                 <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <p className="text-xs text-muted-foreground">Backtest the trained RL agent.</p>
                                    <Button size="sm" variant="outline" className="text-xs h-7" disabled>Run Backtest (Placeholder)</Button>
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
                                <span onClick={(e) => {e.stopPropagation(); fetchIndicators();}} className="ml-1">
                                     <Button
                                        variant="ghost"
                                        size="icon"
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
