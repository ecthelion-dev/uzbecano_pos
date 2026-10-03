import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DBOrder } from '../types';

vi.mock('../lib/net', () => ({ fetchWithTimeout: vi.fn() }));
// Test muhitida localStorage to'liq emas: yozish muvaffaqiyatli deb qaytariladi.
vi.mock('../lib/storage', async (orig) => ({
  ...(await orig<typeof import('../lib/storage')>()),
  writeCafeJson: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../lib/net';
import { useCheckout, type UseCheckoutParams } from './useCheckout';

/*
 * Tartib: to'lov navbatga -> chek -> serverga.
 *
 * To'lov chek bosilishidan OLDIN saqlanishi kerak.
 *
 * Brauzerda chek tizimning chop etish oynasi orqali chiqadi va u ochiq
 * turganda sahifaning JS i to'xtaydi. Chek oldin chaqirilganda to'lov
 * navbatga yozilishi shu oynani kutardi; oyna ochiq paytda ilova yopilsa,
 * to'lov yo'qolardi (2026-10-03, test-cafe oflayn sinovi).
 */

const openOrder = {
  id: 'o-1',
  tableNumber: 'Stol 06',
  status: 'sent_to_kitchen',
  items: JSON.stringify([{ name: 'Tandir', price: 120_000, quantity: 1 }]),
  subtotal: 120_000,
  serviceFee: 0,
  total: 120_000,
} as unknown as DBOrder;

function setup(over: Partial<UseCheckoutParams> = {}) {
  const queuePatchForSync = vi.fn(() => 'q-pay');
  const dequeueSyncItem = vi.fn();
  const printClosedReceipt = vi.fn();
  const params = {
    orders: [openOrder],
    ordersRef: { current: [openOrder] },
    selectedTable: 'Stol 06',
    tableCarts: {},
    isOfflineMode: false,
    currentWaiter: { id: 'w1', name: 'Ravil' },
    serviceFeePercent: 0,
    draftSubtotal: 0,
    tableDraftPromos: {},
    getActiveCafeId: () => 'test-cafe',
    getAuthHeaders: () => ({}),
    sendAppendItems: vi.fn(),
    queueOrderForSync: vi.fn(),
    queuePatchForSync,
    dequeueSyncItem,
    printClosedReceipt,
    handleSessionExpired: vi.fn(),
    setOrders: vi.fn(),
    setTableDraftPromos: vi.fn(),
    setTableCarts: vi.fn(),
    setSelectedArchiveOrder: vi.fn(),
    setShowUnsavedCartModal: vi.fn(),
    setToastMessage: vi.fn(),
    setApiError: vi.fn(),
    setStorageBlockingError: vi.fn(),
    t: (k: string) => k,
    ...over,
  } as unknown as UseCheckoutParams;
  const hook = renderHook(() => useCheckout(params));
  return { hook, queuePatchForSync, dequeueSyncItem, printClosedReceipt };
}

describe('To‘lov chekdan oldin saqlanadi', () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimeout).mockReset();
  });

  it('tarmoq yiqilsa: to‘lov navbatga yoziladi, chek undan KEYIN bosiladi', async () => {
    vi.mocked(fetchWithTimeout).mockRejectedValue(new TypeError('Failed to fetch'));
    const { hook, queuePatchForSync, dequeueSyncItem, printClosedReceipt } = setup();

    await act(async () => {
      await hook.result.current.handleCloseTable('Stol 06', true, { cash: 120_000, card: 0 });
    });

    expect(queuePatchForSync).toHaveBeenCalledTimes(1);
    expect((queuePatchForSync.mock.calls[0] as unknown[])[2]).toBe('finalize_payment');
    expect(printClosedReceipt).toHaveBeenCalledTimes(1);
    expect(queuePatchForSync.mock.invocationCallOrder[0])
      .toBeLessThan(printClosedReceipt.mock.invocationCallOrder[0]);
    // tarmoq yiqildi — yozuv navbatda qoladi
    expect(dequeueSyncItem).not.toHaveBeenCalled();
  });

  it('oflayn: to‘lov navbatga yoziladi, chek undan keyin', async () => {
    const { hook, queuePatchForSync, printClosedReceipt } = setup({ isOfflineMode: true });

    await act(async () => {
      await hook.result.current.handleCloseTable('Stol 06', true, { cash: 120_000, card: 0 });
    });

    expect(fetchWithTimeout).not.toHaveBeenCalled();
    expect(queuePatchForSync.mock.invocationCallOrder[0])
      .toBeLessThan(printClosedReceipt.mock.invocationCallOrder[0]);
  });

  it('onlayn: chek tarmoqni kutmaydi; server qabul qilsa yozuv navbatdan olinadi', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValue(new Response('{}', { status: 200 }));
    const { hook, queuePatchForSync, dequeueSyncItem, printClosedReceipt } = setup();

    await act(async () => {
      await hook.result.current.handleCloseTable('Stol 06', true, { cash: 120_000, card: 0 });
    });

    // navbat -> chek -> server
    expect(queuePatchForSync.mock.invocationCallOrder[0])
      .toBeLessThan(printClosedReceipt.mock.invocationCallOrder[0]);
    expect(printClosedReceipt.mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(fetchWithTimeout).mock.invocationCallOrder[0]);
    expect(dequeueSyncItem).toHaveBeenCalledWith('q-pay');
  });

  it('server rad etsa yozuv navbatda qoladi', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValue(new Response('{}', { status: 500 }));
    const { hook, dequeueSyncItem } = setup();

    await act(async () => {
      await hook.result.current.handleCloseTable('Stol 06', true, { cash: 120_000, card: 0 });
    });

    expect(dequeueSyncItem).not.toHaveBeenCalled();
  });
});
