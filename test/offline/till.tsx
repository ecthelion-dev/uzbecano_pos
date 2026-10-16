/**
 * Kassa drayveri: HAQIQIY hook'lar (`useOfflineSync`, `useKitchenDispatch`,
 * `useCheckout`) `App.tsx` dagidek ulangan, HAQIQIY serverga.
 *
 * `harness.ts` dagi `TillQueue` faqat navbatni sinaydi. 2026-10-16 dagi
 * to'lov xatosi esa navbatdan OLDIN — hook'lar serverga to'g'ridan-to'g'ri
 * yozadigan joyda edi: ikkita yo'l (to'g'ridan-to'g'ri va navbat) bir-birini
 * quvib o'tdi. Uni faqat hook'larning o'zi takrorlay oladi.
 *
 * Tarmoq `net` orqali boshqariladi (`fetchWithTimeout` shu yerga yo'naltirilgan):
 * onlayn, oflayn, so'rov yetib javob yo'qolgan, sekin javob.
 */
import { useMemo, useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useOfflineSync } from '../../src/hooks/useOfflineSync';
import { useKitchenDispatch } from '../../src/hooks/useKitchenDispatch';
import { useCheckout } from '../../src/hooks/useCheckout';
import { useTableMove } from '../../src/hooks/useTableMove';
import { isActiveOrder } from '../../src/constants';
import { readCafeJson } from '../../src/lib/storage';
import { installMemoryStorage } from '../../src/lib/testStorage';
import type { CartItem, DBOrder } from '../../src/types';
import { BASE_URL, CAFE, PRODUCTS } from './harness';

type Product = (typeof PRODUCTS)[keyof typeof PRODUCTS];

export interface NetEvent {
  method: string;
  path: string;
  status: number | 'offline' | 'lost';
}

/** Kafedagi Wi-Fi: testning qo'lida. */
export const net = {
  online: true,
  /** Keyingi N ta so'rov serverga YETADI, lekin javobi kassaga kelmaydi. */
  loseResponses: 0,
  /** Keyingi so'rov javobini shuncha ms ushlab turadi (sekin Wi-Fi). */
  delayNextMs: 0,
  log: [] as NetEvent[],

  reset() {
    this.online = true;
    this.loseResponses = 0;
    this.delayNextMs = 0;
    this.log = [];
  },

  async fetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = input.replace(/^https?:\/\/[^/]+/, BASE_URL);
    const path = url.slice(BASE_URL.length).split('?')[0];
    const method = (init.method || 'GET').toUpperCase();
    if (!this.online) {
      this.log.push({ method, path, status: 'offline' });
      throw new TypeError('Failed to fetch');
    }
    const delay = this.delayNextMs;
    this.delayNextMs = 0;
    const { signal: _ignored, ...rest } = init;
    const res = await fetch(url, rest);
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (this.loseResponses > 0) {
      this.loseResponses -= 1;
      this.log.push({ method, path, status: 'lost' });
      throw new TypeError('network connection was lost');
    }
    this.log.push({ method, path, status: res.status });
    return res;
  },

  /** Kassa yozuvlari (GET emas) — server ko'rgan javoblar bilan. */
  writes(): NetEvent[] {
    return this.log.filter((e) => e.method !== 'GET' && e.method !== 'OPTIONS');
  },
};

function cartLine(product: Product, quantity = 1): CartItem {
  return { lineId: crypto.randomUUID(), product: { ...product, category: 'Ichimliklar' }, quantity, note: '' } as unknown as CartItem;
}

/** `App.tsx` dagi ulanish — faqat buyurtma yo'liga tegishli qismi. */
function useTill(token: string, offline: { current: boolean }) {
  const [orders, setOrdersState] = useState<DBOrder[]>([]);
  const ordersRef = useRef<DBOrder[]>([]);
  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>({});
  const [selectedTable, setSelectedTable] = useState('Terassa 1');
  const [tableDraftPromos, setTableDraftPromos] = useState<Record<string, any>>({});
  const authTokenRef = useRef<string | null>(token);

  const setOrders = (next: DBOrder[]) => {
    ordersRef.current = next;
    setOrdersState(next);
  };
  const getActiveCafeId = () => CAFE;
  const getAuthHeaders = (approvalToken?: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(approvalToken ? { 'X-Approval-Token': approvalToken } : {}),
  });
  const t = (k: string) => k;
  const noop = () => {};

  const sync = useOfflineSync({
    getActiveCafeId,
    authToken: token,
    authTokenRef,
    getAuthHeaders,
    isOfflineMode: offline.current,
    applyFrozenFromResponse: async () => false,
    refreshUnsynced: noop,
    handleSessionExpired: noop,
    fetchOrders: async () => {},
    setToastMessage: noop,
    showShiftReport: false,
    t,
  });

  const cart = tableCarts[selectedTable] || [];
  const activeTableOrder = useMemo(
    () => orders.find((o) => o.tableNumber === selectedTable && isActiveOrder(o.status)) ?? null,
    [orders, selectedTable],
  );
  const activeTableOrderItems = useMemo(() => {
    if (!activeTableOrder?.items) return [];
    try {
      const parsed = typeof activeTableOrder.items === 'string' ? JSON.parse(activeTableOrder.items) : activeTableOrder.items;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [activeTableOrder]);
  const draftSubtotal = cart.reduce((s, i) => s + (Number(i.product.price) || 0) * (Number(i.quantity) || 1), 0);

  const kitchen = useKitchenDispatch({
    cart,
    selectedTable,
    activeTableOrder,
    activeTableOrderItems,
    draftSubtotal,
    orders,
    ordersRef,
    isOfflineMode: offline.current,
    currentWaiter: { id: 'w1', name: 'Dilsora' },
    serviceFeePercent: 0,
    tableDraftPromos,
    getActiveCafeId,
    getAuthHeaders,
    sendAppendItems: sync.sendAppendItems,
    queueOrderForSync: sync.queueOrderForSync,
    flushNow: sync.flushNow,
    queuePatchForSync: sync.queuePatchForSync,
    applyFrozenFromResponse: async () => false,
    requestAdminPin: noop,
    setOrders,
    setTableDraftPromos,
    setTableCarts,
    setKitchenSlipData: noop,
    setToastMessage: noop,
    setApiError: noop,
    setStorageBlockingError: noop,
    t,
  } as any);

  const checkout = useCheckout({
    orders,
    ordersRef,
    selectedTable,
    tableCarts,
    isOfflineMode: offline.current,
    currentWaiter: { id: 'w1', name: 'Dilsora' } as any,
    serviceFeePercent: 0,
    draftSubtotal,
    tableDraftPromos,
    getActiveCafeId,
    getAuthHeaders,
    sendAppendItems: sync.sendAppendItems,
    queueOrderForSync: sync.queueOrderForSync,
    flushNow: sync.flushNow,
    queuePatchForSync: sync.queuePatchForSync,
    printClosedReceipt: noop,
    handleSessionExpired: noop,
    setOrders,
    setTableDraftPromos,
    setTableCarts,
    setSelectedArchiveOrder: noop,
    setShowUnsavedCartModal: noop,
    setToastMessage: noop,
    setApiError: noop,
    setStorageBlockingError: noop,
    t,
  });

  const tableMove = useTableMove({
    orders,
    ordersRef,
    tableCarts,
    isOfflineMode: offline.current,
    serviceFeePercent: 0,
    getActiveCafeId,
    queuePatchForSync: sync.queuePatchForSync,
    queueDeleteForSync: sync.queueDeleteForSync,
    flushNow: sync.flushNow,
    setOrders,
    setTableCarts,
    setTableDraftPromos,
    setSelectedTable,
    setToastMessage: noop,
  });

  return { orders, ordersRef, tableCarts, setTableCarts, selectedTable, setSelectedTable, sync, kitchen, checkout, tableMove };
}

/**
 * Bitta kassa. Har bir amal `act` ichida — React holati keyingi amaldan
 * oldin yangilansin, xuddi kassir ekranda ko'rgandek.
 */
export class Till {
  private offline = { current: false };
  private hook;

  constructor(token: string) {
    net.reset();
    // Node 26 da global `localStorage` bor-u ishlamaydi; loyihaning o'z
    // xotira saqlashi va `storage` modulining keshi tozalanadi.
    installMemoryStorage();
    const offline = this.offline;
    this.hook = renderHook(() => useTill(token, offline));
  }

  private get h() {
    return this.hook.result.current;
  }

  /** Wi-Fi uzildi / qaytdi. Kassa buni `isOfflineMode` orqali biladi. */
  setOnline(online: boolean): void {
    net.online = online;
    this.offline.current = !online;
    this.hook.rerender();
  }

  async openTable(table: string): Promise<void> {
    await act(async () => { this.h.setSelectedTable(table); });
  }

  async addToCart(product: Product, quantity = 1): Promise<void> {
    await act(async () => {
      const table = this.h.selectedTable;
      this.h.setTableCarts((prev) => ({ ...prev, [table]: [...(prev[table] || []), cartLine(product, quantity)] }));
    });
  }

  /** "Tasdiqlash" — oshxonaga. */
  async sendToKitchen(): Promise<void> {
    await act(async () => { await this.h.kitchen.handleSendToKitchen(); });
  }

  /** "Tasdiqlash" ni bosib, javobini KUTMAY — keyingi amalni bosish uchun. */
  sendToKitchenNoWait(): Promise<unknown> {
    let pending: Promise<unknown> = Promise.resolve();
    act(() => { pending = this.h.kitchen.handleSendToKitchen(); });
    return pending;
  }

  /** To'lov oynasida naqd to'lov tasdiqlandi. */
  async payCash(amount: number): Promise<void> {
    await act(async () => {
      await this.h.checkout.handleCloseTable(this.h.selectedTable, true, { cash: amount, card: 0 });
    });
  }

  /** Stolni ko'chirish (`merge` — boshqa stoldagi chekka qo'shish). */
  async moveTable(from: string, to: string, merge: boolean): Promise<void> {
    await act(async () => { await this.h.tableMove.handleMoveTable(from, to, merge); });
  }

  /** Navbat sikli (kassada taymer yoki "online" hodisasi chaqiradi). */
  async sync(): Promise<void> {
    await act(async () => { await this.h.sync.syncOfflineOrders(); });
  }

  async syncUntilSettled(rounds = 5): Promise<void> {
    for (let i = 0; i < rounds && this.queue().length > 0; i += 1) await this.sync();
  }

  queue(): unknown[] {
    return readCafeJson<unknown[]>(CAFE, 'sync_queue', []);
  }

  failed(): unknown[] {
    return readCafeJson<unknown[]>(CAFE, 'sync_failed', []);
  }

  unmount(): void {
    this.hook.unmount();
  }
}
