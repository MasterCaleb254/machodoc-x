import { Database } from '@nozbe/watermelondb';
import { MeshNetworkManager } from './MeshNetworkManager';
import { OfflineManager } from './OfflineManager';

export interface CachedEpidemiology {
  id: string;
  county: string;
  data: {
    conditionCounts: { [condition: string]: number };
    symptomPatterns: string[];
    riskFactors: string[];
    timestamp: number;
    confidence: number;
  };
  lastUpdated: number;
  source: 'mesh' | 'cloud' | 'local';
  ttl: number; // Time to live in milliseconds
}

export class EpidemiologyCache {
  private static instance: EpidemiologyCache;
  private database: Database;
  private meshManager: MeshNetworkManager;
  private offlineManager: OfflineManager;
  private cache: Map<string, CachedEpidemiology> = new Map();

  // Cache configuration
  private readonly CACHE_CONFIG = {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxCacheSize: 1000,
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  };

  private constructor(database: Database) {
    this.database = database;
    this.meshManager = MeshNetworkManager.getInstance();
    this.offlineManager = OfflineManager.getInstance();
  }

  static initialize(database: Database): EpidemiologyCache {
    if (!EpidemiologyCache.instance) {
      EpidemiologyCache.instance = new EpidemiologyCache(database);
    }
    return EpidemiologyCache.instance;
  }

  static getInstance(): EpidemiologyCache {
    if (!EpidemiologyCache.instance) {
      throw new Error('EpidemiologyCache not initialized');
    }
    return EpidemiologyCache.instance;
  }

  async initialize(): Promise<void> {
    await this.loadCacheFromDatabase();
    this.startCleanupService();
    this.setupMeshListeners();
    
    console.log('Epidemiology Cache initialized');
  }

  private async loadCacheFromDatabase(): Promise<void> {
    try {
      const cacheEntries = await this.database.get('epidemiology_cache').query().fetch();
      
      cacheEntries.forEach((entry: any) => {
        this.cache.set(entry.county, {
          id: entry.id,
          county: entry.county,
          data: entry.data,
          lastUpdated: entry.updated_at.getTime(),
          source: entry.source,
          ttl: entry.ttl || this.CACHE_CONFIG.defaultTTL
        });
      });

      console.log(`Loaded ${this.cache.size} epidemiology cache entries`);
    } catch (error) {
      console.error('Failed to load epidemiology cache:', error);
    }
  }

  private startCleanupService(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CACHE_CONFIG.cleanupInterval);
  }

  private setupMeshListeners(): void {
    this.meshManager.on('epidemiologyUpdate', (data: any) => {
      this.updateFromMesh(data);
    });
  }

  async getEpidemiologyData(county: string): Promise<CachedEpidemiology | null> {
    // Check memory cache first
    const cached = this.cache.get(county);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }

    // Try to load from database
    try {
      const dbEntry = await this.database.get('epidemiology_cache').query(
        this.database.query.where('county', county)
      ).fetch();

      if (dbEntry.length > 0) {
        const entry = dbEntry[0];
        const epidemiology: CachedEpidemiology = {
          id: entry.id,
          county: entry.county,
          data: entry.data,
          lastUpdated: entry.updated_at.getTime(),
          source: entry.source,
          ttl: entry.ttl || this.CACHE_CONFIG.defaultTTL
        };

        if (!this.isExpired(epidemiology)) {
          this.cache.set(county, epidemiology);
          return epidemiology;
        } else {
          // Remove expired entry
          await this.removeEntry(entry.id);
        }
      }
    } catch (error) {
      console.error('Failed to load epidemiology data from database:', error);
    }

    return null;
  }

  async updateFromMesh(meshData: any): Promise<void> {
    const { county, conditionCounts, symptomPatterns, riskFactors, timestamp } = meshData;

    const existing = await this.getEpidemiologyData(county);
    const now = Date.now();

    let updatedData: any;

    if (existing) {
      // Merge with existing data
      updatedData = this.mergeEpidemiologyData(existing.data, {
        conditionCounts,
        symptomPatterns,
        riskFactors,
        timestamp,
        confidence: 0.7 // Mesh data confidence
      });
    } else {
      // Create new entry
      updatedData = {
        conditionCounts,
        symptomPatterns,
        riskFactors,
        timestamp,
        confidence: 0.7
      };
    }

    const cacheEntry: CachedEpidemiology = {
      id: existing?.id || this.generateCacheId(),
      county,
      data: updatedData,
      lastUpdated: now,
      source: 'mesh',
      ttl: this.CACHE_CONFIG.defaultTTL
    };

    await this.saveToCache(cacheEntry);
    console.log(`Updated epidemiology cache for ${county} from mesh network`);
  }

  async updateFromCloud(cloudData: any): Promise<void> {
    const { county, data } = cloudData;
    const now = Date.now();

    const cacheEntry: CachedEpidemiology = {
      id: this.generateCacheId(),
      county,
      data: {
        ...data,
        timestamp: now,
        confidence: 0.9 // Cloud data has higher confidence
      },
      lastUpdated: now,
      source: 'cloud',
      ttl: this.CACHE_CONFIG.defaultTTL
    };

    await this.saveToCache(cacheEntry);
    console.log(`Updated epidemiology cache for ${county} from cloud`);
  }

  async updateFromLocalAnalysis(patientData: any[]): Promise<void> {
    // Aggregate local patient data for epidemiology
    const conditionCounts: { [key: string]: number } = {};
    const symptomPatterns: Set<string> = new Set();
    const riskFactors: Set<string> = new Set();

    patientData.forEach(patient => {
      if (patient.fusionResult?.conditions) {
        patient.fusionResult.conditions.forEach((condition: any) => {
          if (condition.probability > 0.6) {
            conditionCounts[condition.condition] = 
              (conditionCounts[condition.condition] || 0) + 1;
          }
        });
      }

      if (patient.sensorData?.symptoms) {
        Object.keys(patient.sensorData.symptoms).forEach(symptom => {
          symptomPatterns.add(symptom);
        });
      }
    }

    const cacheEntry: CachedEpidemiology = {
      id: existing?.id || this.generateCacheId(),
      county,
      data: updatedData,
      lastUpdated: now,
      source: 'local',
      ttl: this.CACHE_CONFIG.defaultTTL
    };

    await this.saveToCache(cacheEntry);
    console.log(`Updated epidemiology cache from local analysis: ${Object.keys(conditionCounts).length} conditions`);
  }

  private mergeEpidemiologyData(existing: any, newData: any): any {
    // Merge condition counts
    const mergedConditionCounts = { ...existing.conditionCounts };
    Object.entries(newData.conditionCounts).forEach(([condition, count]) => {
      mergedConditionCounts[condition] = (mergedConditionCounts[condition] || 0) + (count as number);
    });

    // Merge symptom patterns
    const mergedSymptomPatterns = [...new Set([
      ...(existing.symptomPatterns || []),
      ...(newData.symptomPatterns || [])
    ])];

    // Merge risk factors
    const mergedRiskFactors = [...new Set([
      ...(existing.riskFactors || []),
      ...(newData.riskFactors || [])
    ])];

    // Calculate weighted confidence
    const totalWeight = existing.confidence + newData.confidence;
    const mergedConfidence = (
      (existing.confidence * existing.confidence + newData.confidence * newData.confidence) / 
      totalWeight
    );

    return {
      conditionCounts: mergedConditionCounts,
      symptomPatterns: mergedSymptomPatterns,
      riskFactors: mergedRiskFactors,
      timestamp: Math.max(existing.timestamp, newData.timestamp),
      confidence: mergedConfidence
    };
  }

  private async saveToCache(entry: CachedEpidemiology): Promise<void> {
    // Update memory cache
    this.cache.set(entry.county, entry);

    // Update database
    await this.offlineManager.queueOperation(async () => {
      await this.database.write(async () => {
        const cacheCollection = this.database.collections.get('epidemiology_cache');
        
        const existing = await cacheCollection.query(
          this.database.query.where('county', entry.county)
        ).fetch();

        if (existing.length > 0) {
          // Update existing
          const cacheEntry = existing[0];
          await cacheEntry.update((c: any) => {
            c.data = entry.data;
            c.source = entry.source;
            c.ttl = entry.ttl;
            c.updated_at = new Date();
            c.sync_status = 'pending';
          });
        } else {
          // Create new
          await cacheCollection.create((c: any) => {
            c.county = entry.county;
            c.data = entry.data;
            c.source = entry.source;
            c.ttl = entry.ttl;
            c.created_at = new Date();
            c.updated_at = new Date();
            c.sync_status = 'pending';
          });
        }
      });
    }, { operationType: 'save_epidemiology_cache' });

    // Enforce cache size limit
    if (this.cache.size > this.CACHE_CONFIG.maxCacheSize) {
      await this.removeOldestEntries();
    }
  }

  private async removeOldestEntries(): Promise<void> {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastUpdated - b.lastUpdated);

    const toRemove = entries.slice(0, Math.floor(this.cache.size * 0.1)); // Remove oldest 10%

    for (const entry of toRemove) {
      await this.removeEntry(entry.id);
      this.cache.delete(entry.county);
    }

    console.log(`Removed ${toRemove.length} old epidemiology cache entries`);
  }

  private async removeEntry(id: string): Promise<void> {
    await this.database.write(async () => {
      const cacheCollection = this.database.collections.get('epidemiology_cache');
      const entry = await cacheCollection.find(id);
      await entry.markAsDeleted();
    });
  }

  private isExpired(entry: CachedEpidemiology): boolean {
    return Date.now() - entry.lastUpdated > entry.ttl;
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    this.cache.forEach((entry, county) => {
      if (this.isExpired(entry)) {
        expired.push(county);
      }
    });

    for (const county of expired) {
      const entry = this.cache.get(county)!;
      await this.removeEntry(entry.id);
      this.cache.delete(county);
    }

    if (expired.length > 0) {
      console.log(`Cleaned up ${expired.length} expired epidemiology cache entries`);
    }
  }

  getCacheStats(): {
    totalEntries: number;
    counties: string[];
    memorySize: number;
    lastCleanup: number;
  } {
    return {
      totalEntries: this.cache.size,
      counties: Array.from(this.cache.keys()),
      memorySize: this.calculateMemorySize(),
      lastCleanup: Date.now()
    };
  }

  private calculateMemorySize(): number {
    let size = 0;
    this.cache.forEach(entry => {
      size += JSON.stringify(entry).length;
    });
    return size;
  }

  private generateCacheId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `epi_cache_${timestamp}_${random}`;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    
    // Clear database cache
    await this.database.write(async () => {
      const cacheEntries = await this.database.get('epidemiology_cache').query().fetch();
      for (const entry of cacheEntries) {
        await entry.markAsDeleted();
      }
    });

    console.log('Epidemiology cache cleared');
  }
}
