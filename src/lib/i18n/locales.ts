/**
 * Kassa interfeysi tillari.
 *
 * Kassa — xodimning ish quroli, ya'ni til QURILMANIKI, kafeniki emas:
 * bir zalda ruscha gapiradigan kassir bilan o'zbekcha gapiradigan
 * ofitsiant bo'lishi mumkin va har biri o'z telefonida ishlaydi.
 * Shuning uchun tanlov localStorage da, serverda emas.
 */

export const LOCALES = ['uz', 'ru', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uz';

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export const LOCALE_SHORT: Record<Locale, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Brauzer tilidan mos tilni tanlaydi.
 *
 * `navigator.languages` tartiblangan holda keladi, shuning uchun bu yerda
 * og'irlik hisoblanmaydi — birinchi mos kelgani olinadi.
 */
export function localeFromNavigator(languages: readonly string[] | undefined): Locale | null {
  for (const tag of languages ?? []) {
    const base = String(tag).toLowerCase().split('-')[0];
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return null;
}
