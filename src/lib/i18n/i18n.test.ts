import { describe, it, expect, beforeEach } from 'vitest';
import { localeFromNavigator, isLocale, LOCALES } from './locales';
import { uz } from './dictionaries/uz';
import { ru } from './dictionaries/ru';
import { en } from './dictionaries/en';

/**
 * Kassa tili.
 *
 * Kassa mehmonникidan farqli: u kun bo'yi ochiq turadi va xodim uni
 * bir marta sozlaydi. Shuning uchun eng muhimi — tanlov saqlanishi va
 * qurilma sozlamasi uni bekor qilmasligi.
 */
describe('qurilma tilidan aniqlash', () => {
  it('birinchi mos kelgan tilni oladi', () => {
    expect(localeFromNavigator(['ru-RU', 'en-US'])).toBe('ru');
    expect(localeFromNavigator(['en-GB'])).toBe('en');
    expect(localeFromNavigator(['uz-UZ', 'ru'])).toBe('uz');
  });

  it('qo‘llab-quvvatlanmaydiganini o‘tkazib yuboradi', () => {
    // Turkcha telefon — bizda yo'q, keyingisiga o'tadi.
    expect(localeFromNavigator(['tr-TR', 'ru-RU'])).toBe('ru');
  });

  it('mos til bo‘lmasa null', () => {
    expect(localeFromNavigator(['tr', 'de'])).toBeNull();
    expect(localeFromNavigator([])).toBeNull();
    expect(localeFromNavigator(undefined)).toBeNull();
  });

  it('yaroqsiz qiymatni til deb hisoblamaydi', () => {
    expect(isLocale('xyz')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale('ru')).toBe(true);
  });
});

describe('lug‘atlar', () => {
  const dicts = { ru, en };

  it('uchta til', () => {
    expect(LOCALES).toEqual(['uz', 'ru', 'en']);
  });

  for (const [name, dict] of Object.entries(dicts)) {
    it(`${name}: har bir kalit bor`, () => {
      expect(Object.keys(uz).filter((k) => !(k in dict))).toEqual([]);
    });

    it(`${name}: ortiqcha kalit yo‘q`, () => {
      expect(Object.keys(dict).filter((k) => !(k in uz))).toEqual([]);
    });

    it(`${name}: bo‘sh tarjima yo‘q`, () => {
      expect(Object.entries(dict).filter(([, v]) => !String(v).trim())).toEqual([]);
    });

    it(`${name}: o‘zbekchadan nusxa ko‘chirilgan matn yo‘q`, () => {
      const same = Object.entries(dict)
        .filter(([k, v]) => uz[k as keyof typeof uz] === v)
        .map(([k]) => k);
      expect(same).toEqual([]);
    });
  }
});
