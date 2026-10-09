import { describe, it, expect } from 'vitest';
import { buildSyncRequest } from './syncRequest';

const ctx = {
  baseUrl: 'https://api.test',
  cafeId: 'kafe',
  headers: (approval?: string) => ({ Authorization: 'Bearer t', ...(approval ? { 'X-Approval-Token': approval } : {}) }),
};

describe('buildSyncRequest', () => {
  it('yangi chek — POST, kafe tanaga qo`shiladi', () => {
    const r = buildSyncRequest({ kind: 'create', order: { id: 'o1', tableNumber: 'Stol 1' } }, ctx);
    expect(r.url).toBe('https://api.test/api/orders');
    expect(r.init.method).toBe('POST');
    expect(JSON.parse(String(r.init.body))).toEqual({ id: 'o1', tableNumber: 'Stol 1', cafeId: 'kafe' });
  });

  it('navbatdagi promo-kodli chek `promoCode` bilan ketadi', () => {
    const r = buildSyncRequest({ kind: 'create', order: { id: 'o1', promo: { code: 'BAHOR10', type: 'percent', value: 10 } } }, ctx);
    expect(JSON.parse(String(r.init.body)).promoCode).toBe('BAHOR10');
  });

  it('PATCH rahbar tasdig`ini sarlavhada olib ketadi', () => {
    const r = buildSyncRequest({ kind: 'patch', orderId: 'o1', body: { items: [] }, approvalToken: 'ok' }, ctx);
    expect(r.url).toBe('https://api.test/api/orders/o1');
    expect(r.init.method).toBe('PATCH');
    expect((r.init.headers as Record<string, string>)['X-Approval-Token']).toBe('ok');
  });

  it('kassa yozuvi — /api/cash-entries', () => {
    const r = buildSyncRequest({ kind: 'cash', entry: { amount: 1000 }, approvalToken: 'ok' }, ctx);
    expect(r.url).toBe('https://api.test/api/cash-entries');
    expect(JSON.parse(String(r.init.body))).toEqual({ amount: 1000 });
  });

  it('o`chirish — DELETE, tanasiz', () => {
    const r = buildSyncRequest({ kind: 'delete', orderId: 'o1' }, ctx);
    expect(r.init.method).toBe('DELETE');
    expect(r.init.body).toBeUndefined();
  });
});
