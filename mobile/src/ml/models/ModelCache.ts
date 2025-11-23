import * as tf from '@tensorflow/tfjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry {
  model: tf.LayersModel;
  timestamp: number;
  size: number;
  accessCount: number;
}

export class ModelCache {
  private static instance: ModelCache;
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100 MB
  private currentSize: number = 0;
  private isInitialized: boolean = false;

  static getInstance(): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache();
    }
    return ModelCache.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load cache metadata from storage
      await this.loadCacheMetadata();
      this.isInitialized = true;
      console.log('Model Cache initialized');
    } catch (error) {
      console.error('Model Cache initialization failed:', error);
      throw error;
    }
  }

  async cacheModel(modelId: string, model: tf.LayersModel): Promise<void> {
    try {
      // Estimate model size (this is approximate)
      const modelSize = this.estimateModelSize(model);
      
      // Check if we need to make space
      await this.makeSpace(modelSize);

      const cacheEntry: CacheEntry = {
        model,
        timestamp: Date.now(),
        size: modelSize,
        accessCount: 0
      };

      this.cache.set(modelId, cacheEntry);
      this.currentSize += modelSize;

      // Update cache metadata
      await this.saveCacheMetadata();

      console.log(`Cached model ${modelId} (${(modelSize / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error(`Failed to cache model ${modelId}:`, error);
    }
  }

  async getModel(modelId: string): Promise<tf.LayersModel | null> {
    const entry = this.cache.get(modelId);
    
    if (!entry) {
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.timestamp = Date.now();

    console.log(`Retrieved model ${modelId} from cache`);
    return entry.model;
  }

  async removeModel(modelId: string): Promise<boolean> {
    const entry = this.cache.get(modelId);
    
    if (!entry) {
      return false;
    }

    // Dispose the model
    entry.model.dispose();
    
    // Update size
    this.currentSize -= entry.size;
    this.cache.delete(modelId);

    await this.saveCacheMetadata();
    console.log(`Removed model ${modelId} from cache`);
    
    return true;
  }

  async clear(): Promise<void> {
    // Dispose all models
    for (const [modelId, entry] of this.cache) {
      entry.model.dispose();
    }

    this.cache.clear();
    this.currentSize = 0;

    await this.saveCacheMetadata();
    console.log('Model cache cleared');
  }

  private estimateModelSize(model: tf.LayersModel): number {
    try {
      // This is a rough estimation based on the number of parameters
      let totalParams = 0;
      
      model.getWeights().forEach(weight => {
        totalParams += weight.size;
      });

      // Assume 4 bytes per parameter (float32)
      return totalParams * 4;
    } catch (error) {
      console.warn('Failed to estimate model size, using default');
      return 5 * 1024 * 1024; // 5 MB default
    }
  }

  private async makeSpace(requiredSize: number): Promise<void> {
    if (this.currentSize + requiredSize <= this.maxSize) {
      return;
    }

    console.log(`Making space in cache, required: ${(requiredSize / 1024 / 1024).toFixed(2)} MB`);

    // Sort entries by access count (least used first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].accessCount - b[1].accessCount);

    let freedSize = 0;
    const modelsToRemove: string[] = [];

    // Remove least used models until we have enough space
    for (const [modelId, entry] of entries) {
      if (this.currentSize - freedSize + requiredSize <= this.maxSize) {
        break;
      }

      modelsToRemove.push(modelId);
      freedSize += entry.size;
    }

    // Remove the selected models
    for (const modelId of modelsToRemove) {
      await this.removeModel(modelId);
    }

    console.log(`Freed ${(freedSize / 1024 / 1024).toFixed(2)} MB from cache`);
  }

  private async saveCacheMetadata(): Promise<void> {
    try {
      const metadata = {
        currentSize: this.currentSize,
        entries: Array.from(this.cache.entries()).map(([modelId, entry]) => ({
          modelId,
          timestamp: entry.timestamp,
          size: entry.size,
          accessCount: entry.accessCount
        }))
      };

      await AsyncStorage.setItem('model_cache_metadata', JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save cache metadata:', error);
    }
  }
      utilization: (this.currentSize / this.maxSize) * 100,
      models: Array.from(this.cache.entries()).map(([modelId, entry]) => ({
        modelId,
        size: entry.size,
        accessCount: entry.accessCount,
        lastAccess: new Date(entry.timestamp).toISOString()
      }))
    };
  }
}
