import { useState, useEffect, useCallback } from 'react';
import { BehaviorSubject } from 'rxjs';
import { OfflineManager, SyncStatus } from '../OfflineManager';
import { MeshNetworkManager } from '../MeshNetworkManager';

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingOperations: 0,
    syncState: 'idle'
  });

  const [meshStats, setMeshStats] = useState({
    nodeCount: 0,
    queueSize: 0,
    isActive: false
  });

  const [storageStats, setStorageStats] = useState({
    patientCount: 0,
    sessionCount: 0,
    cacheSize: 0,
    pendingSync: 0
  });

  useEffect(() => {
    const offlineManager = OfflineManager.getInstance();
    const meshManager = MeshNetworkManager.getInstance();

    // Subscribe to sync status updates
    const syncSubscription = offlineManager.getSyncStatus().subscribe(setSyncStatus);

    // Update stats periodically
    const updateStats = async () => {
      const stats = await offlineManager.getStorageStats();
      setStorageStats(stats);
      
      const meshStats = meshManager.getNetworkStats();
      setMeshStats({
        nodeCount: meshStats.nodeCount,
        queueSize: meshStats.queueSize,
        isActive: meshStats.isActive
      });
    };

    const statsInterval = setInterval(updateStats, 30000); // Every 30 seconds
    updateStats(); // Initial update

    return () => {
      syncSubscription.unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const queueOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: any
  ): Promise<T> => {
    const offlineManager = OfflineManager.getInstance();
    return await offlineManager.queueOperation(operation, options);
  }, []);

  const forceSync = useCallback(async (): Promise<void> => {
    const offlineManager = OfflineManager.getInstance();
    // This would trigger immediate sync processing
    console.log('Manual sync triggered');
  }, []);

  const getOfflineStatus = useCallback((): {
    isFullyOperational: boolean;
    needsAttention: boolean;
    message: string;
  } => {
    if (!syncStatus.isOnline && syncStatus.pendingOperations > 0) {
      return {
        isFullyOperational: false,
        needsAttention: false,
        message: `Working offline (${syncStatus.pendingOperations} pending)`
      };
    }

    if (syncStatus.syncState === 'error') {
      return {
        isFullyOperational: false,
        needsAttention: true,
        message: 'Sync error - check connection'
      };
    }

    if (syncStatus.pendingOperations > 10) {
      return {
        isFullyOperational: false,
        needsAttention: true,
        message: 'High pending operations - may affect performance'
      };
    }

    return {
      isFullyOperational: true,
      needsAttention: false,
      message: syncStatus.isOnline ? 'Online' : 'Offline'
    };
  }, [syncStatus]);

  return {
    syncStatus,
    meshStats,
    storageStats,
    queueOperation,
    forceSync,
    getOfflineStatus
  };
};
