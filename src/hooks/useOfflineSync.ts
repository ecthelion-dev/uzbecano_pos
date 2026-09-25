import { useCallback, useEffect, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../constants';
import { fetchWithTimeout } from '../lib/net';
import { readCafeJson, writeCafeJson, writeCafeJsonMany } from '../lib/storage';
import { readSession } from '../lib/session';
import { newQueueId, withQueueIds } from '../lib/syncQueue';
import { runSyncCycle, type QueuedItem } from '../lib/syncCycle';
import { oldestQueuedAt, summariseBacklog, type SyncVerdict } from '../lib/syncHealth';
import { appendItemsPatch, type OutgoingOrderItem } from '../lib/orderItems';
import type { DBOrder } from '../types';

export type SyncQueueItem = QueuedItem;

export interface UseOfflineSyncParams {
  getActiveCafeId: () => string;
  authToken: string | null;
  authTokenRef: React.MutableRefObject<string | null>;
  getAuthHeaders: (approvalToken?: string, tokenOverride?: string | null) => Record<string, string>;
  isOfflineMode: boolean;
  applyFrozenFromResponse: (res: Response, cafeId: string) => Promise<boolean>;
  refreshUnsynced: () => void;
  handleSessionExpired: () => void;
  fetchOrders: () => Promise<void>;
  setToastMessage: (msg: string | null) => void;
  showShiftReport: boolean;
  t: (key: any, options?: any) => string;
}

export function useOfflineSync({
  getActiveCafeId,
  authToken,
  authTokenRef,
  getAuthHeaders,
  isOfflineMode,
  applyFrozenFromResponse,
  refreshUnsynced,
  handleSessionExpired,
  fetchOrders,
  setToastMessage,
  showShiftReport,
  t,
}: UseOfflineSyncParams) {
  const syncInProgressRef = useRef(false);

  const retryFailedSync = useCallback(() => {
    const cafeId = getActiveCafeId();
    const failed = readCafeJson<SyncQueueItem[]>(cafeId, 'sync_failed', []);
    if (!Array.isArray(failed) || failed.length === 0) return;
    const queue = readCafeJson<SyncQueueItem[]>(cafeId, 'sync_queue', []);
    const queuedOk = writeCafeJson(cafeId, 'sync_queue', [...(Array.isArray(queue) ? queue : []), ...failed]);
    if (queuedOk) writeCafeJson(cafeId, 'sync_failed', []);
  }, [getActiveCafeId]);

  const shiftBacklog: SyncVerdict = useMemo(() => {
    const empty: SyncVerdict = { total: 0, incomplete: false, stuck: false, waitingMinutes: 0 };
    if (!showShiftReport) return empty;
    const cafeId = getActiveCafeId();
    const raw = readCafeJson<SyncQueueItem[]>(cafeId, 'sync_queue', []);
    const rawFailed = readCafeJson<SyncQueueItem[]>(cafeId, 'sync_failed', []);
    const queue = Array.isArray(raw) ? raw : [];
    const failed = Array.isArray(rawFailed) ? rawFailed : [];
    return summariseBacklog(
      { pending: queue.length, failed: failed.length, oldestQueuedAt: oldestQueuedAt(queue) },
      Date.now(),
    );
  }, [showShiftReport, getActiveCafeId]);

  const readSyncQueue = useCallback((cafeId: string): SyncQueueItem[] => {
    const { queue, changed } = withQueueIds<SyncQueueItem>(
      readCafeJson<unknown>(cafeId, 'sync_queue', []),
    );
    if (changed) writeCafeJson(cafeId, 'sync_queue', queue);
    return queue;
  }, []);

  const writeSyncQueue = useCallback((cafeId: string, queue: SyncQueueItem[]) => {
    writeCafeJson(cafeId, 'sync_queue', queue);
  }, []);

  const actorName = useCallback((cafeId: string): string | undefined => {
    return readSession(cafeId)?.waiter?.name || undefined;
  }, []);

  const queueOrderForSync = useCallback((order: any) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    queue.push({
      kind: 'create',
      qid: newQueueId(),
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      order: { ...order, idempotencyKey: order.idempotencyKey || order.id },
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  const queuePatchForSync = useCallback((orderId: string, body: any, label?: string, approvalToken?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    queue.push({
      kind: 'patch',
      qid: newQueueId(),
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      orderId,
      body,
      label,
      approvalToken,
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  const queueDeleteForSync = useCallback((orderId: string, label?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    queue.push({
      kind: 'delete',
      qid: newQueueId(),
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      orderId,
      label,
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  const sendAppendItems = useCallback(async (
    orderId: string,
    items: OutgoingOrderItem[],
  ): Promise<DBOrder | null> => {
    const body = appendItemsPatch(items, newQueueId());
    if (isOfflineMode) {
      queuePatchForSync(orderId, body, 'add_items');
      return null;
    }
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        queuePatchForSync(orderId, body, 'add_items');
        handleSessionExpired();
        return null;
      }
      if (!res.ok) {
        queuePatchForSync(orderId, body, 'add_items');
        return null;
      }
      const serverOrder = await res.json().catch(() => null);
      return serverOrder && serverOrder.id === orderId ? (serverOrder as DBOrder) : null;
    } catch {
      queuePatchForSync(orderId, body, 'add_items');
      return null;
    }
  }, [isOfflineMode, getAuthHeaders, queuePatchForSync, handleSessionExpired]);

  const syncOfflineOrders = useCallback(async (tokenOverride?: string | null) => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    try {
      const cafeId = getActiveCafeId();
      const effectiveToken = tokenOverride !== undefined ? tokenOverride : (authTokenRef.current ?? authToken);

      const outcome = await runSyncCycle({
        readQueue: () => readSyncQueue(cafeId),
        readFailed: () => {
          const raw = readCafeJson<SyncQueueItem[]>(cafeId, 'sync_failed', []);
          return Array.isArray(raw) ? raw : [];
        },
        commit: (queue, failed) =>
          writeCafeJsonMany(cafeId, [
            { key: 'sync_queue', value: queue },
            ...(failed ? [{ key: 'sync_failed' as const, value: failed }] : []),
          ]),
        send: (item) => {
          if (item.kind === 'create') {
            return fetchWithTimeout(`${API_BASE_URL}/api/orders`, {
              method: 'POST',
              headers: getAuthHeaders(undefined, effectiveToken),
              body: JSON.stringify({ ...item.order, cafeId }),
            });
          }
          if (item.kind === 'patch') {
            return fetchWithTimeout(`${API_BASE_URL}/api/orders/${item.orderId}`, {
              method: 'PATCH',
              headers: getAuthHeaders(item.approvalToken, effectiveToken),
              body: JSON.stringify(item.body),
            });
          }
          if (item.kind === 'cash') {
            return fetchWithTimeout(`${API_BASE_URL}/api/cash-entries`, {
              method: 'POST',
              headers: getAuthHeaders(item.approvalToken, effectiveToken),
              body: JSON.stringify(item.entry),
            });
          }
          return fetchWithTimeout(`${API_BASE_URL}/api/orders/${item.orderId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(undefined, effectiveToken),
          });
        },
        isFrozen: (res) => applyFrozenFromResponse(res, cafeId),
        label: (item) =>
          String(
            item.kind === 'create'
              ? item.order?.tableNumber || t('common.order')
              : item.kind === 'cash'
                ? item.label || t('drawer.title')
                : item.label || item.orderId,
          ),
      }, effectiveToken);

      refreshUnsynced();

      if (!outcome) return;

      if (outcome.unauthorized) {
        handleSessionExpired();
        return;
      }

      if (outcome.commitFailed) {
        console.error("[sync] navbat holatini saqlab bo'lmadi");
      }

      if (outcome.rejectedLabels.length > 0) {
        window.dispatchEvent(new Event('sync-rejected'));
        setToastMessage(
          t('toast.syncRejected', {
            list:
              outcome.rejectedLabels.slice(0, 3).join(', ') +
              (outcome.rejectedLabels.length > 3
                ? ' ' + t('toast.andMore', { n: outcome.rejectedLabels.length - 3 })
                : ''),
          })
        );
        setTimeout(() => setToastMessage(null), 6000);
      } else if (outcome.anySucceeded) {
        setToastMessage("Oflayn amallar serverga sinxronlandi!");
        setTimeout(() => setToastMessage(null), 2500);
      }

      if (outcome.anySucceeded) fetchOrders();
    } finally {
      syncInProgressRef.current = false;
    }
  }, [authToken, authTokenRef, getActiveCafeId, getAuthHeaders, fetchOrders, readSyncQueue, applyFrozenFromResponse, refreshUnsynced, handleSessionExpired, setToastMessage, t]);

  useEffect(() => {
    refreshUnsynced();
    const interval = setInterval(() => { void syncOfflineOrders(); }, 10000);
    const onOnline = () => { void syncOfflineOrders(); };
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [syncOfflineOrders, refreshUnsynced]);

  return {
    readSyncQueue,
    writeSyncQueue,
    queueOrderForSync,
    queuePatchForSync,
    queueDeleteForSync,
    sendAppendItems,
    syncOfflineOrders,
    retryFailedSync,
    shiftBacklog,
  };
}
