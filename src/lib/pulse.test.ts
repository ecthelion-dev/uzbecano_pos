import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchPulse, resetPulse, pulseQuery } from './pulse';

/**
 * Bitta so'rov va barmoq izi.
 *
 * Iz "kassadagi ma'lumot shu holatga mos" degani, shuning uchun uni
 * noto'g'ri saqlash eng qimmat xato: server 304 qaytaradi, kassa esa eski
 * yoki bo'sh ro'yxat bilan qolib ketadi — yangi buyurtma ko'rinmaydi.
 */

const headers = { Authorization: 'Bearer t' };

function mockFetch(impl: (url: string, init?: any) => any) {
  const spy = vi.fn(async (url: any, init?: any) => impl(String(url), init));
  (globalThis as any).fetch = spy;
  return spy;
}

const body = { orders: [{ id: 'order_1' }], waiterCalls: [], printJobs: [] };

function okRes(etag: string | null, data: unknown = body) {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'etag' ? etag : null) },
    json: async () => data,
  };
}

const notModified = {
  ok: false,
  status: 304,
  headers: { get: () => null },
  json: async () => ({}),
};

beforeEach(() => resetPulse());
afterEach(() => vi.restoreAllMocks());

describe('bitta so‘rov', () => {
  it('birinchi safar izsiz so‘raydi', async () => {
    const spy = mockFetch(() => okRes('"a1"'));
    const res = await fetchPulse(headers, false);

    expect(res.kind).toBe('fresh');
    expect(spy.mock.calls[0][1].headers['If-None-Match']).toBeUndefined();
  });

  it('keyingi safar izni qaytaradi', async () => {
    const spy = mockFetch(() => okRes('"a1"'));
    await fetchPulse(headers, false);
    await fetchPulse(headers, false);

    expect(spy.mock.calls[1][1].headers['If-None-Match']).toBe('"a1"');
  });

  it('o‘zgarmagan bo‘lsa "same" qaytaradi', async () => {
    mockFetch((_u, init) => (init.headers['If-None-Match'] ? notModified : okRes('"a1"')));
    await fetchPulse(headers, false);
    expect((await fetchPulse(headers, false)).kind).toBe('same');
  });

  it('printer ulangan qurilma o‘zini bildiradi', async () => {
    // Faqat shunga chop etish navbati beriladi va faqat shu qurilma
    // "kassa ochiq" deb hisoblanadi.
    const spy = mockFetch(() => okRes('"a1"'));
    await fetchPulse(headers, true);
    expect(String(spy.mock.calls[0][0])).toContain('consumer=1');

    resetPulse();
    await fetchPulse(headers, false);
    expect(String(spy.mock.calls[1][0])).not.toContain('consumer=1');
  });
});

describe('izni saqlash', () => {
  it('faqat ma’lumot o‘qilgandan keyin saqlanadi', async () => {
    // Yarim o'qilgan javobdan keyin iz saqlansa, kassa o'zini yangilangan
    // deb hisoblar va keyingi so'rovda 304 olib, ma'lumotsiz qolardi.
    const spy = mockFetch(() => ({
      ok: true,
      status: 200,
      headers: { get: () => '"a1"' },
      json: async () => { throw new Error('yarim javob'); },
    }));

    expect((await fetchPulse(headers, false)).kind).toBe('failed');
    await fetchPulse(headers, false);
    expect(spy.mock.calls[1][1].headers['If-None-Match']).toBeUndefined();
  });

  it('buzuq javobdan keyin ham iz saqlanmaydi', async () => {
    const spy = mockFetch(() => okRes('"a1"', { orders: 'ro‘yxat emas' }));
    expect((await fetchPulse(headers, false)).kind).toBe('failed');
    await fetchPulse(headers, false);
    expect(spy.mock.calls[1][1].headers['If-None-Match']).toBeUndefined();
  });

  it('chiqib ketilganda iz tashlanadi', async () => {
    // Kafe almashsa yoki xodim chiqsa, kassadagi ro'yxat boshqacha bo'ladi.
    const spy = mockFetch(() => okRes('"a1"'));
    await fetchPulse(headers, false);
    resetPulse();
    await fetchPulse(headers, false);
    expect(spy.mock.calls[1][1].headers['If-None-Match']).toBeUndefined();
  });
});

describe('server eski bo‘lsa', () => {
  it('404 ni xato emas, "unsupported" deb ajratadi', async () => {
    // Kassa serverdan keyin yangilanadi. Buni oddiy xato deb hisoblasak,
    // kassa o'sha oraliqda buyurtmalarni umuman ko'rmay qolardi — eski
    // yo'lga tushish uchun buni ajratib bilish kerak.
    mockFetch(() => ({ ok: false, status: 404, headers: { get: () => null }, json: async () => ({}) }));
    expect((await fetchPulse(headers, false)).kind).toBe('unsupported');
  });

  it('boshqa xatolar oddiy "failed"', async () => {
    mockFetch(() => ({ ok: false, status: 500, headers: { get: () => null }, json: async () => ({}) }));
    expect((await fetchPulse(headers, false)).kind).toBe('failed');
  });

  it('tarmoq yiqilsa xato otmaydi', async () => {
    mockFetch(() => { throw new Error('offline'); });
    expect((await fetchPulse(headers, false)).kind).toBe('failed');
  });
});

describe('stol belgilari', () => {
  it('javobdagi belgilarni beradi', async () => {
    mockFetch(() => okRes('"h1"', {
      orders: [],
      waiterCalls: [],
      printJobs: [],
      tableHolds: [{ tableNumber: 'Bar 3', holder: 'Ravshan', deviceId: 'd1' }],
    }));

    const result = await fetchPulse({}, false);
    expect(result.kind).toBe('fresh');
    if (result.kind === 'fresh') {
      expect(result.data.tableHolds).toEqual([
        { tableNumber: 'Bar 3', holder: 'Ravshan', deviceId: 'd1' },
      ]);
    }
  });

  it('eski serverda bo‘sh ro‘yxat — zal ko‘rinishi buzilmaydi', async () => {
    // Kassa serverdan keyin yangilanadi: oraliqda maydon umuman bo'lmaydi.
    mockFetch(() => okRes('"h2"', { orders: [], waiterCalls: [], printJobs: [] }));

    const result = await fetchPulse({}, false);
    if (result.kind === 'fresh') expect(result.data.tableHolds).toEqual([]);
  });
});

/**
 * Nabz — kassaning yurak urishi. Manzil buzilsa kassa serverdan hech narsa
 * eshitmay qoladi, shuning uchun uni yig'ish qoidasi ham qulflangan.
 */
describe('nabz manzili', () => {
  it('printerli qurilma va kafe — ikkalasi ham qo‘shiladi', () => {
    expect(pulseQuery(true, 'uzbecano')).toBe('?consumer=1&cafe=uzbecano');
  });

  it('printersiz qurilmada faqat kafe', () => {
    expect(pulseQuery(false, 'uzbecano')).toBe('?cafe=uzbecano');
  });

  it('kafe noma‘lum bo‘lsa eski manzil o‘zgarmaydi', () => {
    expect(pulseQuery(true, '')).toBe('?consumer=1');
    expect(pulseQuery(false, '')).toBe('');
  });

  it('kafe nomi manzil uchun xavfsiz yoziladi', () => {
    expect(pulseQuery(false, 'a b&c')).toBe('?cafe=a%20b%26c');
  });
});
