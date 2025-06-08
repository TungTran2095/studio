import { ExperimentConfig, ExperimentResults, ExperimentType } from '@/types/experiment';
import { getMarketData } from '../market-data/market-data-service';
import { calculateMetrics } from './metrics-calculator';
import { runBacktest } from './backtest-engine';
import { runHypothesisTest } from './hypothesis-test';

export class ExperimentService {
  private static instance: ExperimentService;
  
  private constructor() {}
  
  public static getInstance(): ExperimentService {
    if (!ExperimentService.instance) {
      ExperimentService.instance = new ExperimentService();
    }
    return ExperimentService.instance;
  }
  
  async createExperiment(config: Partial<ExperimentConfig>): Promise<ExperimentConfig> {
    // Validate config
    this.validateConfig(config);
    
    // Create new experiment
    const experiment: ExperimentConfig = {
      id: crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...config,
    } as ExperimentConfig;
    
    // Save to database
    await this.saveExperiment(experiment);
    
    return experiment;
  }
  
  async runExperiment(experimentId: string): Promise<ExperimentResults> {
    // Get experiment
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error('Experiment not found');
    }
    
    // Update status
    experiment.status = 'running';
    await this.saveExperiment(experiment);
    
    try {
      // Get market data
      const marketData = await getMarketData({
        symbols: experiment.symbols,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        timeframe: experiment.timeframe,
      });
      
      // Run experiment based on type
      let results: ExperimentResults;
      if (experiment.type === 'backtest') {
        results = await runBacktest(experiment, marketData);
      } else {
        results = await runHypothesisTest(experiment, marketData);
      }
      
      // Calculate metrics
      results.metrics = calculateMetrics(results);
      
      // Update experiment with results
      experiment.results = results;
      experiment.status = 'completed';
      await this.saveExperiment(experiment);
      
      return results;
    } catch (error) {
      // Update status on error
      experiment.status = 'failed';
      await this.saveExperiment(experiment);
      throw error;
    }
  }
  
  private validateConfig(config: Partial<ExperimentConfig>) {
    if (!config.name) {
      throw new Error('Experiment name is required');
    }
    if (!config.type) {
      throw new Error('Experiment type is required');
    }
    if (!config.startDate || !config.endDate) {
      throw new Error('Start date and end date are required');
    }
    if (!config.symbols?.length) {
      throw new Error('At least one symbol is required');
    }
    if (!config.timeframe) {
      throw new Error('Timeframe is required');
    }
    
    // Validate type-specific config
    if (config.type === 'backtest') {
      if (!config.initialCapital) {
        throw new Error('Initial capital is required for backtest');
      }
      if (!config.positionSize) {
        throw new Error('Position size is required for backtest');
      }
    } else if (config.type === 'hypothesis') {
      if (!config.hypothesis) {
        throw new Error('Hypothesis is required for hypothesis test');
      }
      if (!config.significanceLevel) {
        throw new Error('Significance level is required for hypothesis test');
      }
      if (!config.testType) {
        throw new Error('Test type is required for hypothesis test');
      }
    }
  }
  
  private async saveExperiment(experiment: ExperimentConfig): Promise<void> {
    // TODO: Implement database save
    console.log('Saving experiment:', experiment);
  }
  
  private async getExperiment(id: string): Promise<ExperimentConfig | null> {
    // TODO: Implement database get
    console.log('Getting experiment:', id);
    return null;
  }
} 