import { describe, it, expect } from 'vitest';
import { buildCashEntryPayload } from './cashEntryPayload';

describe('buildCashEntryPayload', () => {
  it('har doim chiqim bo‘ladi va kalit berilgan qiymat bilan qoladi', () => {
    const payload = buildCashEntryPayload('Sut', 50000, 'ertalab', 'key-1');
    expect(payload).toEqual({
      type: 'chiqim',
      category: 'Sut',
      amount: 50000,
      note: 'ertalab',
      idempotencyKey: 'key-1',
    });
  });

  it('bo‘sh izoh yuborilmaydi', () => {
    expect(buildCashEntryPayload('Sut', 1000, '   ', 'k').note).toBeUndefined();
  });

  it('har chaqiruvda yangi kalit beriladi — ikki xarajat bir-birini yutib yubormasin', () => {
    const a = buildCashEntryPayload('Sut', 1000, '');
    const b = buildCashEntryPayload('Sut', 1000, '');
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
  });

  it('kind yuborilmaydi: server uni umumiy xarajat deb oladi', () => {
    expect(buildCashEntryPayload('Sut', 1000, '', 'k')).not.toHaveProperty('kind');
  });

  it('businessDate faqat berilganda yuboriladi', () => {
    expect(buildCashEntryPayload('Sut', 1000, '', 'k')).not.toHaveProperty('businessDate');
    expect(buildCashEntryPayload('Sut', 1000, '', 'k', '2026-10-03').businessDate).toBe('2026-10-03');
  });
});
