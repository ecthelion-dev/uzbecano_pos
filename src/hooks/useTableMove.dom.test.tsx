import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DBOrder } from '../types';

vi.mock('../lib/storage', async (orig) => ({
  ...(await orig<typeof import('../lib/storage')>()),
  writeCafeJson: vi.fn(() => true),
}));

import { useTableMove, type UseTableMoveParams } from './useTableMove';

/*
 * Stol birlashtirishni server bajaradi (2026-10-17) va chegirmali chekni rad
 * etadi. Kassa buni OLDINDAN to'xtatishi kerak: aks holda u birlashgan
 * summani ko'rsatib qo'yardi, server esa rad etgach chek ajralib qolardi.
 */
const order = (id: string, tableNumber: string, fields: Partial<DBOrder> = {}): DBOrder =>
  ({
    id,
    tableNumber,
    status: 'sent_to_kitchen',
    items: JSON.stringify([{ id: 'p1', name: 'Osh', price: 35000, quantity: 1 }]),
    subtotal: 35000,
    serviceFee: 0,
    total: 35000,
    ...fields,
  }) as DBOrder;

function setup(orders: DBOrder[]) {
  const params = {
    orders,
    ordersRef: { current: orders },
    tableCarts: {},
    isOfflineMode: true,
    serviceFeePercent: 0,
    getActiveCafeId: () => 'test-cafe',
    queuePatchForSync: vi.fn(() => 'qp'),
    queueMergeForSync: vi.fn(() => 'qm'),
    flushNow: vi.fn().mockResolvedValue(null),
    setOrders: vi.fn(),
    setTableCarts: vi.fn(),
    setTableDraftPromos: vi.fn(),
    setSelectedTable: vi.fn(),
    setToastMessage: vi.fn(),
  } satisfies UseTableMoveParams;
  const { result } = renderHook(() => useTableMove(params));
  return { params, move: result.current.handleMoveTable };
}

describe('useTableMove — birlashtirish', () => {
  it('bitta server amali: maqsad ← manba', async () => {
    const { params, move } = setup([order('src', 'Stol 1'), order('tgt', 'Stol 2')]);

    await act(() => move('Stol 1', 'Stol 2', true));

    expect(params.queueMergeForSync).toHaveBeenCalledWith('tgt', 'src');
    expect(params.queuePatchForSync).not.toHaveBeenCalled();
  });

  it.each([
    ['maqsadda chegirma', order('src', 'Stol 1'), order('tgt', 'Stol 2', { discount: 5000 })],
    ['manbada promo', order('src', 'Stol 1', { promo: { code: 'BAHOR20', type: 'percent', value: 20 } as never }), order('tgt', 'Stol 2')],
  ])('%s — birlashtirilmaydi, kassa holati o‘zgarmaydi', async (_label, source, target) => {
    const { params, move } = setup([source, target]);

    await act(() => move('Stol 1', 'Stol 2', true));

    expect(params.queueMergeForSync).not.toHaveBeenCalled();
    expect(params.setOrders).not.toHaveBeenCalled();
    expect(params.setToastMessage).toHaveBeenCalledWith(expect.stringMatching(/chegirma/i));
  });
});
