import { Database } from '@nozbe/watermelondb';
import { OfflineManager } from './OfflineManager';
import { MeshNetworkManager } from './MeshNetworkManager';
import { ConflictResolver } from './ConflictResolver';
import { EpidemiologyCache } from './EpidemiologyCache';
import { SyncConfigManager } from './SyncConfigManager';

export class SyncModule {
  private static instance: SyncModule;
  private database: Database;
  private offlineManager: OfflineManager;
  private meshManager: MeshNetworkManager;
  private conflictResolver: ConflictResolver;
  private epidemiologyCache: EpidemiologyCache;
  private configManager: SyncConfigManager;

  private constructor(database: Database) {
    this.database = database;
    this.offlineManager = OfflineManager.initialize(database);
    this.meshManager = MeshNetworkManager.initialize(database);
    this.conflictResolver = ConflictResolver.initialize(database);
    this.epidemiologyCache = EpidemiologyCache.initialize(database);
    this.configManager = SyncConfigManager.initialize(database);
  }

  static initialize(database: Database): SyncModule {
    if (!SyncModule.instance) {
      SyncModule.instance = new SyncModule(database);
    }
    return SyncModule.instance;
  }

  static getInstance(): SyncModule {
    if (!SyncModule.instance) {
      throw new Error('SyncModule not initialized');
    }
    return SyncModule.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize configuration first
      await this.configManager.initialize();

      // Initialize other components
      await this.offlineManager.initialize();
      await this.meshManager.initialize();
      await this.conflictResolver.initialize();
      await this.epidemiologyCache.initialize();

      console.log('Sync Module fully initialized');
    } catch (error) {
      console.error('Failed to initialize Sync Module:', error);
      throw error;
    }
  }

  getOfflineManager(): OfflineManager {
    return this.offlineManager;
  }

  getMeshManager(): MeshNetworkManager {
    return this.meshManager;
  }

  getConflictResolver(): ConflictResolver {
    return this.conflictResolver;
  }

  getEpidemiologyCache(): EpidemiologyCache {
    return this.epidemiologyCache;
  }

  getConfigManager(): SyncConfigManager {
    return this.configManager;
  }

  async destroy(): Promise<void> {
    await this.meshManager.destroy();
    await this.offlineManager.destroy();
    // Note: Other components might need cleanup in the future
  }
}
