import { useState, useEffect, useCallback } from 'react';
import { resolveActiveCafeId } from '../constants';
import { readCafeJson, writeCafeJson } from '../lib/storage';
import { acknowledge, type FailedAction } from '../lib/failedActions';

/**
 * Connection state and the size of the offline backlog.
 *
 * The backlog lives in the `sync_queue` record, written by App.tsx whenever an
 * order or a payment fails to reach the server. Reading it here keeps one
 * source of truth: this hook only reports what that queue holds, it never owns
 * any state of its own.
 */
const SYNC_POLL_MS = 5000;

function countOf(key: 'sync_queue' | 'sync_failed'): number {
  const queue = readCafeJson<unknown>(resolveActiveCafeId(), key, []);
  return Array.isArray(queue) ? queue.length : 0;
}

function readFailed(): FailedAction[] {
  const raw = readCafeJson<unknown>(resolveActiveCafeId(), 'sync_failed', []);
  return Array.isArray(raw) ? (raw as FailedAction[]) : [];
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [failed, setFailed] = useState<FailedAction[]>([]);

  const refresh = useCallback(() => {
    setPendingCount(countOf('sync_queue'));
    setFailedCount(countOf('sync_failed'));
    setFailed(readFailed());
  }, []);

  /**
   * Xodim ko'rdi va tushundi — yozuv ro'yxatdan chiqadi.
   *
   * Diskka yozib bo'lmasa ro'yxat o'z holicha qoladi va belgi yonaveradi.
   * Bu ataylab: ko'rilmagan rad etishni jimgina yo'qotgandan ko'ra,
   * ortiqcha turgani afzal.
   */
  const acknowledgeFailed = useCallback((qid: string) => {
    const cafeId = resolveActiveCafeId();
    const next = acknowledge(readFailed(), qid);
    writeCafeJson(cafeId, 'sync_failed', next);
    refresh();
  }, [refresh]);

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
    /*
     * Server rad etgan amallar. Ular navbatdan chiqadi, lekin o'chirilmaydi —
     * `sync_failed` da qoladi. Kassir buni ko'rib turishi kerak: 2026-09-10
     * da yo'qotish aynan hech kim hech narsa ko'rmagani uchun sezilmadi.
     */
    failedCount,
    /** Rad etilganlarning o'zi — kim, nega va qachon. */
    failed,
    acknowledgeFailed,
    triggerSync,
  };
}
