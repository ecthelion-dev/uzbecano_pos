import { describe, it, expect } from 'vitest';
import { splitPayment } from './payment';

/**
 * To'lovni bo'lish.
 *
 * Server naqd va karta yig'indisini chek summasi bilan solishtiradi va
 * tenglashmasa to'lovni RAD ETADI. Ya'ni bu yerdagi bir so'mlik xato
 * kassirga "stol yopilmadi" bo'lib ko'rinadi va u sababini bilmaydi.
 */
describe('to‘lovni bo‘lish', () => {
  it('to‘liq naqd', () => {
    expect(splitPayment(45000, 45000)).toEqual({ cash: 45000, card: 0, method: 'naqd' });
  });

  it('to‘liq karta', () => {
    expect(splitPayment(45000, 0)).toEqual({ cash: 0, card: 45000, method: 'karta' });
  });

  it('aralash — qolgani o‘zi kartaga o‘tadi', () => {
    expect(splitPayment(45000, 20000)).toEqual({ cash: 20000, card: 25000, method: 'aralash' });
  });

  it('chekdan ko‘p naqd kiritilsa karta MANFIY bo‘lmaydi', () => {
    // Kassir 100 000 deb yozib yuborsa, karta -55 000 bo'lib ketardi va
    // server bunday to'lovni rad etardi.
    expect(splitPayment(45000, 100000)).toEqual({ cash: 45000, card: 0, method: 'naqd' });
  });

  it('manfiy kiritma nolga tushadi', () => {
    expect(splitPayment(45000, -5000)).toEqual({ cash: 0, card: 45000, method: 'karta' });
  });

  it('yig‘indi HAR DOIM chek summasiga teng', () => {
    // Eng muhim qoida — shuning uchun bitta holat emas, ko'p holat sinaladi.
    for (const total of [0, 1, 999, 45000, 1234567]) {
      for (const cash of [-100, 0, 1, 500, total - 1, total, total + 1, 10 ** 9]) {
        const s = splitPayment(total, cash);
        expect(s.cash + s.card).toBe(total);
        expect(s.cash).toBeGreaterThanOrEqual(0);
        expect(s.card).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('kasr summa butunlanadi va yig‘indi baribir to‘g‘ri', () => {
    const s = splitPayment(45000, 20000.6);
    expect(s.cash + s.card).toBe(45000);
  });

  it('son bo‘lmagan kiritma to‘lovni buzmaydi', () => {
    // Bo'sh maydon `Number('')` = 0 emas, `NaN` bo'lishi mumkin edi.
    expect(splitPayment(45000, NaN)).toEqual({ cash: 0, card: 45000, method: 'karta' });
  });

  it('nol summali chek "aralash" deb yozilmaydi', () => {
    expect(splitPayment(0, 0).method).toBe('naqd');
  });
});
