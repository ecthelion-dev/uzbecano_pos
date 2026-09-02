import { useState, useEffect, useCallback } from 'react';
import { resolveActiveCafeId } from '../constants';
import { readCafeJson } from '../lib/storage';

/**
 * Connection state and the size of the offline backlog.
 *
 * The backlog lives in the `sync_queue` record, written by App.tsx whenever an
 * order or a payment fails to reach the server. Reading it here keeps one
 * source of truth: this hook only reports what that queue holds, it never owns
 * any state of its own.
 */
const SYNC_POLL_MS = 5000;

function readPendingCount(): number {
  const queue = readCafeJson<unknown>(resolveActiveCafeId(), 'sync_queue', []);
  return Array.isArray(queue) ? queue.length : 0;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refresh = useCallback(() => {
    setPendingCount(readPendingCount());
  }, []);

  // The queue drains on its own interval in App.tsx; asking the browser to go
  // online is the most this can do, and the count then falls by itself.
  const triggerSync = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('online'));
    }
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refresh();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refresh();
    const interval = setInterval(refresh, SYNC_POLL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refresh]);

  return {
    isOnline,
    pendingCount,
    // Nothing distinguishes a permanently failed entry from one still being
    // retried: the queue retries forever until the server accepts it.
    failedCount: 0,
    triggerSync,
  };
}
