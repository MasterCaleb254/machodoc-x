import { Database } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncConfig {
  enabled: boolean;
  syncInterval: number; // in milliseconds
  useMeshNetwork: boolean;
  maxOfflineStorageDays: number;
  autoSync: boolean;
  meshBroadcastInterval: number;
  epidemiologyUpdateInterval: number;
}

export class SyncConfigManager {
  private static instance: SyncConfigManager;
  private database: Database;
  private config: SyncConfig = {
    enabled: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    useMeshNetwork: true,
    maxOfflineStorageDays: 30,
    autoSync: true,
    meshBroadcastInterval: 5 * 60 * 1000, // 5 minutes
    epidemiologyUpdateInterval: 60 * 60 * 1000 // 1 hour
  };

  private constructor(database: Database) {
    this.database = database;
  }

  static initialize(database: Database): SyncConfigManager {
    if (!SyncConfigManager.instance) {
      SyncConfigManager.instance = new SyncConfigManager(database);
    }
    return SyncConfigManager.instance;
  }

  static getInstance(): SyncConfigManager {
    if (!SyncConfigManager.instance) {
      throw new Error('SyncConfigManager not initialized');
    }
    return SyncConfigManager.instance;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    console.log('Sync Config Manager initialized');
  }

  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('sync_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load sync config:', error);
    }
  }

  async updateConfig(newConfig: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    try {
      await AsyncStorage.setItem('sync_config', JSON.stringify(this.config));
      console.log('Sync config updated:', this.config);
    } catch (error) {
      console.error('Failed to save sync config:', error);
      throw error;
    }
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getSyncInterval(): number {
    return this.config.syncInterval;
  }

  shouldUseMeshNetwork(): boolean {
    return this.config.useMeshNetwork;
  }

  getMaxOfflineStorageDays(): number {
    return this.config.maxOfflineStorageDays;
  }
  isAutoSyncEnabled(): boolean {
    return this.config.autoSync;
  }
  }
  getMeshBroadcastInterval(): number {
    return this.config.meshBroadcastInterval;

  getEpidemiologyUpdateInterval(): number {
  }

  // Method to reset to defaults
  async resetToDefaults(): Promise<void> {
    const defaultConfig: SyncConfig = {
      enabled: true,
      syncInterval: 5 * 60 * 1000,
      useMeshNetwork: true,
      maxOfflineStorageDays: 30,
      autoSync: true,
      meshBroadcastInterval: 5 * 60 * 1000,
      epidemiologyUpdateInterval: 60 * 60 * 1000
    };

    await this.updateConfig(defaultConfig);
  }
}    return this.config.epidemiologyUpdateInterval;



