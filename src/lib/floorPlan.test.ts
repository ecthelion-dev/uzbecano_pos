import { describe, it, expect } from 'vitest';
import { tableState, TableHold } from './floorPlan';

const OTHER: TableHold = {
  tableNumber: 'Bar 1',
  holder: 'Ravshan',
  holderId: 'w_ravshan',
  deviceId: 'telefon-0002',
  total: 45000,
};

const ME = 'kassa-desktop-0001';

const RAVSHAN = { id: 'w_ravshan', name: 'Ravshan' };
const DILSORA = { id: 'w_dilsora', name: 'Dilsora' };

const state = (over: Partial<Parameters<typeof tableState>[0]> = {}) =>
  tableState({
    tableNumber: 'Bar 1',
    draftTotal: 0,
    holds: [],
    deviceId: ME,
    // Sukut bo'yicha stolni BOSHQA xodim ushlab turadi.
    user: DILSORA,
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
    expect(s.heldBy).toBe('Ravshan');
  });

  it('summa o‘sha qurilmadan olinadi', () => {
    // Ilgari bu yerda "Jami: 0" turardi va stol bo‘shdek ko‘rinardi.
    expect(state({ holds: [OTHER] }).total).toBe(45000);
  });

  it('stol nomi katta-kichik harf va bo‘shliqdan qat‘i nazar mos keladi', () => {
    const s = state({ holds: [{ ...OTHER, tableNumber: '  bar 1 ' }] });
    expect(s.heldBy).toBe('Ravshan');
  });

  it('boshqa stolning belgisi ta’sir qilmaydi', () => {
    expect(state({ holds: [{ ...OTHER, tableNumber: 'Bar 2' }] }).occupied).toBe(false);
  });
});

describe('o‘z belgim', () => {
  const mine: TableHold = { ...OTHER, deviceId: ME, holder: 'Dilsora', holderId: 'w_dilsora' };

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
    expect(s.heldBy).toBe('Ravshan');
  });

  it('nomsiz egasi ham qulflaydi', () => {
    // Ism yo'qolgani stolni ochib qo'yish uchun sabab emas.
    const s = state({ holds: [{ ...OTHER, holder: '' }] });
    expect(s.heldBy).toBe('');
    expect(s.occupied).toBe(true);
  });
});

describe('qulf QURILMAGA emas, XODIMGA bog‘langan', () => {
  it('stolni band qilgan xodim uni boshqa qurilmadan ocha oladi', () => {
    // Ravshan desktopda buyurtma boshladi va telefoniga o'tdi. Ilgari qulf
    // qurilma bo'yicha ishlagani uchun u o'z stoliga kira olmasdi.
    const s = state({ holds: [OTHER], user: RAVSHAN });
    expect(s.heldBy).toBeUndefined();
    // Stol baribir band ko'rinadi — buyurtma yig'ilayapti.
    expect(s.occupied).toBe(true);
    expect(s.total).toBe(45000);
  });

  it('boshqa xodim hisobidan kirilsa qulf yopiq qoladi', () => {
    expect(state({ holds: [OTHER], user: DILSORA }).heldBy).toBe('Ravshan');
  });

  it('id bo‘lmasa ism bo‘yicha solishtiriladi', () => {
    // Eski kassa yozgan belgida id yo'q. Ism kamroq ishonchli, lekin qulfni
    // butunlay ochib qo'yishdan yaxshiroq.
    const legacy: TableHold = { ...OTHER, holderId: undefined };
    expect(state({ holds: [legacy], user: { name: 'ravshan' } }).heldBy).toBeUndefined();
    expect(state({ holds: [legacy], user: { name: 'Dilsora' } }).heldBy).toBe('Ravshan');
  });

  it('id lar mos bo‘lsa ism farqi ahamiyatsiz', () => {
    // Xodim nomi o'zgartirilgan bo'lishi mumkin.
    const s = state({ holds: [OTHER], user: { id: 'w_ravshan', name: 'Ravshan Yangi' } });
    expect(s.heldBy).toBeUndefined();
  });

  it('kim kirgani noma’lum bo‘lsa qulf yopiq qoladi', () => {
    // Ochib qo'yish xavfliroq: ikkita xodim bitta stolga yozib yuborardi.
    expect(state({ holds: [OTHER], user: {} }).heldBy).toBe('Ravshan');
  });

  it('ikki tomonda ham ism yo‘q bo‘lsa qulf OCHILMAYDI', () => {
    /*
     * Ikkita bo'sh ism bir-biriga teng, ya'ni oddiy solishtiruv ularni
     * "bitta odam" deb hisoblardi va qulfni ochib yuborardi. Bu eng yomon
     * holat: hech kim aniqlanmagan, lekin stol ochiq.
     */
    const anonymous: TableHold = { ...OTHER, holder: '', holderId: undefined };
    expect(state({ holds: [anonymous], user: {} }).heldBy).toBe('');
  });
});
