import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DBOrder } from '../types';

// Test muhitida localStorage to'liq emas: yozish muvaffaqiyatli deb qaytariladi.
vi.mock('../lib/storage', async (orig) => ({
  ...(await orig<typeof import('../lib/storage')>()),
  writeCafeJson: vi.fn(() => true),
}));

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
 *
 * Yuborish 2026-10-16 dan beri navbat orqali (`flushNow`): to'lov o'zidan
 * oldingi amallar qabul qilingach ketadi, to'g'ridan-to'g'ri `fetch` yo'q.
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
  const flushNow = vi.fn<(qid?: string) => Promise<Response | null>>();
  const setApiError = vi.fn();
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
    flushNow,
    printClosedReceipt,
    handleSessionExpired: vi.fn(),
    setOrders: vi.fn(),
    setTableDraftPromos: vi.fn(),
    setTableCarts: vi.fn(),
    setSelectedArchiveOrder: vi.fn(),
    setShowUnsavedCartModal: vi.fn(),
    setToastMessage: vi.fn(),
    setApiError,
    setStorageBlockingError: vi.fn(),
    t: (k: string) => k,
    ...over,
  } as unknown as UseCheckoutParams;
  const hook = renderHook(() => useCheckout(params));
  return { hook, queuePatchForSync, flushNow, setApiError, printClosedReceipt };
}

describe('To‘lov chekdan oldin saqlanadi', () => {
  const pay = async (hook: ReturnType<typeof setup>['hook']) => {
    await act(async () => {
      await hook.result.current.handleCloseTable('Stol 06', true, { cash: 120_000, card: 0 });
    });
  };

  it('tarmoq yiqilsa: to‘lov navbatda qoladi, chek undan KEYIN bosiladi, kassir biladi', async () => {
    const { hook, queuePatchForSync, flushNow, setApiError, printClosedReceipt } = setup();
    flushNow.mockResolvedValue(null);

    await pay(hook);

    expect(queuePatchForSync).toHaveBeenCalledTimes(1);
    expect((queuePatchForSync.mock.calls[0] as unknown[])[2]).toBe('finalize_payment');
    expect(printClosedReceipt).toHaveBeenCalledTimes(1);
    expect(queuePatchForSync.mock.invocationCallOrder[0])
      .toBeLessThan(printClosedReceipt.mock.invocationCallOrder[0]);
    expect(setApiError).toHaveBeenCalledWith('toast.paymentQueued');
  });

  it('oflayn: to‘lov navbatga yoziladi, chek undan keyin, yuborilmaydi', async () => {
    const { hook, queuePatchForSync, flushNow, printClosedReceipt } = setup({ isOfflineMode: true });

    await pay(hook);

    expect(flushNow).not.toHaveBeenCalled();
    expect(queuePatchForSync.mock.invocationCallOrder[0])
      .toBeLessThan(printClosedReceipt.mock.invocationCallOrder[0]);
  });

  it('onlayn: navbat -> chek -> o‘sha yozuvni yuborish', async () => {
    const { hook, queuePatchForSync, flushNow, setApiError, printClosedReceipt } = setup();
    flushNow.mockResolvedValue(new Response('{}', { status: 200 }));

    await pay(hook);

    expect(queuePatchForSync.mock.invocationCallOrder[0])
      .toBeLessThan(printClosedReceipt.mock.invocationCallOrder[0]);
    expect(printClosedReceipt.mock.invocationCallOrder[0])
      .toBeLessThan(flushNow.mock.invocationCallOrder[0]);
    expect(flushNow).toHaveBeenCalledWith('q-pay');
    // Boshidagi `setApiError(null)` — eski xabarni tozalash; xato xabari yo'q.
    expect(setApiError.mock.calls.filter(([m]) => m !== null)).toEqual([]);
  });

  it('server rad etsa kassirga aytiladi', async () => {
    const { hook, flushNow, setApiError } = setup();
    flushNow.mockResolvedValue(new Response('{}', { status: 404 }));

    await pay(hook);

    expect(setApiError).toHaveBeenCalledWith('toast.paymentNotSaved');
  });
});
