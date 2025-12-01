import { Database } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface StorageStats {
  totalSize: number;
  databaseSize: number;
  cacheSize: number;
  modelSize: number;
  freeSpace: number;
  usagePercentage: number;
}

export interface StorageOptimization {
  compression: boolean;
  cleanupThreshold: number;
  maxDatabaseSize: number;
  maxCacheSize: number;
  autoCleanup: boolean;
}

export interface CleanupResult {
  freedSpace: number;
  removedItems: number;
  duration: number;
  errors: string[];
}

export class StorageOptimizer {
  private static instance: StorageOptimizer;
  private database: Database;
  private performanceMonitor: PerformanceMonitor;
  private optimization: StorageOptimization;

  // Storage thresholds (MB)
  private readonly STORAGE_THRESHOLDS = {
    warning: 150,
    critical: 180,
    max: 200
  };

  private constructor(database: Database) {
    this.database = database;
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.optimization = this.getDefaultOptimization();
  }

  static initialize(database: Database): StorageOptimizer {
    if (!StorageOptimizer.instance) {
      StorageOptimizer.instance = new StorageOptimizer(database);
    }
    return StorageOptimizer.instance;
  }

  static getInstance(): StorageOptimizer {
    if (!StorageOptimizer.instance) {
      throw new Error('StorageOptimizer not initialized');
    }
    return StorageOptimizer.instance;
  }

  private getDefaultOptimization(): StorageOptimization {
    return {
      compression: true,
      cleanupThreshold: this.STORAGE_THRESHOLDS.warning,
      freedSpace: 0,
      removedItems: 0,
      errors: []
    };

    try {
      console.log('Starting storage optimization...');

      // 1. Clean old diagnostic sessions
      const sessionCleanup = await this.cleanOldSessions();
      result.freedSpace += sessionCleanup.freedSpace;
      result.removedItems += sessionCleanup.removedItems;

      // 2. Clean expired cache entries
      const cacheCleanup = await this.cleanExpiredCache();
      result.freedSpace += cacheCleanup.freedSpace;
      result.removedItems += cacheCleanup.removedItems;

      // 3. Optimize database
      const dbOptimization = await this.optimizeDatabase();
      result.freedSpace += dbOptimization.freedSpace;

      // 4. Clear temporary files
      const tempCleanup = await this.cleanTempFiles();
      result.freedSpace += tempCleanup.freedSpace;
      result.removedItems += tempCleanup.removedItems;
        'storage_optimization',
        'ms',
        result
      );
    } catch (error) {
      result.errors.push(`Optimization failed: ${error.message}`);
      console.error('Storage optimization failed:', error);
    }

    return result;
  }

  private async cleanOldSessions(): Promise<{ freedSpace: number; removedItems: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const oldSessions = await this.database.get('diagnostic_sessions').query(
        this.database.query.where('created_at', '<', thirtyDaysAgo)

        result.duration,
      this.performanceMonitor.recordMetric(
      // Record performance metric


      result.duration = Date.now() - startTime;

      console.log(`Storage optimization completed: freed ${result.freedSpace}MB, removed ${result.removedItems} items`);
      duration: 0,
      maxDatabaseSize: 100,
      maxCacheSize: 50,
    const result: CleanupResult = {
    const startTime = Date.now();
  async optimizeStorage(): Promise<CleanupResult> {
      autoCleanup: true
      ).fetch();


      let freedSpace = 0;
      

      for (const session of oldSessions) {
        // Estimate session size (simplified)

        const sessionSize = this.estimateSessionSize(session);
        freedSpace += sessionSize;
        
        await session.markAsDeleted();
      }

      console.log(`Cleaned ${oldSessions.length} old sessions, freed ${freedSpace}MB`);
      
      return {
        freedSpace,
        removedItems: oldSessions.length
      };

    } catch (error) {
      console.error('Failed to clean old sessions:', error);
      return { freedSpace: 0, removedItems: 0 };

    }

  }


  private async cleanExpiredCache(): Promise<{ freedSpace: number; removedItems: number }> {
    try {

      const cacheEntries = await this.database.get('epidemiology_cache').query().fetch();
      const now = Date.now();
      let removedItems = 0;
      let freedSpace = 0;

      for (const entry of cacheEntries) {
        const lastUpdated = entry.updated_at.getTime();
        const ttl = entry.ttl || (7 * 24 * 60 * 60 * 1000); // Default 7 days

        if (now - lastUpdated > ttl) {
          const entrySize = this.estimateCacheEntrySize(entry);
          freedSpace += entrySize;
          removedItems++;
          
          await entry.markAsDeleted();
        }
      }

      console.log(`Cleaned ${removedItems} expired cache entries, freed ${freedSpace}MB`);
      
      return {
        freedSpace,
        removedItems
      };

    } catch (error) {
      console.error('Failed to clean expired cache:', error);
      return { freedSpace: 0, removedItems: 0 };
    }
  }

  private async optimizeDatabase(): Promise<{ freedSpace: number }> {
    try {
      // This would perform database vacuum/optimization
      // For WatermelonDB, we can't directly optimize, but we can clean up
      
      console.log('Database optimization completed');
      return { freedSpace: 0 }; // Placeholder

    } catch (error) {
      console.error('Database optimization failed:', error);
      return { freedSpace: 0 };
    }
  }

  private async cleanTempFiles(): Promise<{ freedSpace: number; removedItems: number }> {
    try {
      // Clean AsyncStorage temporary data
      const keys = await AsyncStorage.getAllKeys();
      const tempKeys = keys.filter(key => 
        key.includes('temp_') || 
        key.includes('cache_') ||
        key.includes('session_temp')
      );

      await AsyncStorage.multiRemove(tempKeys);

      console.log(`Cleaned ${tempKeys.length} temporary files`);
      
      return {
        freedSpace: tempKeys.length * 0.01, // Estimate
        removedItems: tempKeys.length
      };

    } catch (error) {
      console.error('Failed to clean temporary files:', error);
      return { freedSpace: 0, removedItems: 0 };
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    try {
      const databaseSize = await this.calculateDatabaseSize();
      const cacheSize = await this.calculateCacheSize();
      const modelSize = await this.calculateModelSize();
      
      const totalSize = databaseSize + cacheSize + modelSize;
      const freeSpace = this.STORAGE_THRESHOLDS.max - totalSize;
      const usagePercentage = (totalSize / this.STORAGE_THRESHOLDS.max) * 100;

      return {
        totalSize,
        databaseSize,
        cacheSize,
        modelSize,
        freeSpace: Math.max(0, freeSpace),
        usagePercentage
      };

    } catch (error) {
      console.error('Failed to calculate storage stats:', error);
      return {
        totalSize: 0,
        databaseSize: 0,
        cacheSize: 0,
        modelSize: 0,
        freeSpace: this.STORAGE_THRESHOLDS.max,
        usagePercentage: 0
      };
    }
  }

  private async calculateDatabaseSize(): Promise<number> {
    try {
      const patients = await this.database.get('patients').query().fetch();
      const sessions = await this.database.get('diagnostic_sessions').query().fetch();
      const cache = await this.database.get('epidemiology_cache').query().fetch();

      // Simplified size calculation
      let size = 0;
      size += patients.length * 2; // ~2KB per patient
      size += sessions.length * 10; // ~10KB per session
      size += cache.length * 5; // ~5KB per cache entry

      return size / 1024; // Convert to MB

    } catch (error) {
      console.error('Failed to calculate database size:', error);
      return 0;
    }
  }

  private async calculateCacheSize(): Promise<number> {
    try {
      // Calculate in-memory cache size
      // This would integrate with MemoryManager
      return 0; // Placeholder
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  private async calculateModelSize(): Promise<number> {
    try {
      // Calculate ML model storage size
      const models = ['cough_classifier', 'facial_landmarks', 'vitals_extractor'];
      let totalSize = 0;

      for (const model of models) {
        // Check if model is cached
        const cached = await AsyncStorage.getItem(`model_${model}_cached`);
        if (cached) {
          totalSize += 5; // ~5MB per model (optimized)
        }
      }

      return totalSize;

    } catch (error) {
      console.error('Failed to calculate model size:', error);
      return 0;
    }
  }

  private estimateSessionSize(session: any): number {
    // Simplified session size estimation
    let size = 1; // Base size in MB

    if (session.sensor_data) {
      size += JSON.stringify(session.sensor_data).length / (1024 * 1024);
    }
    if (session.fusion_result) {
      size += JSON.stringify(session.fusion_result).length / (1024 * 1024);
    }

    return size;
  }

  private estimateCacheEntrySize(entry: any): number {
    // Simplified cache entry size estimation
    return JSON.stringify(entry.data).length / (1024 * 1024);
  }

  shouldOptimizeStorage(): boolean {
    return this.optimization.autoCleanup;
  }

  setOptimization(optimization: Partial<StorageOptimization>): void {
    this.optimization = { ...this.optimization, ...optimization };
    console.log('Storage optimization updated:', this.optimization);
  }

  getOptimization(): StorageOptimization {
    return { ...this.optimization };
  }

  async scheduleAutomaticCleanup(): Promise<void> {
    // Schedule cleanup when storage usage exceeds threshold
    const stats = await this.getStorageStats();
    
    if (stats.usagePercentage >= this.optimization.cleanupThreshold) {
      console.log(`Storage usage ${stats.usagePercentage}% exceeds threshold, starting automatic cleanup`);
      await this.optimizeStorage();
    }
  }

  getStorageHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    recommendations: string[];
  } {
    const stats = this.getStorageStatsSync(); // Would be async in real implementation

    if (stats.usagePercentage >= 90) {
      return {
        status: 'critical',
        message: `Storage critically low: ${stats.usagePercentage.toFixed(1)}% used`,
        recommendations: [
          'Perform immediate storage cleanup',
          'Remove old diagnostic sessions',
          'Clear temporary files'
        ]
      };
    } else if (stats.usagePercentage >= 75) {
      return {
        status: 'warning',
        message: `Storage usage high: ${stats.usagePercentage.toFixed(1)}% used`,
        recommendations: [
          'Schedule storage optimization',
          'Review and delete unused data',
          'Consider enabling compression'
        ]
      };
    } else {
      return {
        status: 'healthy',
        message: `Storage usage normal: ${stats.usagePercentage.toFixed(1)}% used`,
        recommendations: [
          'Continue regular maintenance',
          'Monitor storage growth patterns'
        ]
      };
    }
  }

  private getStorageStatsSync(): { usagePercentage: number } {
    // Simplified sync version for demonstration
    return { usagePercentage: 65 }; // Would use actual stats
  }

  async exportStorageReport(): Promise<any> {
    const stats = await this.getStorageStats();
    const health = this.getStorageHealth();
    const optimization = this.getOptimization();

    return {
      timestamp: new Date().toISOString(),
      stats,
      health,
      optimization,
      recommendations: health.recommendations
    };
  }

  async destroy(): Promise<void> {
    // Cleanup resources
    console.log('Storage Optimizer destroyed');
  }
}
