import { useState, useEffect, useCallback } from 'react';
import { SyncStatusSummary } from '../types/offline';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncSummary, setSyncSummary] = useState<{ pendingCount: number; failedCount: number }>({
    pendingCount: 0,
    failedCount: 0,
  });

  const checkSyncStatus = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const summary: SyncStatusSummary = await window.electronAPI.getSyncStatus();
        setSyncSummary({
          pendingCount: summary.pendingCount,
          failedCount: summary.failedCount,
        });
      } catch (err) {
        console.error('Failed to get sync status from IPC', err);
      }
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI && isOnline) {
      try {
        const summary = await window.electronAPI.triggerSync();
        setSyncSummary({
          pendingCount: summary.pendingCount,
          failedCount: summary.failedCount,
        });
      } catch (err) {
        console.error('Sync trigger error', err);
      }
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkSyncStatus, triggerSync]);

  return {
    isOnline,
    pendingCount: syncSummary.pendingCount,
    failedCount: syncSummary.failedCount,
    triggerSync,
  };
}
