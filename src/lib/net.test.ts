import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchWithTimeout, TILL_TIMEOUT_MS } from './net';

/**
 * Kassa serverni cheksiz kutmasligi kerak.
 *
 * Internet uzilganda chek chiqmay qolgan edi. Sabab tarmoqning yiqilishi
 * emas — yiqilgan tarmoq darhol xato beradi va u allaqachon hisobga
 * olingan. Sabab OSILGAN tarmoq edi: Wi-Fi ulangan, router ishlayapti,
 * lekin tashqariga chiqmaydi. O'shanda `fetch` na javob, na xato beradi va
 * chek o'sha kutish ortida qolib ketardi.
 */
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('cheklangan kutish bilan so‘rov', () => {
  it('javob kelsa uni o‘zgartirmasdan qaytaradi', async () => {
    const res = { ok: true, status: 200 };
    (globalThis as any).fetch = vi.fn(async () => res);
    expect(await fetchWithTimeout('/api/orders')).toBe(res);
  });

  it('so‘rov osilib qolsa uzadi va xato otadi', async () => {
    vi.useFakeTimers();
    let aborted = false;
    (globalThis as any).fetch = vi.fn((_url: any, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('aborted'));
        });
      }),
    );

    const pending = fetchWithTimeout('/api/orders', { method: 'PATCH' });
    // Kutuvchi darhol ulanadi: aks holda rad etish soatni surganimizda
    // "hech kim ushlamagan" bo'lib qolib, testni shovqinga to'ldiradi.
    const rejects = expect(pending).rejects.toThrow();

    // Kutish tugamaguncha hech nima bo'lmaydi.
    await vi.advanceTimersByTimeAsync(TILL_TIMEOUT_MS - 100);
    expect(aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    await rejects;
    expect(aborted).toBe(true);
  });

  it('chaqiruvchi uchun bu oddiy tarmoq xatosidan farq qilmaydi', async () => {
    // Har bir chaqiruv joyida `catch` bor va u amalni navbatga yozadi.
    // Uzilish ham xato bo'lib kelishi shart, aks holda o'sha `catch`
    // ishlamas va amal yo'qolardi.
    vi.useFakeTimers();
    (globalThis as any).fetch = vi.fn((_url: any, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    );

    let queued = false;
    const call = (async () => {
      try {
        await fetchWithTimeout('/api/orders');
      } catch {
        queued = true;
      }
    })();

    await vi.advanceTimersByTimeAsync(TILL_TIMEOUT_MS + 100);
    await call;
    expect(queued).toBe(true);
  });
});

/**
 * Qog'oz birinchi, sinxronizatsiya keyin.
 *
 * Chekdagi hamma narsa kassaning o'zida ma'lum: serverning javobidan
 * hech nima olinmaydi. Shunga qaramay chek to'lov so'rovidan KEYIN
 * bosilardi va shu bilan tarmoqqa bog'lanib qolgan edi.
 */
describe('stol yopilganda chek', () => {
  const src = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf-8');

  it('to‘lov so‘rovidan oldin bosiladi', () => {
    const print = src.indexOf('printClosedReceipt(closedOrder)');
    const patch = src.indexOf("'finalize_payment'", print > 0 ? print : 0);
    expect(print, "chek chop etish chaqiruvi topilmadi").toBeGreaterThan(0);
    expect(patch, "to'lovni saqlash topilmadi").toBeGreaterThan(print);
  });

  it('kassadagi har bir so‘rov cheklangan kutish bilan ketadi', () => {
    // Bittasi ham oddiy `fetch(` bo'lib qolsa, o'sha joy yana osilib
    // qolishi mumkin — va bu safar buni hech kim sezmaydi.
    const bare = src.match(/await fetch\(/g) ?? [];
    expect(bare).toEqual([]);
  });
});
