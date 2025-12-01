import * as tf from '@tensorflow/tfjs';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';
import { Database } from '@nozbe/watermelondb';

export interface MemoryState {
  usedJS: number;
  usedNative: number;
  total: number;
  tensorCount: number;
  cacheSize: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryWarning {
  level: 'warning' | 'critical';
  message: string;
  timestamp: number;
  suggestedAction: string;
}

export interface CacheEntry {
  id: string;
  type: 'model' | 'sensor_data' | 'image' | 'audio' | 'result';
  size: number;
  lastAccessed: number;
  accessCount: number;
  ttl: number;
}

export class MemoryManager extends EventEmitter {
  private static instance: MemoryManager;
  private database: Database;
  private cache: Map<string, CacheEntry> = new Map();
  private memoryState = new MemoryState();
  private isMonitoring = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Memory thresholds (MB)
  private readonly MEMORY_THRESHOLDS = {
    low: 200,
    medium: 350,
    high: 450,
    critical: 500
  };

  // Cache configuration
  private readonly CACHE_CONFIG = {
    maxTotalSize: 100, // MB
    maxTensorCount: 1000,
    cleanupInterval: 30000, // 30 seconds
    defaultTTL: 10 * 60 * 1000 // 10 minutes
  };

  private constructor(database: Database) {
    super();
    this.database = database;
  }

  static initialize(database: Database): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(database);
    }
    return MemoryManager.instance;
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      throw new Error('MemoryManager not initialized');
    }
    return MemoryManager.instance;
  }

  async initialize(): Promise<void> {
    await this.startMemoryMonitoring();
    await this.loadCacheState();
    console.log('Memory Manager initialized');
  }

  private async startMemoryMonitoring(): Promise<void> {
    this.isMonitoring = true;

    // Monitor memory state continuously
    this.cleanupInterval = setInterval(() => {
      this.updateMemoryState();
      this.cleanupCache();
    }, this.CACHE_CONFIG.cleanupInterval);

    // Initial state update
    await this.updateMemoryState();
  }

  private async updateMemoryState(): Promise<void> {
    try {
      const tfMemory = tf.memory();
      const tensorMemory = (tfMemory.numBytes / (1024 * 1024)); // Convert to MB

      // Estimate JavaScript memory (simplified)
      const estimatedJsMemory = this.estimateJsMemoryUsage();

      // Update memory state
      this.memoryState = {
        usedJS: estimatedJsMemory,
        usedNative: tensorMemory,
        total: this.MEMORY_THRESHOLDS.critical, // Use critical threshold as total reference
        tensorCount: tfMemory.numTensors,
        cacheSize: this.calculateCacheSize(),
        pressure: this.calculateMemoryPressure(estimatedJsMemory + tensorMemory)
      };

      // Emit warnings if memory pressure is high
      this.checkMemoryWarnings();

      // Log memory state periodically
      if (this.memoryState.pressure === 'critical') {
        console.warn('CRITICAL MEMORY PRESSURE:', this.memoryState);
      }

    } catch (error) {
      console.error('Failed to update memory state:', error);
    }
  }

  private estimateJsMemoryUsage(): number {
    // Simplified JavaScript memory estimation
    // In production, use React Native's Memory module or performance.memory
    let estimatedMemory = 50; // Base JS memory

    // Add cache memory
    estimatedMemory += this.calculateCacheSize();

    // Add estimated component memory
    estimatedMemory += this.cache.size * 0.1;

    return estimatedMemory;
  }

  private calculateMemoryPressure(totalMemory: number): MemoryState['pressure'] {
    if (totalMemory >= this.MEMORY_THRESHOLDS.critical) return 'critical';
    if (totalMemory >= this.MEMORY_THRESHOLDS.high) return 'high';
    if (totalMemory >= this.MEMORY_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

    // Check if we have space
    if (!this.hasCacheSpace(size)) {
      await this.makeCacheSpace(size);
    
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.lastAccessed > entry.ttl) {
      this.cache.delete(id);
      return null;
    }

    // Update access info
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.cache.set(id, entry);

    // In a real implementation, we would retrieve the actual data
    // For now, return null as we're not storing the actual data in this simplified cache
    return null;
  }

  private hasCacheSpace(requiredSize: number): boolean {
    const currentSize = this.calculateCacheSize();
    return currentSize + requiredSize <= this.CACHE_CONFIG.maxTotalSize * 1024; // Convert MB to KB
  }

  private async makeCacheSpace(requiredSize: number): Promise<void> {
    let freedSpace = 0;
    const entries = Array.from(this.cache.entries());

    // Sort by least recently used and least accessed
    entries.sort(([, a], [, b]) => {
      const scoreA = a.lastAccessed + (a.accessCount * 1000);
      const scoreB = b.lastAccessed + (b.accessCount * 1000);
      return scoreA - scoreB;
    });

    for (const [id, entry] of entries) {
      if (freedSpace >= requiredSize) break;

      this.cache.delete(id);
      freedSpace += entry.size;

      console.log(`Evicted cache entry: ${id} (freed ${entry.size}KB)`);
    }

    await this.saveCacheState();
    console.log(`Freed ${freedSpace}KB from cache`);
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.cache.forEach((entry, id) => {
      if (now - entry.lastAccessed > entry.ttl) {
        this.cache.delete(id);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired cache entries`);
      this.saveCacheState();
    }

    // Force TensorFlow.js cleanup
    tf.disposeVariables();
  }

  private calculateCacheSize(): number {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });
    return totalSize / 1024; // Return in MB
  }

  private estimateObjectSize(obj: any): number {
    // Simplified size estimation
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size; // Size in bytes
  }

  async forceCleanup(): Promise<void> {
    console.log('Forcing memory cleanup...');

    // Clear all caches
    this.cache.clear();

    // Clear TensorFlow.js memory
    tf.disposeVariables();
    tf.engine().startScope();
    tf.engine().endScope();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Update memory state
    await this.updateMemoryState();

    console.log('Memory cleanup completed');
  }

    tf.ENV.set('WEBGL_SIZE_UPLOAD_UNIFORM', 0);

    // Use memory growth to avoid OOM errors
    const backend = tf.engine().backend;
    if (backend && (backend as any).getMemoryInfo) {
      const memoryInfo = (backend as any).getMemoryInfo();
      console.log('TensorFlow memory info:', memoryInfo);
    }
  }

  async loadCacheState(): Promise<void> {
    try {
      // In a real implementation, load cache state from persistent storage
      // For now, initialize empty cache
      this.cache.clear();
    } catch (error) {
      console.error('Failed to load cache state:', error);
    }
  }

  async saveCacheState(): Promise<void> {
    try {
      // In a real implementation, save cache state to persistent storage
      // For now, just log the cache state
      console.log(`Cache state saved: ${this.cache.size} entries, ${this.calculateCacheSize().toFixed(2)}MB`);
    } catch (error) {
      console.error('Failed to save cache state:', error);
    }
  }

  getMemoryState(): MemoryState {
    return { ...this.memoryState };
  }

  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    evictionCount: number;
  } {
    return {
      totalEntries: this.cache.size,
      totalSize: this.calculateCacheSize(),
      hitRate: this.calculateHitRate(),
      evictionCount: 0 // Would track in production
    };
  }

  private calculateHitRate(): number {
    // Simplified hit rate calculation
    const totalAccesses = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.accessCount, 0
    );
    return totalAccesses > 0 ? (this.cache.size / totalAccesses) * 100 : 0;
  }

  async destroy(): Promise<void> {
    this.isMonitoring = false;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.forceCleanup();
    this.removeAllListeners();
    
    console.log('Memory Manager destroyed');
  }
}    tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
  optimizeTensorFlowMemory(): void {
    // Configure TensorFlow.js for mobile optimization
    }

    const entry = this.cache.get(id);
    this.cache.set(id, cacheEntry);
  getCachedItem<T>(id: string): T | null {

  }
    await this.saveCacheState();

    console.log(`Cached item ${id} (${type}, ${size}KB)`);

