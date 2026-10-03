import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CartItem, DBOrder, KitchenSlipData } from '../types';

vi.mock('../lib/net', () => ({ fetchWithTimeout: vi.fn() }));
// Test muhitida localStorage to'liq emas: yozish muvaffaqiyatli deb qaytariladi.
vi.mock('../lib/storage', async (orig) => ({
  ...(await orig<typeof import('../lib/storage')>()),
  writeCafeJson: vi.fn(() => true),
  readGlobalText: vi.fn(() => 'test-cafe'),
}));

import { fetchWithTimeout } from '../lib/net';
import { useKitchenDispatch, type UseKitchenDispatchParams } from './useKitchenDispatch';

/*
 * Tasdiqlash bosilishi bilan oshxona qog'ozi navbat raqami bilan chiqadi.
 *
 * Raqam serverdan keladi (kunlik tartib raqami, har kuni 1 dan) — kassa o'z
 * hisobini yuritmaydi. Bu testlar aynan shuni qulflaydi: qog'oz chiqishi va
 * raqam serverniki bo'lishi.
 */

const cartLine = {
  lineId: 'l1',
  product: { id: 'p1', name: 'Tandir', price: 120_000 },
  quantity: 2,
} as unknown as CartItem;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

function setup(over: Partial<UseKitchenDispatchParams> = {}) {
  const setKitchenSlipData = vi.fn<(slip: KitchenSlipData | null) => void>();
  const ordersRef = { current: [] as DBOrder[] };
  const params = {
    cart: [cartLine],
    selectedTable: 'Stol 03',
    activeTableOrder: null,
    activeTableOrderItems: [],
    draftSubtotal: 240_000,
    orders: [],
    ordersRef,
    isOfflineMode: false,
    currentWaiter: { id: 'w1', name: 'Ravil' },
    serviceFeePercent: 0,
    tableDraftPromos: {},
    getActiveCafeId: () => 'test-cafe',
    getAuthHeaders: () => ({}),
    sendAppendItems: vi.fn().mockResolvedValue(null),
    queueOrderForSync: vi.fn(),
    queuePatchForSync: vi.fn(),
    applyFrozenFromResponse: vi.fn().mockResolvedValue(false),
    requestAdminPin: vi.fn(),
    setOrders: vi.fn(),
    setTableDraftPromos: vi.fn(),
    setTableCarts: vi.fn(),
    setKitchenSlipData,
    setToastMessage: vi.fn(),
    setApiError: vi.fn(),
    setStorageBlockingError: vi.fn(),
    t: (k: string) => k,
    ...over,
  } as unknown as UseKitchenDispatchParams;
  const hook = renderHook(() => useKitchenDispatch(params));
  return { hook, setKitchenSlipData, params };
}

describe('Tasdiqlashda oshxona qog‘ozi', () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimeout).mockReset();
  });

  it('yangi buyurtma: qog‘oz serverning kunlik raqami bilan chiqadi', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValue(jsonResponse({ id: 'srv-1', dailyNumber: 7 }));
    const { hook, setKitchenSlipData } = setup();

    await act(async () => { await hook.result.current.handleSendToKitchen(); });

    expect(setKitchenSlipData).toHaveBeenCalledTimes(1);
    const slip = setKitchenSlipData.mock.calls[0][0]!;
    expect(slip.slipNumber).toBe(7);
    expect(slip.orderId).toBe('srv-1');
    expect(slip.tableNumber).toBe('Stol 03');
    expect(slip.items).toHaveLength(1);
  });

  it('qo‘shimcha taom: buyurtmaning o‘sha raqami, faqat yangi taomlar bosiladi', async () => {
    const active = { id: 'o-9', dailyNumber: 12, promo: null } as unknown as DBOrder;
    const { hook, setKitchenSlipData } = setup({
      activeTableOrder: active,
      activeTableOrderItems: [{ name: 'Sho‘rva', price: 50_000, quantity: 1 }],
      sendAppendItems: vi.fn().mockResolvedValue({ id: 'o-9', dailyNumber: 12 }),
    });

    await act(async () => { await hook.result.current.handleSendToKitchen(); });

    const slip = setKitchenSlipData.mock.calls[0][0]!;
    expect(slip.slipNumber).toBe(12);
    expect(slip.orderId).toBe('o-9');
    expect(slip.items.map((i: any) => i.name)).toEqual(['Tandir']);
  });

  it('oflayn: qog‘oz raqamsiz chiqadi, taomlar yo‘qolmaydi', async () => {
    const { hook, setKitchenSlipData, params } = setup({ isOfflineMode: true });

    await act(async () => { await hook.result.current.handleSendToKitchen(); });

    expect(fetchWithTimeout).not.toHaveBeenCalled();
    expect(params.queueOrderForSync).toHaveBeenCalledTimes(1);
    const slip = setKitchenSlipData.mock.calls[0][0]!;
    expect(slip.slipNumber).toBe(0);
    expect(slip.items).toHaveLength(1);
  });

  it('savat bo‘sh bo‘lsa hech narsa chop etilmaydi', async () => {
    const { hook, setKitchenSlipData } = setup({ cart: [] });

    await act(async () => { await hook.result.current.handleSendToKitchen(); });

    expect(setKitchenSlipData).not.toHaveBeenCalled();
  });
});
