import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './testStorage';

installMemoryStorage();

const {
  cafeKey,
  CAFE_KEYS,
  GLOBAL_KEYS,
  readJson,
  writeJson,
  readText,
  writeText,
  readCafeJson,
  writeCafeJson,
  readCafeText,
  writeCafeText,
  removeCafeKey,
  purgeLegacyCafeKeys,
} = await import('./storage');

beforeEach(() => {
  installMemoryStorage();
});

describe('diskdagi yozuvlar', () => {
  it('kalitni eski ko\'rinishida yasaydi', () => {
    // Kalit shakli o'zgarsa yangilangan kassa eski yozuvlarni topolmay
    // qoladi: buyurtmalar ro'yxati bo'shab, kassir ochiq stollarni yo'qotadi.
    expect(cafeKey('uzbecano', 'orders')).toBe('orderplus_uzbecano_orders');
    expect(cafeKey('uzbecano', 'sync_queue')).toBe('orderplus_uzbecano_sync_queue');
    expect(GLOBAL_KEYS.cafeId).toBe('orderplus_cafe_id');
    expect(GLOBAL_KEYS.printerSettings).toBe('orderplus_printer_settings');
    // Prefikssiz, eski versiyalardan qolgan nom — ataylab o'zgartirilmagan.
    expect(GLOBAL_KEYS.serviceFeePercent).toBe('serviceFeePercent');
  });

  it('har bir kafe o\'z yozuvini ko\'radi', () => {
    writeCafeJson('uzbecano', 'orders', [{ id: 'a' }]);
    writeCafeJson('boshqa', 'orders', [{ id: 'b' }]);
    expect(readCafeJson('uzbecano', 'orders', [])).toEqual([{ id: 'a' }]);
    expect(readCafeJson('boshqa', 'orders', [])).toEqual([{ id: 'b' }]);
  });

  it('buzuq JSON da zaxira qiymat qaytaradi', () => {
    // Diskdagi buzuq yozuvni kassir tuzata olmaydi — kassa ishlayverishi kerak.
    localStorage.setItem('orderplus_uzbecano_orders', '{yarim yozilgan');
    expect(readCafeJson('uzbecano', 'orders', [])).toEqual([]);
  });

  it('yozuv yo\'q bo\'lganda zaxira qiymat qaytaradi', () => {
    expect(readCafeJson('uzbecano', 'products', ['zaxira'])).toEqual(['zaxira']);
    expect(readCafeText('uzbecano', 'name')).toBe(null);
  });

  it('"null" yozuvini ham zaxira bilan almashtiradi', () => {
    // JSON.parse('null') xato bermaydi-yu, null qaytaradi — chaqiruvchi esa
    // massiv kutadi va birinchi `.map` da yiqiladi.
    localStorage.setItem('orderplus_uzbecano_orders', 'null');
    expect(readCafeJson('uzbecano', 'orders', [])).toEqual([]);
  });

  it('xotira yopiq bo\'lganda ham yiqilmaydi', () => {
    const broken = {
      getItem() { throw new Error('shaxsiy rejim'); },
      setItem() { throw new Error('disk to\'lgan'); },
      removeItem() { throw new Error('yopiq'); },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: broken, configurable: true });

    expect(readCafeJson('uzbecano', 'orders', ['zaxira'])).toEqual(['zaxira']);
    expect(writeCafeText('uzbecano', 'name', 'Uzbecano')).toBe(false);
    expect(() => removeCafeKey('uzbecano', 'orders')).not.toThrow();
  });

  it('aylanma havolali obyektda yozuvni buzmaydi', () => {
    const loop: any = { a: 1 };
    loop.self = loop;
    expect(writeJson('orderplus_test', loop)).toBe(false);
    // Eski qiymat joyida qoladi, yarim yozilgan matn emas.
    expect(readText('orderplus_test')).toBe(null);
  });

  it('matn va JSON yozuvlari aralashmaydi', () => {
    writeText('orderplus_test', 'oddiy matn');
    expect(readJson('orderplus_test', 'zaxira')).toBe('zaxira');
    expect(readText('orderplus_test')).toBe('oddiy matn');
  });

  it('kalitlar ro\'yxatida takror yo\'q', () => {
    expect(new Set(CAFE_KEYS).size).toBe(CAFE_KEYS.length);
  });

  it('kafega bog\'lanmagan eski yozuvlarni tozalaydi', () => {
    // Ular endi hech kim tomonidan o'qilmaydi, lekin diskda oxirgi ulangan
    // kafening nomi va logotipi bo'lib qolib ketardi.
    localStorage.setItem('orderplus_cafe_name', 'Eski kafe');
    localStorage.setItem('orderplus_cafe_logo', 'data:image/png;base64,AAA');
    writeCafeText('uzbecano', 'name', 'Uzbecano');

    purgeLegacyCafeKeys();

    expect(localStorage.getItem('orderplus_cafe_name')).toBe(null);
    expect(localStorage.getItem('orderplus_cafe_logo')).toBe(null);
    // Kafega bog'langan yozuvga tegmaydi.
    expect(readCafeText('uzbecano', 'name')).toBe('Uzbecano');
  });
});
