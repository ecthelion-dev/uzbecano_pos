import { describe, it, expect } from 'vitest';
import { tableState, TableHold } from './floorPlan';

const OTHER: TableHold = {
  tableNumber: 'Bar 1',
  holder: 'Dilsora',
  deviceId: 'telefon-0002',
  total: 45000,
};

const ME = 'kassa-desktop-0001';

const state = (over: Partial<Parameters<typeof tableState>[0]> = {}) =>
  tableState({
    tableNumber: 'Bar 1',
    draftTotal: 0,
    holds: [],
    deviceId: ME,
    ...over,
  });

describe('bo‘sh stol', () => {
  it('band emas va summasi nol', () => {
    expect(state()).toEqual({ occupied: false, total: 0, heldBy: undefined });
  });
});

describe('shu qurilmadagi savat', () => {
  it('band, o‘z summasi bilan, qulfsiz', () => {
    expect(state({ draftTotal: 30000 })).toEqual({
      occupied: true,
      total: 30000,
      heldBy: undefined,
    });
  });
});

describe('boshqa qurilmadagi savat', () => {
  it('band va QULFLANGAN', () => {
    // Ikkalasidan ham yuborilsa, stolda ikkita ochiq chek paydo bo'ladi
    // va ulardan biri hech qachon yopilmaydi.
    const s = state({ holds: [OTHER] });
    expect(s.occupied).toBe(true);
    expect(s.heldBy).toBe('Dilsora');
  });

  it('summa o‘sha qurilmadan olinadi', () => {
    // Ilgari bu yerda "Jami: 0" turardi va stol bo‘shdek ko‘rinardi.
    expect(state({ holds: [OTHER] }).total).toBe(45000);
  });

  it('stol nomi katta-kichik harf va bo‘shliqdan qat‘i nazar mos keladi', () => {
    const s = state({ holds: [{ ...OTHER, tableNumber: '  bar 1 ' }] });
    expect(s.heldBy).toBe('Dilsora');
  });

  it('boshqa stolning belgisi ta’sir qilmaydi', () => {
    expect(state({ holds: [{ ...OTHER, tableNumber: 'Bar 2' }] }).occupied).toBe(false);
  });
});

describe('o‘z belgim', () => {
  const mine: TableHold = { ...OTHER, deviceId: ME, holder: 'Ravshan' };

  it('qulflamaydi — bu shu qurilmaning o‘z savati', () => {
    expect(state({ holds: [mine], draftTotal: 30000 }).heldBy).toBeUndefined();
  });

  it('savat bo‘shatilgach, eskirmagan o‘z belgim stolni QULFLAMAYDI', () => {
    /*
     * Belgi serverda ikki daqiqa yashaydi, savat esa darhol bo'shaydi.
     * Oradagi vaqtda kassa o'z belgisini "boshqa qurilma" deb hisoblasa,
     * kassir o'zi endigina bo'shatgan stolni ocholmay qolardi — va
     * kutishdan boshqa chorasi bo'lmasdi.
     */
    const s = state({ holds: [mine], draftTotal: 0 });
    expect(s.heldBy).toBeUndefined();
    expect(s.occupied).toBe(false);
  });
});

describe('serverdagi ochiq chek', () => {
  it('qulfni BEKOR QILADI — buyurtma allaqachon serverda', () => {
    // Yuborilgan buyurtmaga har qanday xodim taom qo'sha oladi: ikkinchi
    // chek yaratilmaydi, mavjudiga qo'shiladi.
    const s = state({ openOrderTotal: 77000, holds: [OTHER] });
    expect(s.occupied).toBe(true);
    expect(s.heldBy).toBeUndefined();
    expect(s.total).toBe(77000);
  });

  it('nol summali ochiq chek ham chek — stol band', () => {
    // `0` ni "chek yo'q" deb tushunib bo'lmaydi: to'liq chegirmali chek
    // ochiq stolni bo'sh ko'rsatardi.
    expect(state({ openOrderTotal: 0 }).occupied).toBe(true);
  });
});

describe('buzuq belgi', () => {
  it('summasiz belgi nol beradi, qulf esa ishlaydi', () => {
    const s = state({ holds: [{ ...OTHER, total: undefined }] });
    expect(s.total).toBe(0);
    expect(s.heldBy).toBe('Dilsora');
  });

  it('nomsiz egasi ham qulflaydi', () => {
    // Ism yo'qolgani stolni ochib qo'yish uchun sabab emas.
    const s = state({ holds: [{ ...OTHER, holder: '' }] });
    expect(s.heldBy).toBe('');
    expect(s.occupied).toBe(true);
  });
});
