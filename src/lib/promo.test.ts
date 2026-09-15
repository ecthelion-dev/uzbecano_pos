import { describe, it, expect } from 'vitest';
import { orderTotals, parsePromoTerms, promoCodeFromScan, promoDiscount } from './promo';

const OSH20 = { code: 'OSH20', type: 'percent', value: 20, minOrder: 0 };

describe('chegirma — server bilan bir xil', () => {
  it('foizni summadan hisoblaydi', () => {
    expect(promoDiscount({ ...OSH20, value: 15 }, 35000)).toBe(5250);
  });

  it('qat’iy summa buyurtmadan oshmaydi', () => {
    expect(promoDiscount({ code: 'X', type: 'fixed', value: 50000, minOrder: 0 }, 30000)).toBe(30000);
  });

  it('minimal summaga yetmasa chegirma yo‘q', () => {
    expect(promoDiscount({ code: 'X', type: 'fixed', value: 5000, minOrder: 100000 }, 99999)).toBe(0);
  });

  it('promo yo‘q bo‘lsa chegirma nol', () => {
    expect(promoDiscount(null, 70000)).toBe(0);
  });
});

describe('chek summasi', () => {
  it('xizmat haqi chegirmagacha bo‘lgan summadan olinadi', () => {
    // Server: 70 000 + 7 000 − 14 000. Xizmat haqi 56 000 dan olinsa,
    // to'lov serverdagi summaga teng chiqmay rad etilardi.
    expect(orderTotals(70000, 10, OSH20)).toEqual({ serviceFee: 7000, discount: 14000, total: 63000 });
  });

  it('promo yo‘q bo‘lsa oddiy summa', () => {
    expect(orderTotals(70000, 10, null)).toEqual({ serviceFee: 7000, discount: 0, total: 77000 });
  });
});

describe('serverdan kelgan shartlar', () => {
  it('buzilgan qiymatni promo deb hisoblamaydi', () => {
    expect(parsePromoTerms(null)).toBeNull();
    expect(parsePromoTerms({})).toBeNull();
    expect(parsePromoTerms({ code: 'X', type: 'percent', value: 'abc' })).toBeNull();
  });

  it('to‘g‘ri shartlarni o‘qiydi', () => {
    expect(parsePromoTerms(OSH20)).toEqual(OSH20);
  });
});

describe('QR dan kod', () => {
  it('QR ichidagi kodni oladi', () => {
    expect(promoCodeFromScan(' osh20 \n')).toBe('OSH20');
  });

  it('havoladagi promo parametrini oladi', () => {
    expect(promoCodeFromScan('https://orderplus.uz/menu/uzbecano?promo=yoz-2026')).toBe('YOZ-2026');
  });

  it('promo parametri yo‘q havola kod emas', () => {
    expect(promoCodeFromScan('https://orderplus.uz/menu/uzbecano?table=5')).toBeNull();
  });

  it('bo‘sh joyli yoki juda uzun matn kod emas', () => {
    expect(promoCodeFromScan('salom dunyo')).toBeNull();
    expect(promoCodeFromScan('A'.repeat(65))).toBeNull();
    expect(promoCodeFromScan('')).toBeNull();
  });
});
