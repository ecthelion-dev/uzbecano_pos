import { describe, it, expect } from 'vitest';
import { canSync, decideFromStatus, isRetryableStatus, NETWORK_FAILURE } from './syncQueue';

/**
 * Bu testlar 2026-09-10 dagi yo'qotishni qaytarib kelmaslik uchun.
 * O'sha kuni navbatdagi to'rtta buyurtma 401 tufayli o'chirib yuborilgan edi.
 */
describe('oflayn navbat qarori', () => {
  it('401 — qayta urinadi, o‘chirmaydi', () => {
    expect(isRetryableStatus(401)).toBe(true);
    expect(decideFromStatus(401)).toBe('retry');
  });

  it('tarmoq uzilishi qayta urinadi', () => {
    expect(NETWORK_FAILURE).toBe('retry');
  });

  it('server xatosi va bandligi qayta urinadi', () => {
    for (const s of [500, 502, 503, 504, 429, 408]) {
      expect(decideFromStatus(s)).toBe('retry');
    }
  });

  it('haqiqiy rad etish navbatdan chiqadi, lekin yo‘qolmaydi', () => {
    for (const s of [400, 404, 409, 422]) {
      expect(decideFromStatus(s)).toBe('park');
    }
  });

  it('403 qayta urinilmaydi — huquq qayta urinishdan paydo bo‘lmaydi', () => {
    expect(isRetryableStatus(403)).toBe(false);
    expect(decideFromStatus(403)).toBe('park');
  });

  it('qabul qilingan javob tugadi', () => {
    for (const s of [200, 201, 204]) {
      expect(decideFromStatus(s)).toBe('done');
    }
  });
});

describe('sessiyasiz sinxronlash', () => {
  it('tokensiz urinmaydi', () => {
    expect(canSync(null)).toBe(false);
    expect(canSync(undefined)).toBe(false);
    expect(canSync('')).toBe(false);
  });

  it('token bo‘lsa urinadi', () => {
    expect(canSync('abc')).toBe(true);
  });
});
