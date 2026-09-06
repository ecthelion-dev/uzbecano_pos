import { describe, it, expect } from 'vitest';
import { pressKey, presetEntry, emptyEntry, entryAmount, CashEntry } from './cashInput';

/** Ketma-ket bosish — sinovlarni o'qishga qulay qilish uchun. */
const type = (start: CashEntry, keys: string) =>
  keys.split(' ').reduce((entry, k) => pressKey(entry, k), start);

describe('naqd maydoni', () => {
  it('tayyor summa ustiga terilgan birinchi raqam uni ALMASHTIRADI', () => {
    // Aynan shu buzilgan edi: "Naqd" bosilib 70 000 qo'yilgach, terilgan
    // raqam ustiga qo'shilardi va summa chekka siqilib o'zgarmay qolardi —
    // kassirga maydon ishlamayotgandek ko'rinardi.
    const after = type(presetEntry(70000), '5 0 0 0 0');
    expect(after.value).toBe('50000');
    expect(entryAmount(after)).toBe(50000);
  });

  it('almashtirish faqat BIRINCHI raqamda ishlaydi', () => {
    const after = type(presetEntry(70000), '5');
    expect(pressKey(after, '0').value).toBe('50');
  });

  it('"Karta" (0) ustiga terish ham ishlaydi', () => {
    expect(type(presetEntry(0), '3 0 0 0 0').value).toBe('30000');
  });

  it('bo‘sh maydonga terish', () => {
    expect(type(emptyEntry(), '1 2 3').value).toBe('123');
  });

  it('boshida keraksiz nol yig‘ilmaydi', () => {
    expect(type(emptyEntry(), '0 7').value).toBe('7');
  });

  it('o‘chirish tayyor summani tahrirlanadigan qiladi', () => {
    const after = pressKey(presetEntry(70000), 'DEL');
    expect(after.value).toBe('7000');
    // Endi keyingi raqam almashtirmaydi, qo'shiladi.
    expect(pressKey(after, '5').value).toBe('70005');
  });

  it('"C" maydonni bo‘shatadi', () => {
    expect(pressKey(presetEntry(70000), 'C')).toEqual({ value: '', replace: false });
  });

  it('ko‘p nol tayyor summa ustiga QO‘SHILMAYDI', () => {
    // 70000 + "000" = 70000000 bo'lib ketardi.
    expect(pressKey(presetEntry(70000), '000').value).toBe('70000');
  });

  it('ko‘p nol terilayotgan summaga qo‘shiladi', () => {
    expect(type(emptyEntry(), '5 000').value).toBe('5000');
  });

  it('bo‘sh maydonda ko‘p nol hech narsa qilmaydi', () => {
    expect(pressKey(emptyEntry(), '000').value).toBe('');
  });

  it('uzunlik cheklangan', () => {
    const long = type(emptyEntry(), '1 2 3 4 5 6 7 8 9 1 2 3');
    expect(long.value.length).toBe(10);
    expect(pressKey(long, '000').value.length).toBe(10);
  });

  it('raqam bo‘lmagan tugma holatni o‘zgartirmaydi', () => {
    const entry = presetEntry(70000);
    expect(pressKey(entry, 'x')).toEqual(entry);
  });

  it('bo‘sh maydon — nol summa', () => {
    expect(entryAmount(emptyEntry())).toBe(0);
  });

  it('tayyor summa butunlanadi va manfiy bo‘lmaydi', () => {
    expect(presetEntry(70000.4).value).toBe('70000');
    expect(presetEntry(-5).value).toBe('0');
    expect(presetEntry(NaN).value).toBe('0');
  });
});
