import { useCallback, useEffect, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../constants';
import { fetchWithTimeout, TILL_TIMEOUT_MS } from '../lib/net';
import { withDeadline } from '../lib/deadline';
import { readCafeJson, writeCafeJson, writeCafeJsonMany } from '../lib/storage';
import { readSession } from '../lib/session';
import { newQueueId, withQueueIds } from '../lib/syncQueue';
import { runSyncCycle, type QueuedItem } from '../lib/syncCycle';
import { buildSyncRequest } from '../lib/syncRequest';
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

  const queueOrderForSync = useCallback((order: any): string => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    const qid = newQueueId();
    queue.push({
      kind: 'create',
      qid,
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      order: { ...order, idempotencyKey: order.idempotencyKey || order.id },
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
    return qid;
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  const queuePatchForSync = useCallback((orderId: string, body: any, label?: string, approvalToken?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    const qid = newQueueId();
    queue.push({
      kind: 'patch',
      qid,
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      orderId,
      body,
      label,
      approvalToken,
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
    return qid;
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  /*
   * Bitta yozuvni nomi (`qid`) bo'yicha navbatdan olib tashlaydi.
   *
   * To'lov avval navbatga yoziladi (pul chek bosilishidan oldin diskda
   * bo'lsin), keyin to'g'ridan-to'g'ri yuboriladi; server qabul qilsa shu
   * yerda olib tashlanadi. Navbat JONLI holatdan o'qiladi, ya'ni oradagi
   * boshqa yozuvlarga tegilmaydi. Yozuv allaqachon drenaj tomonidan
   * yuborilgan bo'lsa — hech narsa qilinmaydi.
   */
  const dequeueSyncItem = useCallback((qid: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    const next = queue.filter((item: { qid?: string }) => item.qid !== qid);
    if (next.length === queue.length) return;
    writeSyncQueue(cafeId, next);
    refreshUnsynced();
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, refreshUnsynced]);

  /*
   * Kassa xarajati serverga yetmasa navbatda qoladi: internet uzilganda ham
   * sut sotib olinaveradi, o'sha payt yozib qo'yolmasa kassir keyin esdan
   * chiqaradi. Tasdiq tokeni navbat bilan birga diskka tushadi — usiz aloqa
   * tiklanganda server yozuvni rad etardi va oflayn kiritilgan xarajat
   * yo'qolib ketardi.
   */
  const queueCashForSync = useCallback((entry: unknown, label?: string, approvalToken?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    const qid = newQueueId();
    queue.push({
      kind: 'cash',
      qid,
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      entry,
      label,
      approvalToken,
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
    return qid;
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  /** `afterOrderId` — `syncCycle.ts` dagi `QueuedItem` izohiga qarang. */
  const queueDeleteForSync = useCallback((orderId: string, label?: string, afterOrderId?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    const qid = newQueueId();
    queue.push({
      kind: 'delete',
      qid,
      queuedAt: Date.now(),
      actor: actorName(cafeId),
      orderId,
      label,
      ...(afterOrderId ? { afterOrderId } : {}),
    });
    writeSyncQueue(cafeId, queue);
    refreshUnsynced();
    return qid;
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue, actorName, refreshUnsynced]);

  /*
   * Navbat sikllari BITTA-BITTA, ketma-ket.
   *
   * 2026-10-16 22:18: kassa serverga ikki yo'l bilan yozardi — to'g'ridan-
   * to'g'ri va navbat orqali. Sekin Wi-Fi'da ular bir-birini quvib o'tdi:
   * ikkinchi chek "stol band" (409) oldi, to'lov esa hali yaratilmagan chekka
   * ketib 404 oldi. Endi har bir yozuv navbatga tushadi va navbat SHU ZAHOTI,
   * tartib bilan yuboriladi (`flushNow`) — bitta chekning amallari bir-birini
   * quvib o'tolmaydi, server "yo'q" degan amal esa ikkinchi marta ketmaydi.
   */
  const cycleChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const serialCycle = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const run = cycleChainRef.current.then(task, task);
    cycleChainRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const runCycle = useCallback(async (tokenOverride?: string | null, ownQids: string[] = []): Promise<Response | null> => {
    syncInProgressRef.current = true;
    let watched = null as Response | null;
    try {
      const cafeId = getActiveCafeId();
      const effectiveToken = tokenOverride !== undefined ? tokenOverride : (authTokenRef.current ?? authToken);
      // Navbatda faqat shu amal(lar) bo'lsa — bu kundalik ish, "oflayn amallar
      // sinxronlandi" emas: na xabar, na buyurtmalarni qayta yuklash kerak.
      const watchQid = ownQids[0];
      const routine = ownQids.length > 0 &&
        readSyncQueue(cafeId).every((item: { qid?: string }) => item.qid !== undefined && ownQids.includes(item.qid));

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
          const { url, init } = buildSyncRequest(item, {
            baseUrl: API_BASE_URL,
            cafeId,
            headers: (approvalToken) => getAuthHeaders(approvalToken, effectiveToken),
          });
          return fetchWithTimeout(url, init);
        },
        onSent: (item, res) => {
          if (watchQid && item.qid === watchQid) watched = res.clone();
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

      if (!outcome) return watched;

      if (outcome.unauthorized) {
        handleSessionExpired();
        return watched;
      }

      if (outcome.commitFailed) {
        console.error("[sync] navbat holatini saqlab bo'lmadi");
      }

      const listOf = (labels: string[]) =>
        labels.slice(0, 3).join(', ') +
        (labels.length > 3 ? ' ' + t('toast.andMore', { n: labels.length - 3 }) : '');

      if (outcome.rejectedLabels.length > 0) {
        window.dispatchEvent(new Event('sync-rejected'));
        setToastMessage(
          t('toast.syncRejected', { list: listOf(outcome.rejectedLabels) })
        );
        setTimeout(() => setToastMessage(null), 6000);
      } else if (outcome.mergedLabels.length > 0) {
        // Jimgina emas: stoldagi chek kattalashdi va kassir buni ko'rishi kerak.
        setToastMessage(t('toast.syncMerged', { list: listOf(outcome.mergedLabels) }));
        setTimeout(() => setToastMessage(null), 8000);
      } else if (outcome.anySucceeded && !routine) {
        setToastMessage("Oflayn amallar serverga sinxronlandi!");
        setTimeout(() => setToastMessage(null), 2500);
      }

      if (outcome.anySucceeded && (!routine || outcome.mergedLabels.length > 0)) fetchOrders();
      return watched;
    } finally {
      syncInProgressRef.current = false;
    }
  }, [authToken, authTokenRef, getActiveCafeId, getAuthHeaders, fetchOrders, readSyncQueue, applyFrozenFromResponse, refreshUnsynced, handleSessionExpired, setToastMessage, t]);

  /** Fondagi taymer va "online" hodisasi: sikl ketayotgan bo'lsa kutmaydi. */
  const syncOfflineOrders = useCallback(async (tokenOverride?: string | null) => {
    if (syncInProgressRef.current) return;
    await serialCycle(() => runCycle(tokenOverride));
  }, [serialCycle, runCycle]);

  /**
   * Navbatni HOZIR yuboradi (oldingi sikl tugashini kutib) va `qid` amalining
   * server javobini qaytaradi. `null` — javob kelmadi (tarmoq): amal navbatda
   * qoladi va keyin o'zi ketadi.
   *
   * Bitta amal bir nechta yozuv qo'ysa (stol birlashtirish), hammasi beriladi:
   * javob birinchisiniki, qolganlari esa "boshqa oflayn amal" sanalmaydi.
   */
  const flushNow = useCallback(
    (qid?: string | string[]): Promise<Response | null> =>
      // Kassir ko'pi bilan avvalgi to'g'ridan-to'g'ri so'rovdek kutadi; navbat
      // fonda davom etadi (`deadline.ts`).
      withDeadline(
        serialCycle(() => runCycle(undefined, qid === undefined ? [] : ([] as string[]).concat(qid))),
        TILL_TIMEOUT_MS,
        null,
      ),
    [serialCycle, runCycle],
  );

  const sendAppendItems = useCallback(async (
    orderId: string,
    items: OutgoingOrderItem[],
  ): Promise<DBOrder | null> => {
    const body = appendItemsPatch(items, newQueueId());
    const qid = queuePatchForSync(orderId, body, 'add_items');
    if (isOfflineMode) return null;
    const res = await flushNow(qid);
    if (!res?.ok) return null;
    const serverOrder = await res.json().catch(() => null);
    return serverOrder && serverOrder.id === orderId ? (serverOrder as DBOrder) : null;
  }, [isOfflineMode, queuePatchForSync, flushNow]);

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
    dequeueSyncItem,
    queueDeleteForSync,
    queueCashForSync,
    sendAppendItems,
    syncOfflineOrders,
    flushNow,
    retryFailedSync,
    shiftBacklog,
  };
}
