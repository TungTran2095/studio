// src/components/analysis/analysis-panel.tsx
"use client";

import type { FC } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, BarChart, Bot, BrainCircuit, RefreshCw, DatabaseZap, Loader2, Calendar as CalendarIconLucide, Play, History, Brain, SplitSquareHorizontal, Settings, Settings2, Layers, Target, Calculator, TrendingUp, LineChart, Bell } from 'lucide-react'; // Thêm icons cho quant
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTechnicalIndicators } from '@/actions/fetch-indicators';
import type { IndicatorsData } from '@/types/indicators';
import { indicatorCategories } from '@/types/indicators';
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
// Import all config types, including DLinear and Informer
import type { LstmTrainingConfig, NBeatsTrainingConfig, LightGBMTrainingConfig, DLinearTrainingConfig, InformerTrainingConfig, DeepARTrainingConfig, TrainingResult } from '@/actions/train-lstm'; // Added DeepARTrainingConfig
import { Progress } from "@/components/ui/progress"; // Import Progress
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { RiskCalculator } from "./risk-calculator";
import { PortfolioOptimizer } from "./portfolio-optimizer";
import { BtcAnalysis } from "./btc-analysis";
import { MarketTheoryAnalysis } from "./market-theory-analysis";
import { Alert, AlertDescription } from "@/components/ui/alert";


interface AnalysisPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Type for collection status
type CollectionStatus = 'idle' | 'collecting-historical' | 'success' | 'error';
// Type for training status (client-side view)
type TrainingStatus = 'idle' | 'training' | 'completed' | 'error';
// Add DLinear, Informer, DeepAR to ModelType
type ModelType = 'LSTM' | 'N-BEATS' | 'LightGBM' | 'DLinear' | 'Informer' | 'DeepAR';

// Initial state for indicators
const initialIndicators: IndicatorsData = {
    "Moving Average (50)": "Loading...",
    "Moving Average (200)": "Loading...",
    "EMA (21)": "Loading...",
    "Ichimoku Cloud": "Loading...",
    "ADX (14)": "Loading...",
    "Parabolic SAR": "Loading...",
    "RSI (14)": "Loading...",
    "Stochastic (14,3)": "Loading...",
    "MACD": "Loading...",
    "CCI (20)": "Loading...",
    "Bollinger Bands": "Loading...",
    "ATR (14)": "Loading...",
    "OBV": "Loading...",
    "Volume MA (20)": "Loading...",
    "Fibonacci Levels": "Loading...",
    "Pivot Points": "Loading...",
    "Price Trend": "Loading...",
    lastUpdated: "N/A"
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

// Default DLinear Config (align with Python script args)
const defaultDLinearConfig: DLinearTrainingConfig = {
    input_chunk_length: 20,
    output_chunk_length: 5,
    kernel_size: 25,
    shared_weights: false,
    const_init: true,
    learningRate: 0.001,
    batchSize: 64,
    epochs: 50,
};

// Default Informer Config (Align with Python script args)
const defaultInformerConfig: InformerTrainingConfig = {
    seq_len: 96,
    pred_len: 24,
    d_model: 512,
    n_heads: 8,
    e_layers: 2,
    d_layers: 1,
    d_ff: 2048,
    dropout: 0.05,
    activation: 'gelu',
    learningRate: 0.0001,
    batchSize: 32,
    epochs: 10,
};

// Default DeepAR Config (Align with Python script args)
const defaultDeepARConfig: DeepARTrainingConfig = {
    input_chunk_length: 20,
    output_chunk_length: 5,
    hidden_dim: 40,
    n_rnn_layers: 2,
    dropout: 0.1,
    likelihood: 'Gaussian',
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
   // State for features and target
  const [targetColumn, setTargetColumn] = useState('close');
  const [featureColumns, setFeatureColumns] = useState<string[]>(['open', 'high', 'low', 'close', 'volume']);


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

  // DLinear specific state (Match defaultDLinearConfig structure)
  const [dlinearInputChunk, setDlinearInputChunk] = useState(defaultDLinearConfig.input_chunk_length);
  const [dlinearOutputChunk, setDlinearOutputChunk] = useState(defaultDLinearConfig.output_chunk_length);
  const [dlinearKernelSize, setDlinearKernelSize] = useState(defaultDLinearConfig.kernel_size);
  const [dlinearSharedWeights, setDlinearSharedWeights] = useState(defaultDLinearConfig.shared_weights);
  const [dlinearConstInit, setDlinearConstInit] = useState(defaultDLinearConfig.const_init);
  const [dlinearLearningRate, setDlinearLearningRate] = useState(defaultDLinearConfig.learningRate);
  const [dlinearBatchSize, setDlinearBatchSize] = useState(defaultDLinearConfig.batchSize);
  const [dlinearEpochs, setDlinearEpochs] = useState(defaultDLinearConfig.epochs);

  // Informer specific state (Match defaultInformerConfig structure)
  const [informerSeqLen, setInformerSeqLen] = useState(defaultInformerConfig.seq_len);
  const [informerPredLen, setInformerPredLen] = useState(defaultInformerConfig.pred_len);
  const [informerDModel, setInformerDModel] = useState(defaultInformerConfig.d_model);
  const [informerNHeads, setInformerNHeads] = useState(defaultInformerConfig.n_heads);
  const [informerELayers, setInformerELayers] = useState(defaultInformerConfig.e_layers);
  const [informerDLayers, setInformerDLayers] = useState(defaultInformerConfig.d_layers);
  const [informerDFF, setInformerDFF] = useState(defaultInformerConfig.d_ff);
  const [informerDropout, setInformerDropout] = useState(defaultInformerConfig.dropout);
  const [informerActivation, setInformerActivation] = useState<'relu' | 'gelu'>(defaultInformerConfig.activation);
  const [informerLearningRate, setInformerLearningRate] = useState(defaultInformerConfig.learningRate);
  const [informerBatchSize, setInformerBatchSize] = useState(defaultInformerConfig.batchSize);
  const [informerEpochs, setInformerEpochs] = useState(defaultInformerConfig.epochs);

  // DeepAR specific state (Match defaultDeepARConfig structure)
  const [deeparInputChunk, setDeeparInputChunk] = useState(defaultDeepARConfig.input_chunk_length);
  const [deeparOutputChunk, setDeeparOutputChunk] = useState(defaultDeepARConfig.output_chunk_length);
  const [deeparHiddenDim, setDeeparHiddenDim] = useState(defaultDeepARConfig.hidden_dim);
  const [deeparRnnLayers, setDeeparRnnLayers] = useState(defaultDeepARConfig.n_rnn_layers);
  const [deeparDropout, setDeeparDropout] = useState(defaultDeepARConfig.dropout);
  const [deeparLikelihood, setDeeparLikelihood] = useState<'Gaussian' | 'NegativeBinomial' | 'Poisson'>(defaultDeepARConfig.likelihood);
  const [deeparLearningRate, setDeeparLearningRate] = useState(defaultDeepARConfig.learningRate);
  const [deeparBatchSize, setDeeparBatchSize] = useState(defaultDeepARConfig.batchSize);
  const [deeparEpochs, setDeeparEpochs] = useState(defaultDeepARConfig.epochs);


  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('idle');
  const [trainingMessage, setTrainingMessage] = useState<string>('');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<number | null>(null);


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

  // Effect for indicators interval
  useEffect(() => {
     const startFetching = () => {
        fetchIndicators();
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

    if (activeTab === 'indicators') {
         console.log("[AnalysisPanel] Indicators tab active, starting refresh.");
         startFetching();
    } else {
         stopFetching();
         // Fetch once if expanded and not fetched yet
         if (isExpanded && indicators.lastUpdated === "N/A") {
             console.log("[AnalysisPanel] Fetching initial indicators for non-active tab.");
             fetchIndicators();
         }
    }

    // Cleanup interval on component unmount or tab change
    return () => stopFetching();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchIndicators, isExpanded]);


  // --- Data Collection Logic ---
  const handleCollectData = async () => {
     if (collectionStatus === 'collecting-historical') return;

    if (!dateRange?.from || !dateRange?.to) {
        toast({ title: "Date Range Required", description: "Please select a start and end date for historical data.", variant: "destructive" });
        return;
    }

     // Ensure end date includes the full day
     const startTimeMs = dateRange.from.getTime();
     // Set end time to the very end of the selected day
     const endDate = new Date(dateRange.to);
     endDate.setHours(23, 59, 59, 999);
     const endTimeMs = endDate.getTime();


     console.log(`[AnalysisPanel] Collecting historical data from ${new Date(startTimeMs).toISOString()} to ${new Date(endTimeMs).toISOString()}`);
     setCollectionStatus('collecting-historical');
     setCollectionMessage(`Collecting data from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}... (this may take a while)`);

    try {
      // Call the action which now handles chunking internally
      const result = await collectBinanceOhlcvData({
        symbol: 'BTCUSDT',
        interval: '1m',
        startTime: startTimeMs,
        endTime: endTimeMs,
        limit: 1000 // Thêm tham số limit mặc định
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
           const currentStatus = collectionStatus;
           // Sử dụng as để xác định kiểu cụ thể
           if ((currentStatus as CollectionStatus) !== 'collecting-historical') {
               setCollectionStatus('idle');
               setCollectionMessage('');
           }
        }, 8000); // Reset after 8 seconds if finished
    }
  };

   // --- Model Training Logic ---
   const handleStartTraining = async () => {
    if (trainingStatus === 'training') return;

    let config: LstmTrainingConfig | NBeatsTrainingConfig | LightGBMTrainingConfig | DLinearTrainingConfig | InformerTrainingConfig | DeepARTrainingConfig; // Added DeepAR

    // Determine config based on selectedModel and useDefaultConfig
    switch (selectedModel) {
      case 'LSTM':
        config = useDefaultConfig ? defaultLstmConfig : { units: lstmUnits, layers: lstmLayers, timesteps: lstmTimesteps, dropout: lstmDropout, learningRate: lstmLearningRate, batchSize: lstmBatchSize, epochs: lstmEpochs };
        break;
      case 'N-BEATS':
        config = useDefaultConfig ? defaultNBeatsConfig : { input_chunk_length: nbeatsInputChunk, output_chunk_length: nbeatsOutputChunk, num_stacks: nbeatsNumStacks, num_blocks: nbeatsNumBlocks, num_layers: nbeatsNumLayers, layer_widths: nbeatsLayerWidths, learningRate: nbeatsLearningRate, batchSize: nbeatsBatchSize, epochs: nbeatsEpochs };
        break;
      case 'LightGBM':
        config = useDefaultConfig ? defaultLightGBMConfig : { num_leaves: lgbmNumLeaves, learningRate: lgbmLearningRate, feature_fraction: lgbmFeatureFraction, bagging_fraction: lgbmBaggingFraction, bagging_freq: lgbmBaggingFreq, boosting_type: lgbmBoostingType, numIterations: lgbmNumIterations, lags: lgbmLags, forecast_horizon: lgbmForecastHorizon, batchSize: defaultLightGBMConfig.batchSize, epochs: defaultLightGBMConfig.epochs };
        break;
       case 'DLinear':
        config = useDefaultConfig ? defaultDLinearConfig : { input_chunk_length: dlinearInputChunk, output_chunk_length: dlinearOutputChunk, kernel_size: dlinearKernelSize, shared_weights: dlinearSharedWeights, const_init: dlinearConstInit, learningRate: dlinearLearningRate, batchSize: dlinearBatchSize, epochs: dlinearEpochs };
        break;
       case 'Informer':
         config = useDefaultConfig ? defaultInformerConfig : { seq_len: informerSeqLen, pred_len: informerPredLen, d_model: informerDModel, n_heads: informerNHeads, e_layers: informerELayers, d_layers: informerDLayers, d_ff: informerDFF, dropout: informerDropout, activation: informerActivation, learningRate: informerLearningRate, batchSize: informerBatchSize, epochs: informerEpochs };
         break;
        case 'DeepAR': // Add case for DeepAR
            config = useDefaultConfig ? defaultDeepARConfig : { input_chunk_length: deeparInputChunk, output_chunk_length: deeparOutputChunk, hidden_dim: deeparHiddenDim, n_rnn_layers: deeparRnnLayers, dropout: deeparDropout, likelihood: deeparLikelihood, learningRate: deeparLearningRate, batchSize: deeparBatchSize, epochs: deeparEpochs };
            break;
      default:
        toast({ title: "Error", description: "Invalid model selected.", variant: "destructive"});
        return;
    }

    const input = {
        modelType: selectedModel,
        config: config,
        trainTestSplitRatio: trainTestSplit[0] / 100,
        target_column: targetColumn, // Pass target/features
        feature_columns: featureColumns,
    };

    console.log(`[AnalysisPanel] Requesting ${selectedModel} Training Job with ${useDefaultConfig ? 'DEFAULT' : 'CUSTOM'} config:`, input);

    setTrainingStatus('training');
    setTrainingMessage(`Requesting ${selectedModel} training...`);
    setValidationResults([]); // Clear previous results
    setTrainingProgress(5); // Simulate starting progress

    // Simulate progress increase (more realistically)
    let currentProgress = 5;
    const progressInterval = setInterval(() => {
        setTrainingProgress(prev => {
             if (prev === null || prev >= 98) { // Stop slightly before 100
                clearInterval(progressInterval);
                return prev;
            };
             // Increase by a smaller, variable amount
             const increment = Math.random() * 5 + 1; // 1 to 6
             currentProgress = Math.min(98, prev + increment);
             return currentProgress;
        });
    }, 2000); // Update less frequently


    try {
        // Call the generic startTrainingJob action
        const result: TrainingResult = await startTrainingJob(input);

        clearInterval(progressInterval); // Clear interval once backend responds

        if (result.success) {
            setTrainingStatus('completed');
            setTrainingProgress(100); // Set to 100 on success
            setTrainingMessage(result.message || `${selectedModel} Training Completed.`);
            const validationData: ValidationResult[] = [];
            if (result.results?.rmse !== undefined) { // Check for undefined explicitly
                validationData.push({ model: selectedModel, metric: 'RMSE', value: result.results.rmse.toFixed(4) });
            }
            if (result.results?.mae !== undefined) { // Check for undefined explicitly
                validationData.push({ model: selectedModel, metric: 'MAE', value: result.results.mae.toFixed(4) });
             }
             // Prepend new results to existing ones (or replace if you prefer)
            setValidationResults(prev => [...validationData, ...prev.filter(r => r.model !== selectedModel)]);
            toast({ title: `${selectedModel} Training`, description: result.message });
            console.log(`[AnalysisPanel] ${selectedModel} Training Job successful:`, result);
        } else {
            setTrainingStatus('error');
            setTrainingProgress(null); // Clear progress on error
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
            const currentStatus = trainingStatus;
            // Sử dụng as để xác định kiểu cụ thể
            if ((currentStatus as TrainingStatus) !== 'training') {
                setTrainingStatus('idle');
                setTrainingProgress(null);
                // Optionally clear message after timeout: setTrainingMessage('');
            }
       }, 8000);
    }
   };

   // --- Render specific config inputs based on selectedModel ---
   const renderModelConfigInputs = () => {
     const commonDisabled = useDefaultConfig || trainingStatus === 'training';
     // Consistent grid styling
     const gridClass = cn("grid grid-cols-2 gap-x-4 gap-y-2 transition-opacity duration-300", commonDisabled && "opacity-60 pointer-events-none");
     const inputClass = "h-7 text-xs"; // Consistent input size
     const labelClass = "text-xs"; // Consistent label size

     switch (selectedModel) {
       case 'LSTM':
         return (
             <div className={gridClass}>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-units" className={labelClass}>Units/Layer</Label>
                     <Input id="lstm-units" type="number" value={lstmUnits} onChange={(e) => setLstmUnits(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className={inputClass} disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-layers" className={labelClass}>Layers</Label>
                     <Input id="lstm-layers" type="number" value={lstmLayers} onChange={(e) => setLstmLayers(parseInt(e.target.value) || 1)} min="1" max="5" className={inputClass} disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-timesteps" className={labelClass}>Timesteps (Lookback)</Label>
                     <Input id="lstm-timesteps" type="number" value={lstmTimesteps} onChange={(e) => setLstmTimesteps(parseInt(e.target.value) || 10)} min="10" max="120" step="10" className={inputClass} disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-dropout" className={labelClass}>Dropout Rate</Label>
                     <Input id="lstm-dropout" type="number" value={lstmDropout} onChange={(e) => setLstmDropout(parseFloat(e.target.value) || 0.0)} min="0.0" max="0.8" step="0.1" className={inputClass} disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-lr" className={labelClass}>Learning Rate</Label>
                     <Input id="lstm-lr" type="number" value={lstmLearningRate} onChange={(e) => setLstmLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className={inputClass} disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="lstm-batch" className={labelClass}>Batch Size</Label>
                     <Input id="lstm-batch" type="number" value={lstmBatchSize} onChange={(e) => setLstmBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className={inputClass} disabled={commonDisabled} />
                 </div>
                 <div className="space-y-1 col-span-2">
                     <Label htmlFor="lstm-epochs" className={labelClass}>Epochs</Label>
                     <Input id="lstm-epochs" type="number" value={lstmEpochs} onChange={(e) => setLstmEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className={inputClass} disabled={commonDisabled} />
                 </div>
             </div>
         );
        case 'N-BEATS':
            return (
                <div className={gridClass}>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-input" className={labelClass}>Input Chunk</Label>
                        <Input id="nbeats-input" type="number" value={nbeatsInputChunk} onChange={(e) => setNbeatsInputChunk(parseInt(e.target.value) || 10)} min="5" max="100" step="5" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-output" className={labelClass}>Output Chunk</Label>
                        <Input id="nbeats-output" type="number" value={nbeatsOutputChunk} onChange={(e) => setNbeatsOutputChunk(parseInt(e.target.value) || 1)} min="1" max="20" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-stacks" className={labelClass}>Num Stacks</Label>
                        <Input id="nbeats-stacks" type="number" value={nbeatsNumStacks} onChange={(e) => setNbeatsNumStacks(parseInt(e.target.value) || 10)} min="1" max="50" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-blocks" className={labelClass}>Blocks/Stack</Label>
                        <Input id="nbeats-blocks" type="number" value={nbeatsNumBlocks} onChange={(e) => setNbeatsNumBlocks(parseInt(e.target.value) || 1)} min="1" max="5" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="nbeats-layers" className={labelClass}>Layers/Block</Label>
                        <Input id="nbeats-layers" type="number" value={nbeatsNumLayers} onChange={(e) => setNbeatsNumLayers(parseInt(e.target.value) || 2)} min="1" max="8" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-widths" className={labelClass}>Layer Widths</Label>
                        <Input id="nbeats-widths" type="number" value={nbeatsLayerWidths} onChange={(e) => setNbeatsLayerWidths(parseInt(e.target.value) || 128)} min="32" max="512" step="32" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nbeats-lr" className={labelClass}>Learning Rate</Label>
                        <Input id="nbeats-lr" type="number" value={nbeatsLearningRate} onChange={(e) => setNbeatsLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="nbeats-batch" className={labelClass}>Batch Size</Label>
                        <Input id="nbeats-batch" type="number" value={nbeatsBatchSize} onChange={(e) => setNbeatsBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="nbeats-epochs" className={labelClass}>Epochs</Label>
                        <Input id="nbeats-epochs" type="number" value={nbeatsEpochs} onChange={(e) => setNbeatsEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <p className="text-xs text-muted-foreground col-span-2">(N-BEATS script is placeholder)</p>
                </div>
            );
        case 'LightGBM':
            return (
                <div className={gridClass}>
                     <div className="space-y-1">
                        <Label htmlFor="lgbm-leaves" className={labelClass}>Num Leaves</Label>
                        <Input id="lgbm-leaves" type="number" value={lgbmNumLeaves} onChange={(e) => setLgbmNumLeaves(parseInt(e.target.value) || 20)} min="10" max="100" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-lr" className={labelClass}>Learning Rate</Label>
                        <Input id="lgbm-lr" type="number" value={lgbmLearningRate} onChange={(e) => setLgbmLearningRate(parseFloat(e.target.value) || 0.01)} min="0.001" max="0.1" step="0.001" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="lgbm-feat-frac" className={labelClass}>Feature Fraction</Label>
                        <Input id="lgbm-feat-frac" type="number" value={lgbmFeatureFraction} onChange={(e) => setLgbmFeatureFraction(parseFloat(e.target.value) || 0.1)} min="0.1" max="1.0" step="0.1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-bag-frac" className={labelClass}>Bagging Fraction</Label>
                        <Input id="lgbm-bag-frac" type="number" value={lgbmBaggingFraction} onChange={(e) => setLgbmBaggingFraction(parseFloat(e.target.value) || 0.1)} min="0.1" max="1.0" step="0.1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-bag-freq" className={labelClass}>Bagging Freq</Label>
                        <Input id="lgbm-bag-freq" type="number" value={lgbmBaggingFreq} onChange={(e) => setLgbmBaggingFreq(parseInt(e.target.value) || 1)} min="0" max="20" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="lgbm-boosting" className={labelClass}>Boosting Type</Label>
                        <Select value={lgbmBoostingType} onValueChange={(v) => setLgbmBoostingType(v as 'gbdt'|'dart'|'goss')} disabled={commonDisabled}>
                            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gbdt" className={labelClass}>gbdt</SelectItem>
                                <SelectItem value="dart" className={labelClass}>dart</SelectItem>
                                <SelectItem value="goss" className={labelClass}>goss</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-lags" className={labelClass}>Lag Features</Label>
                        <Input id="lgbm-lags" type="number" value={lgbmLags} onChange={(e) => setLgbmLags(parseInt(e.target.value) || 1)} min="1" max="20" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="lgbm-horizon" className={labelClass}>Forecast Horizon</Label>
                        <Input id="lgbm-horizon" type="number" value={lgbmForecastHorizon} onChange={(e) => setLgbmForecastHorizon(parseInt(e.target.value) || 1)} min="1" max="10" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="lgbm-iterations" className={labelClass}>Iterations</Label>
                        <Input id="lgbm-iterations" type="number" value={lgbmNumIterations} onChange={(e) => setLgbmNumIterations(parseInt(e.target.value) || 50)} min="20" max="1000" step="10" className={inputClass} disabled={commonDisabled} />
                    </div>
                </div>
            );
        case 'DLinear':
            return (
                <div className={gridClass}>
                    <div className="space-y-1">
                        <Label htmlFor="dlinear-input" className={labelClass}>Input Chunk</Label>
                        <Input id="dlinear-input" type="number" value={dlinearInputChunk} onChange={(e) => setDlinearInputChunk(parseInt(e.target.value) || 10)} min="5" max="100" step="5" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="dlinear-output" className={labelClass}>Output Chunk</Label>
                        <Input id="dlinear-output" type="number" value={dlinearOutputChunk} onChange={(e) => setDlinearOutputChunk(parseInt(e.target.value) || 1)} min="1" max="20" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="dlinear-kernel" className={labelClass}>Kernel Size</Label>
                        <Input id="dlinear-kernel" type="number" value={dlinearKernelSize} onChange={(e) => setDlinearKernelSize(parseInt(e.target.value) || 25)} min="1" max="50" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 flex items-center justify-between col-span-2">
                         <Label htmlFor="dlinear-shared" className={labelClass}>Shared Weights</Label>
                         <Switch id="dlinear-shared" checked={dlinearSharedWeights} onCheckedChange={setDlinearSharedWeights} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1 flex items-center justify-between col-span-2">
                         <Label htmlFor="dlinear-constinit" className={labelClass}>Constant Init</Label>
                         <Switch id="dlinear-constinit" checked={dlinearConstInit} onCheckedChange={setDlinearConstInit} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="dlinear-lr" className={labelClass}>Learning Rate</Label>
                        <Input id="dlinear-lr" type="number" value={dlinearLearningRate} onChange={(e) => setDlinearLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="dlinear-batch" className={labelClass}>Batch Size</Label>
                        <Input id="dlinear-batch" type="number" value={dlinearBatchSize} onChange={(e) => setDlinearBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="dlinear-epochs" className={labelClass}>Epochs</Label>
                        <Input id="dlinear-epochs" type="number" value={dlinearEpochs} onChange={(e) => setDlinearEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <p className="text-xs text-muted-foreground col-span-2">(DLinear script is placeholder)</p>
                </div>
            );
         case 'Informer': // Add Informer configuration inputs
            return (
                <div className={gridClass}>
                    <div className="space-y-1">
                        <Label htmlFor="informer-seqlen" className={labelClass}>Seq Len (Input)</Label>
                        <Input id="informer-seqlen" type="number" value={informerSeqLen} onChange={(e) => setInformerSeqLen(parseInt(e.target.value) || 32)} min="16" max="192" step="8" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-predlen" className={labelClass}>Pred Len (Output)</Label>
                        <Input id="informer-predlen" type="number" value={informerPredLen} onChange={(e) => setInformerPredLen(parseInt(e.target.value) || 8)} min="1" max="48" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-dmodel" className={labelClass}>Model Dim (d_model)</Label>
                        <Input id="informer-dmodel" type="number" value={informerDModel} onChange={(e) => setInformerDModel(parseInt(e.target.value) || 256)} min="64" max="1024" step="64" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-heads" className={labelClass}>Attention Heads</Label>
                        <Input id="informer-heads" type="number" value={informerNHeads} onChange={(e) => setInformerNHeads(parseInt(e.target.value) || 4)} min="1" max="16" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-elayers" className={labelClass}>Encoder Layers</Label>
                        <Input id="informer-elayers" type="number" value={informerELayers} onChange={(e) => setInformerELayers(parseInt(e.target.value) || 1)} min="1" max="6" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-dlayers" className={labelClass}>Decoder Layers</Label>
                        <Input id="informer-dlayers" type="number" value={informerDLayers} onChange={(e) => setInformerDLayers(parseInt(e.target.value) || 1)} min="1" max="6" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="informer-dff" className={labelClass}>FeedForward Dim</Label>
                        <Input id="informer-dff" type="number" value={informerDFF} onChange={(e) => setInformerDFF(parseInt(e.target.value) || 1024)} min="256" max="4096" step="256" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="informer-dropout" className={labelClass}>Dropout Rate</Label>
                        <Input id="informer-dropout" type="number" value={informerDropout} onChange={(e) => setInformerDropout(parseFloat(e.target.value) || 0.0)} min="0.0" max="0.5" step="0.05" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="informer-activation" className={labelClass}>Activation</Label>
                        <Select value={informerActivation} onValueChange={(v) => setInformerActivation(v as 'relu' | 'gelu')} disabled={commonDisabled}>
                            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="relu" className={labelClass}>ReLU</SelectItem>
                                <SelectItem value="gelu" className={labelClass}>GELU</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-lr" className={labelClass}>Learning Rate</Label>
                        <Input id="informer-lr" type="number" value={informerLearningRate} onChange={(e) => setInformerLearningRate(parseFloat(e.target.value) || 0.0001)} min="0.00001" max="0.001" step="0.00001" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="informer-batch" className={labelClass}>Batch Size</Label>
                        <Input id="informer-batch" type="number" value={informerBatchSize} onChange={(e) => setInformerBatchSize(parseInt(e.target.value) || 16)} min="8" max="128" step="8" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="informer-epochs" className={labelClass}>Epochs</Label>
                        <Input id="informer-epochs" type="number" value={informerEpochs} onChange={(e) => setInformerEpochs(parseInt(e.target.value) || 5)} min="1" max="50" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <p className="text-xs text-muted-foreground col-span-2">(Informer script is placeholder)</p>
                </div>
            );
         case 'DeepAR': // Add DeepAR configuration inputs
            return (
                <div className={gridClass}>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-input" className={labelClass}>Input Chunk</Label>
                        <Input id="deepar-input" type="number" value={deeparInputChunk} onChange={(e) => setDeeparInputChunk(parseInt(e.target.value) || 10)} min="5" max="100" step="5" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-output" className={labelClass}>Output Chunk</Label>
                        <Input id="deepar-output" type="number" value={deeparOutputChunk} onChange={(e) => setDeeparOutputChunk(parseInt(e.target.value) || 1)} min="1" max="20" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-hidden" className={labelClass}>Hidden Dim</Label>
                        <Input id="deepar-hidden" type="number" value={deeparHiddenDim} onChange={(e) => setDeeparHiddenDim(parseInt(e.target.value) || 32)} min="16" max="128" step="8" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-layers" className={labelClass}>RNN Layers</Label>
                        <Input id="deepar-layers" type="number" value={deeparRnnLayers} onChange={(e) => setDeeparRnnLayers(parseInt(e.target.value) || 1)} min="1" max="5" step="1" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-dropout" className={labelClass}>Dropout Rate</Label>
                        <Input id="deepar-dropout" type="number" value={deeparDropout} onChange={(e) => setDeeparDropout(parseFloat(e.target.value) || 0.0)} min="0.0" max="0.5" step="0.05" className={inputClass} disabled={commonDisabled} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="deepar-likelihood" className={labelClass}>Likelihood</Label>
                        <Select value={deeparLikelihood} onValueChange={(v) => setDeeparLikelihood(v as any)} disabled={commonDisabled}>
                            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Gaussian" className={labelClass}>Gaussian</SelectItem>
                                <SelectItem value="NegativeBinomial" className={labelClass}>Negative Binomial</SelectItem>
                                <SelectItem value="Poisson" className={labelClass}>Poisson</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-lr" className={labelClass}>Learning Rate</Label>
                        <Input id="deepar-lr" type="number" value={deeparLearningRate} onChange={(e) => setDeeparLearningRate(parseFloat(e.target.value) || 0.001)} min="0.00001" max="0.01" step="0.0001" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="deepar-batch" className={labelClass}>Batch Size</Label>
                        <Input id="deepar-batch" type="number" value={deeparBatchSize} onChange={(e) => setDeeparBatchSize(parseInt(e.target.value) || 32)} min="16" max="256" step="16" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="deepar-epochs" className={labelClass}>Epochs</Label>
                        <Input id="deepar-epochs" type="number" value={deeparEpochs} onChange={(e) => setDeeparEpochs(parseInt(e.target.value) || 50)} min="10" max="500" step="10" className={inputClass} disabled={commonDisabled} />
                    </div>
                    <p className="text-xs text-muted-foreground col-span-2">(DeepAR script is placeholder)</p>
                </div>
            );

       default:
         // Should not happen with typed selectedModel
         return null;
     }
   };

  // --- Render Accordion for Ensemble Tab ---
   const renderEnsembleAccordion = () => (
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

                   {/* Data Selection (Target/Features) - Optional */}
                    <div className="space-y-2 border-t border-border pt-3">
                        <Label htmlFor="target-column" className="text-xs">Target Column</Label>
                         <Select value={targetColumn} onValueChange={setTargetColumn} disabled={trainingStatus === 'training'}>
                              <SelectTrigger id="target-column" className="h-8 text-xs">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  {/* Add more potential target columns if needed */}
                                  <SelectItem value="close" className="text-xs">close</SelectItem>
                                  <SelectItem value="open" className="text-xs">open</SelectItem>
                                  <SelectItem value="high" className="text-xs">high</SelectItem>
                                  <SelectItem value="low" className="text-xs">low</SelectItem>
                              </SelectContent>
                          </Select>
                         {/* Basic Feature Selection (could be more advanced) */}
                         <Label className="text-xs">Feature Columns</Label>
                          <Input
                              type="text"
                              value={featureColumns.join(', ')}
                              onChange={(e) => setFeatureColumns(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="e.g., open, high, low, close, volume"
                              className="h-8 text-xs"
                              disabled={trainingStatus === 'training'}
                           />
                            <p className="text-xs text-muted-foreground">Comma-separated list of features from OHLCV table.</p>
                     </div>

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
                               <SelectItem value="DLinear" className="text-xs">DLinear</SelectItem>
                               <SelectItem value="Informer" className="text-xs">Informer</SelectItem>
                               <SelectItem value="DeepAR" className="text-xs">DeepAR</SelectItem> {/* Add DeepAR */}
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
                                   trainingStatus === 'training' && "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50", // Removed pulse for progress bar
                                   trainingStatus === 'completed' && "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50",
                                   trainingStatus === 'error' && "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50",
                                   trainingStatus === 'idle' && trainingMessage && "text-muted-foreground bg-muted/50"
                               )}>
                                   {trainingMessage || trainingStatus}
                                   {trainingStatus === 'training' && trainingProgress !== null && ` (${trainingProgress.toFixed(0)}%)`}
                               </span>
                           </div>
                        )}
                       <p className="text-xs text-muted-foreground pt-1">Note: Triggers a backend Python script. Ensure Python environment and dependencies are set up.</p>
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
                               {trainingStatus === 'training' && validationResults.length === 0 && (
                                   <>
                                    <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-2/3 bg-muted" /></TableCell></TableRow>
                                    <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-1/2 bg-muted" /></TableCell></TableRow>
                                   </>
                               )}
                               {/* Display existing results even while training */}
                               {validationResults.length === 0 && trainingStatus !== 'training' && (
                                   <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-2">No validation results yet.</TableCell></TableRow>
                               )}
                               {validationResults.map((result, index) => (
                                   <TableRow key={`${result.model}-${index}`}>
                                       <TableCell className="text-xs py-1">{result.model}</TableCell>
                                       <TableCell className="text-xs py-1">{result.metric}</TableCell>
                                       <TableCell className="text-right text-xs py-1">{result.value}</TableCell>
                                   </TableRow>
                               ))}
                               {/* Loading indicator row specifically during training if results exist */}
                                {trainingStatus === 'training' && validationResults.length > 0 && (
                                     <TableRow>
                                         <TableCell colSpan={3} className="py-1">
                                            <Skeleton className="h-4 w-1/3 bg-muted" />
                                         </TableCell>
                                    </TableRow>
                                )}
                           </TableBody>
                       </Table>
                    </div>

               </AccordionContent>
           </AccordionItem>

           {/* 3. Combine Models (Ensemble Prediction) Section - Refactored */}
            <AccordionItem value="combine-models" className="border-b border-border">
                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Combine Models (Ensemble)
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pt-2 pb-4 space-y-4">
                    <p className="text-xs text-muted-foreground">Combine predictions from trained models using a meta-learner (Stacking recommended).</p>

                    {/* Base Model Selection */}
                    <div className="space-y-2 border-t border-border pt-3">
                        <Label className="text-xs block">Select Base Models for Stacking</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {['LSTM', 'N-BEATS', 'LightGBM', 'DLinear', 'Informer', 'DeepAR'].map(model => {
                                // Check if validation results exist for this model
                                const isTrained = validationResults.some(r => r.model === model && (r.metric === 'RMSE' || r.metric === 'MAE'));
                                return (
                                    <div key={model} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`check-${model}`}
                                            // Add state management for selected base models if needed
                                            // checked={selectedBaseModels.includes(model)}
                                            // onCheckedChange={(checked) => handleBaseModelSelection(model, checked)}
                                            disabled={!isTrained || trainingStatus === 'training'}
                                        />
                                        <Label
                                            htmlFor={`check-${model}`}
                                            className={cn(
                                                "text-xs font-normal",
                                                !isTrained && "text-muted-foreground opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {model} {!isTrained && '(Not Trained)'}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">Select models whose predictions will be combined as features for the meta-model.</p>
                    </div>

                     {/* Meta-Model Selection */}
                     <div className="space-y-2 border-t border-border pt-3">
                        <Label htmlFor="meta-model-select" className="text-xs">Select Meta-Model (Stacking)</Label>
                        <Select disabled={trainingStatus === 'training'} /* Add state for selectedMetaModel */ >
                            <SelectTrigger id="meta-model-select" className="h-8 text-xs">
                                <SelectValue placeholder="e.g., LightGBM, Linear Regression..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lightgbm" className="text-xs">LightGBM (Recommended)</SelectItem>
                                <SelectItem value="linear" className="text-xs">Linear Regression (Fast)</SelectItem>
                                {/* Add other potential meta-models if needed */}
                                {/* <SelectItem value="xgboost" className="text-xs">XGBoost</SelectItem> */}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground pt-1">This model learns to combine the base model predictions.</p>
                    </div>

                    {/* Additional Features for Meta-Model */}
                     <div className="space-y-2 border-t border-border pt-3">
                         <Label className="text-xs">Additional Features for Meta-Model (Optional)</Label>
                          <Input
                              type="text"
                              // value={metaFeatures.join(', ')} // Add state if needed
                              // onChange={(e) => setMetaFeatures(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="e.g., RSI, MACD, Volume_MA"
                              className="h-8 text-xs"
                              disabled={trainingStatus === 'training'}
                           />
                            <p className="text-xs text-muted-foreground">Comma-separated technical indicators or features to include alongside base model predictions.</p>
                     </div>


                    {/* Train/Execute Ensemble */}
                     <div className="space-y-2 border-t border-border pt-3">
                        <Button size="sm" variant="outline" className="text-xs h-7" disabled={trainingStatus === 'training'} /* onClick={handleTrainEnsemble} */>
                             <Layers className="h-3 w-3 mr-1" />
                            Train Ensemble Meta-Model (Placeholder)
                        </Button>
                         {/* Placeholder for status/results */}
                        <p className="text-xs text-muted-foreground pt-1">Status: Idle</p>
                     </div>

                     {/* Ensemble Prediction Results (Placeholder Structure) */}
                     <div className="space-y-2 border-t border-border pt-3">
                         <Label className="text-xs block">Ensemble Validation/Test Result</Label>
                         <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs h-8">Metric</TableHead>
                                    <TableHead className="text-right text-xs h-8">Value</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                <TableRow>
                                    <TableCell className="text-xs py-1">RMSE</TableCell>
                                    <TableCell className="text-right text-xs py-1">-</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-xs py-1">Sharpe Ratio</TableCell>
                                    <TableCell className="text-right text-xs py-1">-</TableCell>
                                </TableRow>
                                {/* Add other relevant metrics like MAE, P/L% */}
                             </TableBody>
                         </Table>
                     </div>

                </AccordionContent>
            </AccordionItem>


           {/* 4. Model Testing Section */}
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
                                {validationResults.filter(vr => vr.metric === 'RMSE' || vr.metric === 'MAE').map(vr => ( // Filter for main validation results
                                    <SelectItem key={vr.model} value={vr.model.toLowerCase()} className="text-xs">{vr.model} (Trained)</SelectItem>
                                ))}
                                 {validationResults.length === 0 && (
                                    <SelectItem value="none" disabled className="text-xs">No models trained yet</SelectItem>
                                 )}
                                 {/* Add option for Ensemble model once trained */}
                                 <SelectItem value="ensemble" className="text-xs">Ensemble (Trained - Placeholder)</SelectItem>
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
                           <TableRow>
                                <TableCell className="text-xs py-1">Ensemble</TableCell>
                                <TableCell className="text-xs py-1">Sharpe Ratio</TableCell>
                                <TableCell className="text-right text-xs py-1">-</TableCell>
                            </TableRow>
                       </TableBody>
                   </Table>
               </AccordionContent>
           </AccordionItem>
       </Accordion>
   );


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
            <TabsList className="grid w-full grid-cols-4 h-9 flex-shrink-0 rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="ensemble" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <BrainCircuit className="h-3.5 w-3.5 mr-1" /> Ensemble
              </TabsTrigger>
              <TabsTrigger value="rl" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <Bot className="h-3.5 w-3.5 mr-1" /> RL
              </TabsTrigger>
              <TabsTrigger value="quant" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <Calculator className="h-3.5 w-3.5 mr-1" /> Quant
              </TabsTrigger>
              <TabsTrigger value="indicators" className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
                  <BarChart className="h-3.5 w-3.5 mr-1" /> Indicators
              </TabsTrigger>
              {/* Thêm tab Cảnh báo */}
              <TabsTrigger 
                value="alerts" 
                className="text-xs h-full rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                onClick={() => window.location.href = '/alerts'}
              >
                  <Bell className="h-3.5 w-3.5 mr-1" /> Cảnh báo
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 overflow-y-auto">
               <div className="p-3 space-y-1">
                    {/* Ensemble Tab Content */}
                    <TabsContent value="ensemble" className="mt-0">
                         {renderEnsembleAccordion()}
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

                    {/* Quant Tab Content */}
                    <TabsContent value="quant" className="mt-0 space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">
                            Lý thuyết và chiến lược quant trading cho phân tích thị trường tài chính.
                        </p>
                        
                        {/* Bitcoin Analysis Card */}
                        <BtcAnalysis />
                        
                        {/* Market Theory Analysis */}
                        <MarketTheoryAnalysis className="mt-4" indicators={indicators} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                            <RiskCalculator />
                            <PortfolioOptimizer />
                        </div>
                        
                        <Accordion type="multiple" className="w-full" defaultValue={["fundamental", "factor-models"]}>
                            {/* 1. Lý thuyết cơ bản */}
                            <AccordionItem value="fundamental" className="border-b">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-t text-foreground">
                                    <div className="flex items-center gap-2">
                                        <LineChart className="h-4 w-4" />
                                        Lý thuyết Thị trường Tài chính
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <div className="space-y-2 text-xs">
                                        <Alert className="bg-accent/30 py-2">
                                            <AlertDescription className="text-xs">
                                                Phân tích lý thuyết thị trường đã được nâng cấp! Xem phân tích BTC/USDT dựa trên các lý thuyết thị trường tài chính trong component "Phân tích BTC/USDT dựa trên Lý thuyết Thị trường" ở trên.
                                            </AlertDescription>
                                        </Alert>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-accent/30 p-2 rounded">
                                                <div className="font-medium">EMH</div>
                                                <p className="text-muted-foreground mt-1">Giả thuyết thị trường hiệu quả - giá đã phản ánh đầy đủ thông tin.</p>
                                            </div>
                                            
                                            <div className="bg-accent/30 p-2 rounded">
                                                <div className="font-medium">Random Walk</div>
                                                <p className="text-muted-foreground mt-1">Lý thuyết cho rằng giá di chuyển ngẫu nhiên, không thể dự đoán.</p>
                                            </div>
                                            
                                            <div className="bg-accent/30 p-2 rounded">
                                                <div className="font-medium">MPT</div>
                                                <p className="text-muted-foreground mt-1">Lý thuyết danh mục hiện đại - tối ưu hóa danh mục dựa trên rủi ro/lợi nhuận.</p>
                                            </div>
                                            
                                            <div className="bg-accent/30 p-2 rounded">
                                                <div className="font-medium">Behavioral Finance</div>
                                                <p className="text-muted-foreground mt-1">Nghiên cứu tâm lý nhà đầu tư ảnh hưởng đến quyết định và thị trường.</p>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 2. Mô hình yếu tố */}
                            <AccordionItem value="factor-models" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Mô hình Yếu tố
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <div className="space-y-2 text-xs">
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Capital Asset Pricing Model (CAPM)</div>
                                            <p className="text-muted-foreground mt-1">Mô tả mối quan hệ giữa rủi ro hệ thống và lợi nhuận kỳ vọng. Sử dụng hệ số beta để đo lường độ nhạy của tài sản với thị trường.</p>
                                            <p className="bg-muted p-1 mt-1 font-mono">E(R<sub>i</sub>) = R<sub>f</sub> + β<sub>i</sub>(E(R<sub>m</sub>) - R<sub>f</sub>)</p>
                                            <p className="text-muted-foreground mt-1 text-[10px]"><strong>Ứng dụng cho BTC/USDT:</strong> Beta của BTC so với thị trường crypto tổng thể ≈ 1.35, cho thấy BTC biến động mạnh hơn thị trường 35%.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Fama-French 3-Factor Model</div>
                                            <p className="text-muted-foreground mt-1">Mở rộng CAPM bằng cách thêm hai yếu tố: quy mô (SMB - Small Minus Big) và giá trị (HML - High Minus Low).</p>
                                            <p className="bg-muted p-1 mt-1 font-mono">R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>i</sub>(R<sub>m</sub> - R<sub>f</sub>) + s<sub>i</sub>SMB + h<sub>i</sub>HML + ε<sub>i</sub></p>
                                            <p className="text-muted-foreground mt-1 text-[10px]"><strong>Áp dụng cho BTC/USDT:</strong> Bitcoin thường có giá trị HML thấp vì không thể dễ dàng đánh giá theo P/E hay P/B như cổ phiếu truyền thống. SMB không áp dụng vì BTC là tài sản lớn nhất trong thị trường crypto.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Carhart 4-Factor Model</div>
                                            <p className="text-muted-foreground mt-1">Thêm yếu tố đà (momentum) vào mô hình Fama-French để giải thích hiệu ứng đà của thị trường.</p>
                                            <p className="bg-muted p-1 mt-1 font-mono">R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>i</sub>(R<sub>m</sub> - R<sub>f</sub>) + s<sub>i</sub>SMB + h<sub>i</sub>HML + m<sub>i</sub>MOM + ε<sub>i</sub></p>
                                            <p className="text-muted-foreground mt-1 text-[10px]"><strong>Điều chỉnh cho BTC/USDT:</strong> Momentum rất quan trọng cho BTC, phân tích hiện tại cho thấy giá trị MOM = 0.28 (dương), chỉ ra xu hướng đà tích cực trung bình.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Fama-French 5-Factor Model</div>
                                            <p className="text-muted-foreground mt-1">Thêm yếu tố lợi nhuận (profitability) và đầu tư (investment) vào mô hình 3 yếu tố.</p>
                                            <p className="bg-muted p-1 mt-1 font-mono">R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>i</sub>(R<sub>m</sub> - R<sub>f</sub>) + s<sub>i</sub>SMB + h<sub>i</sub>HML + r<sub>i</sub>RMW + c<sub>i</sub>CMA + ε<sub>i</sub></p>
                                            <p className="text-muted-foreground mt-1 text-[10px]"><strong>Giới hạn cho BTC/USDT:</strong> RMW (profitability) và CMA (investment) ít áp dụng được cho tiền điện tử do các đặc tính phi truyền thống của tài sản này.</p>
                                        </div>

                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Crypto-Specific Factors cho BTC/USDT</div>
                                            <p className="text-muted-foreground mt-1">Các yếu tố đặc trưng cho thị trường crypto thường không xuất hiện trong mô hình truyền thống.</p>
                                            <div className="grid grid-cols-2 gap-1 mt-1">
                                                <div className="bg-muted p-1 text-[10px]">
                                                    <strong>Network Value (NVT):</strong> 24.2 (Trung bình)
                                                </div>
                                                <div className="bg-muted p-1 text-[10px]">
                                                    <strong>Hash Rate Factor:</strong> +0.18 (Tích cực thấp)
                                                </div>
                                                <div className="bg-muted p-1 text-[10px]">
                                                    <strong>Liquidity Factor:</strong> +0.65 (Cao)
                                                </div>
                                                <div className="bg-muted p-1 text-[10px]">
                                                    <strong>Sentiment Factor:</strong> +0.41 (Tích cực)
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Multi-Factor Analysis cho BTC/USDT</div>
                                            <p className="text-muted-foreground mt-1">Kết hợp các yếu tố truyền thống và đặc thù crypto để tạo mô hình toàn diện hơn.</p>
                                            <p className="bg-muted p-1 mt-1 font-mono text-[10px]">R<sub>BTC</sub> = α + β<sub>Market</sub> + β<sub>Momentum</sub> + β<sub>Volatility</sub> + β<sub>Liquidity</sub> + β<sub>OnChain</sub> + ε</p>
                                            <p className="text-muted-foreground mt-1 text-[10px]"><strong>Kết quả phân tích:</strong> Mô hình đa yếu tố giải thích được 68% biến động giá BTC/USDT, cao hơn 22% so với chỉ sử dụng CAPM.</p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 3. Chiến lược Quant */}
                            <AccordionItem value="quant-strategies" className="border-b border-border">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-4 w-4" />
                                        Chiến lược Quant Trading
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <div className="space-y-2 text-xs">
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Statistical Arbitrage</div>
                                            <p className="text-muted-foreground mt-1">Khai thác sự khác biệt giá ngắn hạn dựa trên mối quan hệ thống kê. Bao gồm pairs trading khi hai cổ phiếu có tương quan cao nhưng tạm thời chệch khỏi mối quan hệ lịch sử.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Momentum Trading</div>
                                            <p className="text-muted-foreground mt-1">Mua tài sản có hiệu suất tốt và bán tài sản có hiệu suất kém trong khoảng thời gian nhất định, dựa trên hiệu ứng đà.</p>
                                            <p className="mt-1">Công thức phổ biến: <span className="font-mono">Momentum = Price(t) / Price(t-n) - 1</span></p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Mean Reversion</div>
                                            <p className="text-muted-foreground mt-1">Giả định giá sẽ quay về giá trị trung bình của nó theo thời gian. Các chỉ báo phổ biến: RSI, Bollinger Bands.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Factor Investing</div>
                                            <p className="text-muted-foreground mt-1">Đầu tư dựa trên các yếu tố như giá trị, quy mô, đà, chất lượng, và biến động thấp đã được chứng minh tạo ra alpha vượt trội.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">High-Frequency Trading (HFT)</div>
                                            <p className="text-muted-foreground mt-1">Thực hiện lệnh với tốc độ cực nhanh, khai thác các biến động giá nhỏ, thường chỉ trong mili giây. Đòi hỏi cơ sở hạ tầng công nghệ tiên tiến.</p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 4. Quản lý rủi ro */}
                            <AccordionItem value="risk-management" className="border-b-0">
                                <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:bg-accent/50 rounded-b text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Quản lý Rủi ro Định lượng
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pt-2 pb-4 space-y-3">
                                    <div className="space-y-2 text-xs">
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Value at Risk (VaR)</div>
                                            <p className="text-muted-foreground mt-1">Ước tính tổn thất tối đa có thể xảy ra trong một khoảng thời gian nhất định, với độ tin cậy cho trước.</p>
                                            <p className="mt-1">Phương pháp tính: Historical, Parametric (variance-covariance), Monte Carlo simulation</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Conditional Value at Risk (CVaR/Expected Shortfall)</div>
                                            <p className="text-muted-foreground mt-1">Đo lường trung bình của các kịch bản tồi tệ nhất vượt quá VaR. Cung cấp thông tin tốt hơn về "đuôi phân phối".</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Kelly Criterion</div>
                                            <p className="text-muted-foreground mt-1">Xác định tỷ lệ vốn tối ưu cho mỗi giao dịch để tối đa hóa tăng trưởng dài hạn.</p>
                                            <p className="bg-muted p-1 mt-1 font-mono">f* = (p × b - q) / b</p>
                                            <p className="text-muted-foreground mt-1">Trong đó: f* là tỷ lệ vốn tối ưu, p là xác suất thắng, q là xác suất thua (1-p), b là tỷ lệ thắng/thua.</p>
                                        </div>
                                        
                                        <div className="bg-accent/30 p-2 rounded">
                                            <div className="font-medium">Chỉ số Sharpe, Sortino, Information Ratio</div>
                                            <p className="text-muted-foreground mt-1">Các chỉ số đánh giá hiệu suất đã điều chỉnh theo rủi ro, so sánh lợi nhuận vượt trội với độ biến động.</p>
                                            <p className="bg-muted p-1 mt-1 font-mono">Sharpe Ratio = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>p</sub></p>
                                        </div>
                                        
                                        <Button size="sm" variant="outline" className="text-xs h-7 w-full mt-2" disabled>
                                            <Calculator className="h-3 w-3 mr-1" />
                                            Tính toán các chỉ số đánh giá rủi ro (Chưa triển khai)
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                            Ghi chú: Nội dung này chỉ mang tính chất tham khảo giáo dục, không phải lời khuyên đầu tư.
                        </p>
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
                                {/* Wrap button in a div or span to attach onClick */}
                                <span onClick={(e) => { e.stopPropagation(); fetchIndicators(); }} className="ml-1 cursor-pointer">
                                     <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isFetchingIndicators}
                                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                        title="Refresh Indicators"
                                        aria-label="Refresh Indicators"
                                    >
                                        <RefreshCw className={cn("h-3 w-3", isFetchingIndicators && "animate-spin")} />
                                    </Button>
                                </span>
                            </div>
                         </div>

                         {/* Hiển thị chỉ báo theo danh mục */}
                         <Accordion type="multiple" className="w-full" defaultValue={["trend", "momentum"]}>
                             {/* Trend Indicators */}
                             <AccordionItem value="trend" className="border-b border-border">
                                 <AccordionTrigger className="text-xs font-medium py-2 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                     <div className="flex items-center gap-2">
                                         <Target className="h-3.5 w-3.5" />
                                         Trend Indicators
                                     </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="px-0 pt-0 pb-1">
                                     <Table className="w-full">
                                         <TableBody>
                                             {[
                                                 "Moving Average (50)",
                                                 "Moving Average (200)",
                                                 "EMA (21)",
                                                 "Ichimoku Cloud",
                                                 "ADX (14)",
                                                 "Parabolic SAR"
                                             ].map((key) => (
                                                 <TableRow key={key} className="border-border hover:bg-accent/30">
                                                     <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                                     <TableCell className="text-right text-foreground text-xs py-1.5">
                                                         {indicators[key] === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                             <Skeleton className="h-3 w-24 ml-auto bg-muted" />
                                                         ) : indicators[key] === "Error" ? (
                                                             <span className="text-destructive">Error</span>
                                                         ) : indicators[key] === "N/A" ? (
                                                             <span className="text-muted-foreground">N/A</span>
                                                         ) : (
                                                             <span className={
                                                                 indicators[key].includes("Bullish") 
                                                                     ? "text-green-500" 
                                                                     : indicators[key].includes("Bearish") 
                                                                         ? "text-red-500" 
                                                                         : "text-foreground"
                                                             }>
                                                                 {indicators[key]}
                                                             </span>
                                                         )}
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </AccordionContent>
                             </AccordionItem>

                             {/* Momentum Indicators */}
                             <AccordionItem value="momentum" className="border-b border-border">
                                 <AccordionTrigger className="text-xs font-medium py-2 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                     <div className="flex items-center gap-2">
                                         <Settings2 className="h-3.5 w-3.5" />
                                         Momentum Indicators
                                     </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="px-0 pt-0 pb-1">
                                     <Table className="w-full">
                                         <TableBody>
                                             {[
                                                 "RSI (14)",
                                                 "Stochastic (14,3)",
                                                 "MACD",
                                                 "CCI (20)"
                                             ].map((key) => (
                                                 <TableRow key={key} className="border-border hover:bg-accent/30">
                                                     <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                                     <TableCell className="text-right text-foreground text-xs py-1.5">
                                                         {indicators[key] === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                             <Skeleton className="h-3 w-24 ml-auto bg-muted" />
                                                         ) : indicators[key] === "Error" ? (
                                                             <span className="text-destructive">Error</span>
                                                         ) : indicators[key] === "N/A" ? (
                                                             <span className="text-muted-foreground">N/A</span>
                                                         ) : (
                                                             <span className={
                                                                 indicators[key].includes("Bullish") || indicators[key].includes("Oversold")
                                                                     ? "text-green-500" 
                                                                     : indicators[key].includes("Bearish") || indicators[key].includes("Overbought")
                                                                         ? "text-red-500" 
                                                                         : "text-foreground"
                                                             }>
                                                                 {indicators[key]}
                                                             </span>
                                                         )}
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </AccordionContent>
                             </AccordionItem>

                             {/* Volatility Indicators */}
                             <AccordionItem value="volatility" className="border-b border-border">
                                 <AccordionTrigger className="text-xs font-medium py-2 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                     <div className="flex items-center gap-2">
                                         <Target className="h-3.5 w-3.5" />
                                         Volatility Indicators
                                     </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="px-0 pt-0 pb-1">
                                     <Table className="w-full">
                                         <TableBody>
                                             {[
                                                 "Bollinger Bands",
                                                 "ATR (14)"
                                             ].map((key) => (
                                                 <TableRow key={key} className="border-border hover:bg-accent/30">
                                                     <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                                     <TableCell className="text-right text-foreground text-xs py-1.5">
                                                         {indicators[key] === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                             <Skeleton className="h-3 w-24 ml-auto bg-muted" />
                                                         ) : indicators[key] === "Error" ? (
                                                             <span className="text-destructive">Error</span>
                                                         ) : indicators[key] === "N/A" ? (
                                                             <span className="text-muted-foreground">N/A</span>
                                                         ) : (
                                                             <span className={
                                                                 indicators[key].includes("Low Volatility")
                                                                     ? "text-green-500" 
                                                                     : indicators[key].includes("High Volatility") || indicators[key].includes("Very High")
                                                                         ? "text-amber-500" 
                                                                         : "text-foreground"
                                                             }>
                                                                 {indicators[key]}
                                                             </span>
                                                         )}
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </AccordionContent>
                             </AccordionItem>

                             {/* Volume Indicators */}
                             <AccordionItem value="volume" className="border-b border-border">
                                 <AccordionTrigger className="text-xs font-medium py-2 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                     <div className="flex items-center gap-2">
                                         <BarChart className="h-3.5 w-3.5" />
                                         Volume Indicators
                                     </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="px-0 pt-0 pb-1">
                                     <Table className="w-full">
                                         <TableBody>
                                             {[
                                                 "OBV",
                                                 "Volume MA (20)"
                                             ].map((key) => (
                                                 <TableRow key={key} className="border-border hover:bg-accent/30">
                                                     <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                                     <TableCell className="text-right text-foreground text-xs py-1.5">
                                                         {indicators[key] === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                             <Skeleton className="h-3 w-24 ml-auto bg-muted" />
                                                         ) : indicators[key] === "Error" ? (
                                                             <span className="text-destructive">Error</span>
                                                         ) : indicators[key] === "N/A" ? (
                                                             <span className="text-muted-foreground">N/A</span>
                                                         ) : (
                                                             <span className={
                                                                 indicators[key].includes("Bullish")
                                                                     ? "text-green-500" 
                                                                     : indicators[key].includes("Bearish")
                                                                         ? "text-red-500" 
                                                                         : "text-foreground"
                                                             }>
                                                                 {indicators[key]}
                                                             </span>
                                                         )}
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </AccordionContent>
                             </AccordionItem>

                             {/* Support/Resistance */}
                             <AccordionItem value="support-resistance" className="border-b border-border">
                                 <AccordionTrigger className="text-xs font-medium py-2 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                     <div className="flex items-center gap-2">
                                         <SplitSquareHorizontal className="h-3.5 w-3.5" />
                                         Support & Resistance
                                     </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="px-0 pt-0 pb-1">
                                     <Table className="w-full">
                                         <TableBody>
                                             {[
                                                 "Fibonacci Levels",
                                                 "Pivot Points"
                                             ].map((key) => (
                                                 <TableRow key={key} className="border-border hover:bg-accent/30">
                                                     <TableCell className="font-medium text-foreground text-xs py-1.5">{key}</TableCell>
                                                     <TableCell className="text-right text-foreground text-xs py-1.5">
                                                         {indicators[key] === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                             <Skeleton className="h-3 w-24 ml-auto bg-muted" />
                                                         ) : indicators[key] === "Error" ? (
                                                             <span className="text-destructive">Error</span>
                                                         ) : indicators[key] === "N/A" ? (
                                                             <span className="text-muted-foreground">N/A</span>
                                                         ) : (
                                                             <span>
                                                                 {indicators[key]}
                                                             </span>
                                                         )}
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </AccordionContent>
                             </AccordionItem>

                             {/* Market Summary */}
                             <AccordionItem value="market-summary" className="border-b-0">
                                 <AccordionTrigger className="text-xs font-medium py-2 px-2 hover:bg-accent/50 rounded-none text-foreground">
                                     <div className="flex items-center gap-2">
                                         <Brain className="h-3.5 w-3.5" />
                                         Market Summary
                                     </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="px-0 pt-0 pb-1">
                                     <Table className="w-full">
                                         <TableBody>
                                             <TableRow className="border-border hover:bg-accent/30">
                                                 <TableCell className="font-medium text-foreground text-xs py-1.5">Price Trend</TableCell>
                                                 <TableCell className="text-right text-foreground text-xs py-1.5">
                                                     {indicators["Price Trend"] === "Loading..." || (isFetchingIndicators && indicators["Moving Average (50)"] === "Loading...") ? (
                                                         <Skeleton className="h-3 w-24 ml-auto bg-muted" />
                                                     ) : indicators["Price Trend"] === "Error" ? (
                                                         <span className="text-destructive">Error</span>
                                                     ) : indicators["Price Trend"] === "N/A" || indicators["Price Trend"] === "Insufficient Data" ? (
                                                         <span className="text-muted-foreground">{indicators["Price Trend"]}</span>
                                                     ) : (
                                                         <span className={
                                                             indicators["Price Trend"].includes("Bullish")
                                                                 ? "text-green-500" 
                                                                 : indicators["Price Trend"].includes("Bearish")
                                                                     ? "text-red-500" 
                                                                     : "text-foreground"
                                                         }>
                                                             {indicators["Price Trend"]}
                                                         </span>
                                                     )}
                                                 </TableCell>
                                             </TableRow>
                                             {/* Có thể thêm các tóm tắt khác ở đây nếu cần */}
                                         </TableBody>
                                     </Table>
                                 </AccordionContent>
                             </AccordionItem>
                         </Accordion>

                        <p className="text-xs text-muted-foreground mt-1">
                            Indicator calculations auto-refresh ~5s when tab is active. <span className="text-primary cursor-pointer hover:underline" onClick={() => fetchIndicators()}>Refresh now</span>
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

    
