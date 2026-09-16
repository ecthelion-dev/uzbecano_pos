import { describe, it, expect } from 'vitest';
import {
  canSync,
  decideFromStatus,
  isRetryableStatus,
  NETWORK_FAILURE,
  newQueueId,
  removeProcessed,
  withQueueIds,
} from './syncQueue';

/**
 * Bu testlar 2026-09-10 dagi yo'qotishni qaytarib kelmaslik uchun.
 * O'sha kuni navbatdagi to'rtta buyurtma 401 tufayli o'chirib yuborilgan edi.
 */
describe('oflayn navbat qarori', () => {
  it('401 — qayta urinadi, o‘chirmaydi', () => {
    expect(isRetryableStatus(401)).toBe(true);
    expect(decideFromStatus(401)).toBe('retry');
  });

  it('409 — qayta urinadi: ma‘lumot eskirgan, rad etilgan emas', () => {
    // Server chekni "biz o'qigandan keyin boshqa birov o'zgartirdi" deganda
    // 409 qaytaradi. Keyingi urinish chekni QAYTADAN o'qiydi, ya'ni o'sha
    // urinish o'tadi. Uni chetga qo'yish pulni qo'lda ko'rib chiqishga
    // yuborardi — hech qanday sababsiz.
    expect(isRetryableStatus(409)).toBe(true);
    expect(decideFromStatus(409)).toBe('retry');
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
    for (const s of [400, 404, 422]) {
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

/**
 * Navbat yozuvining o'z nomi bo'lishi kerak — 2026-09-16 dagi poyga uchun.
 *
 * Drenaj navbatni boshida o'qir, har bir yozuv uchun 8 soniyagacha kutar va
 * OXIRIDA butun navbatni eski nusxadan hisoblangan ro'yxat bilan almashtirar
 * edi. Wi-Fi o'lgan paytda bu 40 soniyagacha cho'zilardi, va o'sha oraliqda
 * urilgan har qanday buyurtma yakuniy yozuv ostida qolib ketardi: xatosiz,
 * ogohlantirishsiz, `sync_failed`ga ham tushmasdan.
 *
 * Endi yakunda faqat ISHLANGAN yozuvlar nomi bo'yicha olib tashlanadi.
 */
describe('navbat yozuvining nomi', () => {
  it('har safar yangi nom beradi', () => {
    expect(newQueueId()).not.toBe(newQueueId());
  });

  it('nomsiz yozuvlarga nom qo‘yadi va buni diskka yozish kerakligini aytadi', () => {
    // Arrange
    const queue = [{ kind: 'create' }, { kind: 'patch' }];

    // Act
    const result = withQueueIds(queue);

    // Assert
    expect(result.changed).toBe(true);
    expect(result.queue.every((q) => typeof q.qid === 'string' && q.qid.length > 0)).toBe(true);
    expect(result.queue[0].qid).not.toBe(result.queue[1].qid);
  });

  it('mavjud nomni saqlaydi va bekorga diskka tegmaydi', () => {
    const queue = [{ kind: 'create', qid: 'q-1' }];

    const result = withQueueIds(queue);

    expect(result.changed).toBe(false);
    expect(result.queue[0].qid).toBe('q-1');
  });

  it('kirish massivini o‘zgartirmaydi', () => {
    const queue = [{ kind: 'create' }];

    withQueueIds(queue);

    expect((queue[0] as any).qid).toBeUndefined();
  });

  it('buzuq yozuvni tashlab yuboradi', () => {
    const result = withQueueIds([null, { kind: 'patch' }, 'shalpaq']);

    expect(result.queue).toHaveLength(1);
    expect(result.changed).toBe(true);
  });

  it('massiv bo‘lmasa diskka tegmaydi', () => {
    // O'qib bo'lmagan narsani [] bilan almashtirish — yo'qotish bo'lardi.
    const result = withQueueIds('shalpaq');

    expect(result.queue).toEqual([]);
    expect(result.changed).toBe(false);
  });
});

describe('ishlangan yozuvlarni navbatdan olib tashlash', () => {
  it('ishlanganini olib tashlaydi, qolganini qoldiradi', () => {
    // Arrange
    const current = [{ qid: 'a' }, { qid: 'b' }, { qid: 'c' }];

    // Act
    const left = removeProcessed(current, new Set(['a', 'c']));

    // Assert
    expect(left.map((q) => q.qid)).toEqual(['b']);
  });

  it('DRENAJ PAYTIDA qo‘shilgan yozuvni yo‘qotmaydi', () => {
    // Bu testning butun mavzusi: `d` navbatga drenaj ishlayotgan paytda
    // tushgan, ya'ni drenajning boshidagi nusxada u YO'Q. Yakunda navbat
    // to'liq almashtirilsa, u jimgina o'chib ketardi — va u kassirning
    // hozirgina urgan buyurtmasi.
    const snapshotIds = new Set(['a', 'b']);
    const current = [{ qid: 'a' }, { qid: 'b' }, { qid: 'd' }];

    const left = removeProcessed(current, snapshotIds);

    expect(left.map((q) => q.qid)).toEqual(['d']);
  });

  it('nomsiz eski yozuvni o‘chirmaydi', () => {
    const current = [{ qid: 'a' }, {}];

    const left = removeProcessed(current, new Set(['a']));

    expect(left).toHaveLength(1);
  });

  it('bo‘sh to‘plam hech narsani o‘zgartirmaydi', () => {
    const current = [{ qid: 'a' }, { qid: 'b' }];

    expect(removeProcessed(current, new Set()).map((q) => q.qid)).toEqual(['a', 'b']);
  });

  it('kirish massivini o‘zgartirmaydi', () => {
    const current = [{ qid: 'a' }, { qid: 'b' }];

    removeProcessed(current, new Set(['a']));

    expect(current).toHaveLength(2);
  });

  it('massiv bo‘lmasa bo‘sh ro‘yxat qaytaradi', () => {
    expect(removeProcessed('shalpaq' as unknown as { qid: string }[], new Set())).toEqual([]);
  });
});
