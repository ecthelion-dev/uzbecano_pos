import { describe, it, expect } from 'vitest';
import { oldestQueuedAt, summariseBacklog, STUCK_AFTER_MS } from './syncHealth';

const NOW = 1_757_500_000_000;

describe('navbat holati', () => {
  it('bo‘sh navbatda hisobot to‘liq', () => {
    const v = summariseBacklog({ pending: 0, failed: 0 }, NOW);
    expect(v.total).toBe(0);
    expect(v.incomplete).toBe(false);
    expect(v.stuck).toBe(false);
  });

  it('bitta yuborilmagan amal ham hisobotni to‘liqsiz qiladi', () => {
    // Smena hisoboti pul sanaladigan paytda chiqadi. Bitta chek yetishmasa
    // ham raqam noto'g'ri — "deyarli to'g'ri" degan hisobot yo'q.
    expect(summariseBacklog({ pending: 1, failed: 0 }, NOW).incomplete).toBe(true);
    expect(summariseBacklog({ pending: 0, failed: 1 }, NOW).incomplete).toBe(true);
  });

  it('kutayotgan va rad etilgan amallar qo‘shib sanaladi', () => {
    expect(summariseBacklog({ pending: 3, failed: 2 }, NOW).total).toBe(5);
  });

  it('yangi navbat tiqilib qolgan hisoblanmaydi', () => {
    const v = summariseBacklog({ pending: 2, oldestQueuedAt: NOW - 60_000, failed: 0 }, NOW);
    expect(v.stuck).toBe(false);
    expect(v.waitingMinutes).toBe(1);
  });

  it('uzoq kutgan navbat tiqilib qolgan hisoblanadi', () => {
    const v = summariseBacklog({ pending: 1, failed: 0, oldestQueuedAt: NOW - STUCK_AFTER_MS }, NOW);
    expect(v.stuck).toBe(true);
    expect(v.waitingMinutes).toBe(15);
  });

  it('rad etilgan amal darhol tiqilish — u o‘zi ketmaydi', () => {
    const v = summariseBacklog({ pending: 0, failed: 1 }, NOW);
    expect(v.stuck).toBe(true);
  });

  it('vaqti yo‘q eski yozuv soatni noldan boshlamaydi', () => {
    const v = summariseBacklog({ pending: 1, failed: 0 }, NOW);
    expect(v.waitingMinutes).toBe(0);
    expect(v.stuck).toBe(false);
  });

  it('kelajakdagi vaqt manfiy kutish bermaydi', () => {
    const v = summariseBacklog({ pending: 1, failed: 0, oldestQueuedAt: NOW + 60_000 }, NOW);
    expect(v.waitingMinutes).toBe(0);
  });
});

describe('eng eski yozuv', () => {
  it('eng kichik vaqtni topadi', () => {
    expect(oldestQueuedAt([{ queuedAt: 300 }, { queuedAt: 100 }, { queuedAt: 200 }])).toBe(100);
  });

  it('vaqtsiz yozuvlarni tashlab ketadi', () => {
    expect(oldestQueuedAt([{}, { queuedAt: 500 }])).toBe(500);
    expect(oldestQueuedAt([{}, {}])).toBe(null);
  });

  it('bo‘sh navbatda null', () => {
    expect(oldestQueuedAt([])).toBe(null);
  });
});
