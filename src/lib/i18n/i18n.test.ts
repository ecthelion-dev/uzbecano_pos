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
      /*
       * Nusxa ko'chirilib, tarjima qilinmay qolgan qatorlarni topadi.
       *
       * "Online" va "Offline" o'zbekchada ham shundayligicha yoziladi —
       * bular o'zlashgan atamalar, unutilgan tarjima emas. Ro'yxat ataylab
       * qisqa: har bir yozuv "bu haqiqatan bir xil" degan qaror bo'lishi
       * kerak, aks holda tekshiruvning ma'nosi yo'qoladi.
       */
      const allowed = new Set(['net.online', 'net.offline']);
      const same = Object.entries(dict)
        .filter(([k, v]) => uz[k as keyof typeof uz] === v)
        .map(([k]) => k)
        .filter((k) => !allowed.has(k));
      expect(same).toEqual([]);
    });
  }
});

/**
 * `useT` — provider ichida bo'lishi shart.
 *
 * Bu qoida buzilganda xato bitta komponent bilan cheklanmaydi: `useT`
 * komponent tanasining boshida chaqiriladi va otganda React butun daraxtni
 * tashlab yuboradi, ya'ni kassa oq ekranga aylanadi. Aynan shu bo'lgan edi —
 * `UpdateBanner` ga tarjima qo'shildi, lekin u `main.tsx` da
 * `<LanguageProvider>` dan TASHQARIDA turardi va ilova ishga tushmay qoldi.
 *
 * Shuning uchun ikkita tekshiruv: yordamchining o'zi provider talab qilishi
 * va daraxtning haqiqatan to'g'ri yig'ilgani.
 */
describe('provider qamrovi', () => {
  it('provider tashqarisida useT ishlatgan komponent otadi', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { UpdateBanner } = await import('../../components/UpdateBanner');

    expect(() => renderToStaticMarkup(createElement(UpdateBanner))).toThrow(
      /LanguageProvider/,
    );
  });

  it('provider ichida esa otmaydi', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { LanguageProvider } = await import('./LanguageProvider');
    const { UpdateBanner } = await import('../../components/UpdateBanner');

    expect(() =>
      renderToStaticMarkup(
        createElement(LanguageProvider, null, createElement(UpdateBanner)),
      ),
    ).not.toThrow();
  });

  it('main.tsx da banner provider ichida turadi', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf-8');

    const open = src.indexOf('<LanguageProvider>');
    const close = src.indexOf('</LanguageProvider>');
    const banner = src.indexOf('<UpdateBanner />');

    expect(open).toBeGreaterThan(-1);
    expect(banner).toBeGreaterThan(open);
    expect(banner).toBeLessThan(close);
  });
});

/**
 * Son bilan keladigan matnlar.
 *
 * Son matnga kodda yopishtirilsa, u har doim o'zbekcha tartibda turadi:
 * "3 ta band stol". Ruschada esa "Занятых столов: 3" — son oxirida.
 * Shuning uchun o'rni lug'atning o'zida belgilanadi.
 */
describe('matndagi o‘rin egallovchilar', () => {
  async function render(locale: string, key: string, params: Record<string, unknown>) {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { LanguageProvider, useT } = await import('./LanguageProvider');

    globalThis.localStorage = {
      getItem: () => locale,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage;

    const Probe = () => {
      const t = useT();
      return createElement('i', null, t(key as never, params as never));
    };
    return renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Probe)));
  }

  it('sonni o‘z tilining tartibida qo‘yadi', async () => {
    expect(await render('uz', 'table.occupiedCount', { n: 3 })).toBe('<i>3 ta band stol</i>');
    expect(await render('ru', 'table.occupiedCount', { n: 3 })).toBe('<i>Занятых столов: 3</i>');
  });

  it('parametr berilmasa matnni buzmaydi', async () => {
    // Kalitni chaqiruvchi unutgan bo'lsa ham `{n}` o'chib ketmaydi: bo'sh
    // joydan ko'ra ko'rinib turgan xato tezroq tuzatiladi.
    expect(await render('uz', 'table.occupiedCount', {})).toBe('<i>{n} ta band stol</i>');
  });
});

/**
 * Til tanlagich.
 *
 * Uchta ochiq tugma edi, endi ochiladigan ro'yxat: sarlavhada joy tor.
 * Muhimi — uchala til ham ro'yxatda qolishi va tanlangani belgilanishi.
 */
describe('til tanlagich', () => {
  async function markup(locale: string) {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { LanguageProvider } = await import('./LanguageProvider');
    const { default: LanguageSwitcher } = await import('../../components/LanguageSwitcher');

    globalThis.localStorage = {
      getItem: () => locale,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage;

    return renderToStaticMarkup(
      createElement(LanguageProvider, null, createElement(LanguageSwitcher)),
    );
  }

  it('ochiladigan ro‘yxat bo‘lib chiziladi', async () => {
    const html = await markup('uz');
    expect(html).toContain('<select');
    expect((html.match(/<option/g) ?? []).length).toBe(LOCALES.length);
  });

  it('har bir til ro‘yxatda o‘z nomi bilan turadi', async () => {
    const html = await markup('uz');
    for (const code of LOCALES) {
      expect(html).toContain(`value="${code}"`);
    }
    expect(html).toContain('Русский');
    expect(html).toContain('English');
  });

  it('tanlangan til belgilangan bo‘ladi', async () => {
    expect(await markup('ru')).toContain('selected');
  });
});
