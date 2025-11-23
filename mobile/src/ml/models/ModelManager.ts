import { asyncStorageIO, bundleResourceIO } from '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { ModelCache } from './ModelCache';
import { ModelValidator } from './ModelValidator';
import { ModelDownloader } from './ModelDownloader';

export interface ModelConfig {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'segmentation' | 'detection';
  inputShape: number[];
  outputShape: number[];
  quantized: boolean;
  size: number; // in bytes
  minTfjsVersion: string;
  required: boolean;
  performance: {
    latency: number; // ms
    accuracy: number; // 0-1
    memoryUsage: number; // MB
  };
}

export interface ModelMetadata {
  config: ModelConfig;
  loaded: boolean;
  loadTime: number;
  lastUsed: number;
  usageCount: number;
  performanceStats: {
    averageInferenceTime: number;
    totalInferences: number;
    lastInferenceTime: number;
  };
}

export interface InferenceResult {
  output: tf.Tensor | tf.Tensor[];
  inferenceTime: number;
  confidence?: number;
  error?: string;
}

export class ModelManager {
  private static instance: ModelManager;
  private models: Map<string, tf.LayersModel> = new Map();
  private modelMetadata: Map<string, ModelMetadata> = new Map();
  private modelCache: ModelCache;
  private modelValidator: ModelValidator;
  private modelDownloader: ModelDownloader;
  private isInitialized: boolean = false;

  // Model configurations for MachoDoc X
  private readonly modelConfigs: Map<string, ModelConfig> = new Map([
    ['cough_classifier', {
      id: 'cough_classifier',
      name: 'Cough Sound Classifier',
      version: '1.0.0',
      type: 'classification',
      inputShape: [1, 16000, 1], // 1-second audio at 16kHz
      outputShape: [1, 5], // 5 cough types
      quantized: true,
      size: 2.1 * 1024 * 1024, // 2.1 MB
      minTfjsVersion: '4.0.0',
      required: true,
      performance: {
        latency: 120,
        accuracy: 0.87,
        memoryUsage: 50
      }
    }],
    ['facial_landmarks', {
      id: 'facial_landmarks',
      name: 'Facial Landmark Detector',
      version: '1.0.0',
      type: 'detection',
      inputShape: [1, 192, 192, 3], // RGB image
      outputShape: [1, 68, 2], // 68 landmarks (x,y)
      quantized: true,
      size: 3.8 * 1024 * 1024, // 3.8 MB
      minTfjsVersion: '4.0.0',
      required: true,
      performance: {
        latency: 85,
        accuracy: 0.92,
        memoryUsage: 75
      }
    }],
    ['vitals_extractor', {
      id: 'vitals_extractor',
      name: 'Vitals from Video',
      version: '1.0.0',
      type: 'regression',
      inputShape: [1, 180, 180, 3], // Video frame sequence
      outputShape: [1, 3], // HR, RR, HRV
      quantized: true,
      size: 1.5 * 1024 * 1024, // 1.5 MB
      minTfjsVersion: '4.0.0',
      required: true,
      performance: {
        latency: 200,
        accuracy: 0.82,
        memoryUsage: 60
      }
    }],
    ['skin_condition', {
      id: 'skin_condition',
      name: 'Skin Condition Classifier',
      version: '1.0.0',
      type: 'classification',
      inputShape: [1, 224, 224, 3],
      outputShape: [1, 8], // 8 skin conditions
      quantized: true,
      size: 4.2 * 1024 * 1024, // 4.2 MB
      minTfjsVersion: '4.0.0',
      required: false,
      performance: {
        latency: 95,
        accuracy: 0.85,
        memoryUsage: 80
      }
    }],
    ['urine_strip', {
      id: 'urine_strip',
      name: 'Urine Strip Analyzer',
      version: '1.0.0',
      type: 'regression',
      inputShape: [1, 128, 128, 3],
      outputShape: [1, 6], // 6 urine parameters
      quantized: true,
      size: 1.8 * 1024 * 1024, // 1.8 MB
      minTfjsVersion: '4.0.0',
      required: false,
      performance: {
        latency: 65,
        accuracy: 0.89,
        memoryUsage: 45
      }
    }]
  ]);

  private constructor() {
    this.modelCache = ModelCache.getInstance();
    this.modelValidator = ModelValidator.getInstance();
    this.modelDownloader = ModelDownloader.getInstance();
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow.js
      await this.initializeTensorFlow();

      // Initialize subsystems
      await this.modelCache.initialize();
      await this.modelDownloader.initialize();

      // Load required models
      await this.loadRequiredModels();

      this.isInitialized = true;
      console.log('Model Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Model Manager:', error);
      throw error;
    }
  }

  private async initializeTensorFlow(): Promise<void> {
    try {
      // Wait for TensorFlow to be ready
      await tf.ready();
      
      // Set backend (WebGL for React Native)
      console.log('TensorFlow.js backend:', tf.getBackend());
      
      // Configure TensorFlow for mobile optimization
      tf.env().set('WEBGL_CPU_FORWARD', false);
      tf.env().set('WEBGL_SIZE_UPLOAD_UNIFORM', 0);
      
      console.log('TensorFlow.js initialized successfully');
    } catch (error) {
      console.error('TensorFlow initialization failed:', error);
      throw error;
    }
  }

  private async loadRequiredModels(): Promise<void> {
    const requiredModels = Array.from(this.modelConfigs.values())
      .filter(config => config.required);

    console.log(`Loading ${requiredModels.length} required models...`);

    for (const config of requiredModels) {
      try {
        await this.loadModel(config.id);
        console.log(`Loaded required model: ${config.name}`);
      } catch (error) {
        console.error(`Failed to load required model ${config.name}:`, error);
        // Critical models should throw, non-critical can be handled gracefully
        if (config.required) {
          throw error;
        }
      }
    }
  }

  async loadModel(modelId: string): Promise<tf.LayersModel> {
    if (this.models.has(modelId)) {
      console.log(`Model ${modelId} already loaded`);
      return this.models.get(modelId)!;
    }

    const config = this.modelConfigs.get(modelId);
    if (!config) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    const startTime = Date.now();

    try {
      // Check cache first
      let model = await this.modelCache.getModel(modelId);
      
      if (!model) {
        console.log(`Loading model ${modelId} from storage...`);
        
        // Load from bundle or downloaded storage
        model = await this.loadModelFromStorage(config);
        
        // Cache the model
        await this.modelCache.cacheModel(modelId, model);
      }

      // Validate the model
      await this.modelValidator.validateModel(model, config);

      // Store the model
      this.models.set(modelId, model);
      
      // Update metadata
      const loadTime = Date.now() - startTime;
      this.updateModelMetadata(modelId, config, loadTime);

      console.log(`Model ${modelId} loaded successfully in ${loadTime}ms`);
      return model;

    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      
      // Try to download the model if loading fails
      try {
        console.log(`Attempting to download model ${modelId}...`);
        await this.modelDownloader.downloadModel(config);
        return await this.loadModel(modelId); // Retry loading
      } catch (downloadError) {
        throw new Error(`Failed to load and download model ${modelId}: ${downloadError.message}`);
      }
    }
  }

  private async loadModelFromStorage(config: ModelConfig): Promise<tf.LayersModel> {
    const modelPath = this.getModelPath(config.id);
    
    try {
      // Check if model file exists
      const exists = await RNFS.exists(modelPath);
      if (!exists) {
        throw new Error(`Model file not found: ${modelPath}`);
      }

      // Load model using TensorFlow.js
    input: tf.Tensor | tf.Tensor[], 
      const model = await tf.loadLayersModel(`file://${modelPath}`);
      return model;
    options: { warmup?: boolean } = {}
    const model = await this.getModel(modelId);
    const startTime = Date.now();

    try {
      // Warmup run for more accurate timing
      if (options.warmup) {
        await this.warmupModel(model, input);
      }

      // Run inference
      const output = model.predict(input);
      const inferenceTime = Date.now() - startTime;

      // Update performance stats
      this.updateInferenceStats(modelId, inferenceTime);

      let confidence: number | undefined;
      if (output instanceof tf.Tensor) {
        confidence = this.calculateConfidence(output);
      }

      return {
        output,
        inferenceTime,
        confidence
      };

    } catch (error) {
      console.error(`Inference failed for model ${modelId}:`, error);
      return {
        output: tf.tensor(0),
        inferenceTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async warmupModel(model: tf.LayersModel, input: tf.Tensor | tf.Tensor[]): Promise<void> {
    try {
      // Run a warmup inference to initialize the model
      const warmupOutput = model.predict(input);
      
      // Dispose the warmup output to free memory
      if (warmupOutput instanceof tf.Tensor) {
        warmupOutput.dispose();
      } else if (Array.isArray(warmupOutput)) {
        warmupOutput.forEach(tensor => tensor.dispose());
      }
      
      // Force garbage collection if available
      if (tf.memory().numTensors > 100) {
        tf.disposeVariables();
      }
    } catch (error) {
      console.warn('Model warmup failed:', error);
    }
  }

  private calculateConfidence(output: tf.Tensor): number {
    try {
      const data = output.dataSync();
      if (data.length === 0) return 0;

      // For classification: use softmax and max probability
      if (output.shape.length === 2 && output.shape[1] > 1) {
        const probabilities = tf.softmax(output).dataSync();
        return Math.max(...probabilities);
      }

      // For regression: use inverse of normalized variance
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
      return Math.max(0, 1 - Math.sqrt(variance));

    } catch (error) {
      console.warn('Confidence calculation failed:', error);
      return 0.5;
    }
  }

  async getModel(modelId: string): Promise<tf.LayersModel> {
    if (!this.models.has(modelId)) {
      await this.loadModel(modelId);
    }
    
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    return model;
  }

  async unloadModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      model.dispose();
      this.models.delete(modelId);
      console.log(`Model ${modelId} unloaded`);
    }
  }

  async unloadAllModels(): Promise<void> {
    for (const [modelId, model] of this.models) {
      model.dispose();
      console.log(`Unloaded model: ${modelId}`);
    }
    this.models.clear();
    
    // Clear TensorFlow memory
    tf.disposeVariables();
  }

  getModelStatus(modelId: string): ModelMetadata | null {
    return this.modelMetadata.get(modelId) || null;
  }

  getAllModelStatus(): Map<string, ModelMetadata> {
    return new Map(this.modelMetadata);
  }

  getTotalMemoryUsage(): number {
    return tf.memory().numBytes;
  }

  async checkForUpdates(): Promise<Map<string, boolean>> {
    const updateStatus = new Map<string, boolean>();
    
    for (const [modelId, config] of this.modelConfigs) {
      try {
        const hasUpdate = await this.modelDownloader.checkForUpdate(config);
        updateStatus.set(modelId, hasUpdate);
      } catch (error) {
        console.error(`Error checking update for ${modelId}:`, error);
        updateStatus.set(modelId, false);
      }
    }
    
    return updateStatus;
  }

  async updateModel(modelId: string): Promise<boolean> {
    const config = this.modelConfigs.get(modelId);
    if (!config) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    try {
      // Unload current model
      await this.unloadModel(modelId);
      
      // Download updated model
      await this.modelDownloader.downloadModel(config);
      
      // Load new model
      await this.loadModel(modelId);
      
      console.log(`Model ${modelId} updated successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to update model ${modelId}:`, error);
      return false;
    }
  }

  private updateModelMetadata(modelId: string, config: ModelConfig, loadTime: number): void {
    this.modelMetadata.set(modelId, {
      config,
      loaded: true,
      loadTime,
      lastUsed: Date.now(),
      usageCount: 0,
      performanceStats: {
        averageInferenceTime: 0,
        totalInferences: 0,
        lastInferenceTime: 0
      }
    });
  }

  private updateInferenceStats(modelId: string, inferenceTime: number): void {
    const metadata = this.modelMetadata.get(modelId);
    if (!metadata) return;

    metadata.lastUsed = Date.now();
    metadata.usageCount++;

    const stats = metadata.performanceStats;
    stats.lastInferenceTime = inferenceTime;
    stats.totalInferences++;
    
    // Update average inference time
    if (stats.averageInferenceTime === 0) {
      stats.averageInferenceTime = inferenceTime;
    } else {
      stats.averageInferenceTime = 
        (stats.averageInferenceTime * (stats.totalInferences - 1) + inferenceTime) / 
        stats.totalInferences;
    }
  }

  private getModelPath(modelId: string): string {
    return `${RNFS.DocumentDirectoryPath}/models/${modelId}/model.json`;
  }

  // Memory management
  async cleanupMemory(): Promise<void> {
    // Dispose unused tensors
    tf.disposeVariables();
    
    // Clear model cache if memory is high
    const memoryInfo = tf.memory();
    if (memoryInfo.numTensors > 1000) {
      await this.modelCache.clear();
      console.log('Cleared model cache due to high memory usage');
    }
  }

  // Performance monitoring
  getPerformanceReport(): any {
    const report: any = {
      totalModels: this.models.size,
      totalMemoryUsage: this.getTotalMemoryUsage(),
      memoryInfo: tf.memory(),
      modelPerformance: {}
    };

    for (const [modelId, metadata] of this.modelMetadata) {
      report.modelPerformance[modelId] = {
        loaded: metadata.loaded,
        loadTime: metadata.loadTime,
        usageCount: metadata.usageCount,
        performanceStats: metadata.performanceStats
      };
    }

    return report;
  }
}  ): Promise<InferenceResult> {

    modelId: string, 
  async runInference(
    } catch (error) {
      console.error(`Error loading model from storage ${modelPath}:`, error);
      throw error;
    }

