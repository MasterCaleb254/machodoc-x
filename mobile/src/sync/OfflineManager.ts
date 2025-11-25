import { Database } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { BehaviorSubject } from 'rxjs';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: number | null;
  pendingOperations: number;
  syncState: 'idle' | 'syncing' | 'error';
  error?: string;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private database: Database;
  private syncStatus = new BehaviorSubject<SyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingOperations: 0,
    syncState: 'idle'
  });

  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing = false;
  private networkListener: any = null;

  private constructor(database: Database) {
    this.database = database;
  }

  static initialize(database: Database): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager(database);
    }
    return OfflineManager.instance;
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      throw new Error('OfflineManager not initialized. Call initialize() first.');
    }
    return OfflineManager.instance;
  }

  async initialize(): Promise<void> {
    await this.setupNetworkMonitoring();
    await this.initializeDatabase();
    console.log('Offline Manager initialized');
  }

  private async setupNetworkMonitoring(): Promise<void> {
    this.networkListener = NetInfo.addEventListener(state => {
      });
      console.error('Failed to initialize database:', error);
      throw error;
    }

  async queueOperation<T>(
    operation: () => Promise<T>,
    options: { 
      retryOnFailure?: boolean; 
      maxRetries?: number;
      operationType?: string;
    } = {}
  ): Promise<T> {
    const {
      retryOnFailure = true,
      maxRetries = 3,
      operationType = 'unknown'
    } = options;

    const executeOperation = async (retryCount = 0): Promise<T> => {
      try {
        // Update pending operations count
        this.updateSyncStatus({ 
          pendingOperations: this.syncStatus.value.pendingOperations + 1 
        });

        const result = await operation();

        // Decrement pending operations on success
        this.updateSyncStatus({ 
          pendingOperations: Math.max(0, this.syncStatus.value.pendingOperations - 1)
        });

        return result;

  }
    } catch (error) {
      const wasOnline = this.syncStatus.value.isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable;

        console.log('Database initialized for offline operation');
      await this.database.write(async () => {
        // This ensures all tables are created and ready
      this.syncStatus.next({
      } catch (error) {
        ...this.syncStatus.value,
        isOnline: isNowOnline || false
      });
        // Decrement pending operations on failure
        this.updateSyncStatus({ 

          pendingOperations: Math.max(0, this.syncStatus.value.pendingOperations - 1)
      // Trigger sync when coming online
    try {
      // Ensure database is properly set up for offline operation
        });
      if (!wasOnline && isNowOnline) {

        if (retryOnFailure && retryCount < maxRetries) {
          console.log(`Retrying operation ${operationType} (attempt ${retryCount + 1})`);
          await this.delay(1000 * (retryCount + 1)); // Exponential backoff
          return executeOperation(retryCount + 1);
        }

        throw error;
      }
    };

    // If offline, queue the operation for later execution
    if (!this.syncStatus.value.isOnline) {
      return new Promise((resolve, reject) => {
        this.syncQueue.push(async () => {
          try {
            const result = await executeOperation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        
        this.updateSyncStatus({ 
          pendingOperations: this.syncStatus.value.pendingOperations + 1 
        });
      });
    }

    // Execute immediately if online
    return executeOperation();
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus({ syncState: 'syncing' });

    try {
      while (this.syncQueue.length > 0 && this.syncStatus.value.isOnline) {
        const operation = this.syncQueue.shift();
        if (operation) {
          try {
            await operation();
          } catch (error) {
            console.error('Failed to execute queued operation:', error);
            // Keep the operation in queue for retry
            this.syncQueue.unshift(operation);
            break;
          }
        }
      }

      if (this.syncQueue.length === 0) {
        this.updateSyncStatus({ 
          lastSync: Date.now(),
          syncState: 'idle'
        });
        console.log('Sync queue processed successfully');
      }

    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.updateSyncStatus({ 
        syncState: 'error',
        error: error.message
      });
    } finally {
      this.isSyncing = false;
    }
  }

  async createDiagnosticSession(sessionData: any): Promise<string> {
    return this.queueOperation(async () => {
      return await this.database.write(async () => {
        const sessionsCollection = this.database.collections.get('diagnostic_sessions');
        const session = await sessionsCollection.create((session: any) => {
          session.patient_id = sessionData.patientId;
          session.panel_type = sessionData.panelType;
          session.sensor_data = sessionData.sensorData;
          session.feature_vector = sessionData.featureVector;
          session.fusion_result = sessionData.fusionResult;
          session.confidence_scores = sessionData.confidenceScores;
          session.created_at = new Date();
          session.updated_at = new Date();
          session.sync_status = 'pending';
        });
        return session.id;
      });
    }, { operationType: 'create_diagnostic_session' });
  }

  async updatePatient(patientId: string, updates: any): Promise<void> {
    return this.queueOperation(async () => {
      await this.database.write(async () => {
        const patientsCollection = this.database.collections.get('patients');
        const patient = await patientsCollection.find(patientId);
        
        await patient.update((patient: any) => {
          Object.keys(updates).forEach(key => {
            patient[key] = updates[key];
          });
          patient.updated_at = new Date();
          patient.sync_status = 'pending';
        });
      });
    }, { operationType: 'update_patient' });
  }

  async getPendingSyncOperations(): Promise<any[]> {
    return this.database.get('diagnostic_sessions').query(
      this.database.query.where('sync_status', 'pending')
    ).fetch();
  }

  async getLocalEpidemiologyData(county: string): Promise<any> {
    return this.database.get('epidemiology_cache').query(
      this.database.query.where('county', county)
    ).fetch();
  }

  async cacheEpidemiologyData(county: string, data: any): Promise<void> {
    return this.queueOperation(async () => {
      await this.database.write(async () => {
        const cacheCollection = this.database.collections.get('epidemiology_cache');
        
        // Check if cache exists for this county
        const existing = await cacheCollection.query(
          this.database.query.where('county', county)
        ).fetch();

        if (existing.length > 0) {
          // Update existing cache
          const cache = existing[0];
          await cache.update((cache: any) => {
            cache.data = data;
            cache.updated_at = new Date();
            cache.sync_status = 'pending';
          });
        } else {
          // Create new cache entry
          await cacheCollection.create((cache: any) => {
            cache.county = county;
            cache.data = data;
            cache.created_at = new Date();
            cache.updated_at = new Date();
            cache.sync_status = 'pending';
          });
        }
      });
    }, { operationType: 'cache_epidemiology_data' });
  }

  async getStorageStats(): Promise<{
    patientCount: number;
    sessionCount: number;
    cacheSize: number;
    pendingSync: number;
  }> {
    const patients = await this.database.get('patients').query().fetch();
    const sessions = await this.database.get('diagnostic_sessions').query().fetch();
    const pending = await this.getPendingSyncOperations();

    return {
      patientCount: patients.length,
      sessionCount: sessions.length,
      cacheSize: await this.calculateCacheSize(),
      pendingSync: pending.length
    };
  }

  private async calculateCacheSize(): Promise<number> {
    // Estimate cache size (simplified)
    const sessions = await this.database.get('diagnostic_sessions').query().fetch();
    let size = 0;
    
    sessions.forEach(session => {
      size += JSON.stringify(session).length;
    });
    
    return size;
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus.next({
      ...this.syncStatus.value,
      ...updates
    });
  }

  getSyncStatus(): BehaviorSubject<SyncStatus> {
    return this.syncStatus;
  }

  async clearOldData(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.database.write(async () => {
      // Clear old sessions (keep last 30 days for mesh network)
      const oldSessions = await this.database.get('diagnostic_sessions').query(
        this.database.query.where('created_at', '<', thirtyDaysAgo)
      ).fetch();

      for (const session of oldSessions) {
        await session.markAsDeleted();
      }

      console.log(`Cleared ${oldSessions.length} old sessions`);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async destroy(): Promise<void> {
    if (this.networkListener) {
      this.networkListener();
    }
    this.syncStatus.complete();
  }
}  private async initializeDatabase(): Promise<void> {
        this.processSyncQueue();

  }
      }
    });
    // Monitor network connectivity

