import { readText } from '../storage';
import { uz, type TranslationKey } from './dictionaries/uz';
import { ru } from './dictionaries/ru';
import { en } from './dictionaries/en';
import { DEFAULT_LOCALE, isLocale, localeFromNavigator, type Locale } from './locales';

/**
 * Tarjima — React'siz.
 *
 * `useT()` faqat komponent ichida ishlaydi, chek esa `printer.ts` da
 * quriladi: u oddiy modul, ESC/POS baytlarini yasaydi va hech qanday
 * daraxtga tegishli emas. Chekni tarjima qilish uchun lug'atga kirishning
 * hook'siz yo'li kerak bo'ldi.
 *
 * Shuning uchun lug'at qidiruvi va `{n}` o'rnini to'ldirish endi shu yerda,
 * bitta joyda: `LanguageProvider` ham shu funksiyani chaqiradi. Ikki nusxa
 * qilib qo'yilsa, ekran bir xil kalitni bir xil, qog'oz esa boshqacha
 * ko'rsatib qo'yishi mumkin edi.
 */

/** Til QURILMANIKI: bir kafeda xodimlar har xil tilda ishlashi mumkin. */
export const LOCALE_KEY = 'orderplus_lang';

/** `t('table.occupiedCount', { n: 3 })` — matndagi `{n}` o'rniga qo'yiladi. */
export type TParams = Record<string, string | number>;

export const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { uz, ru, en };

/*
 * O'rin egallovchilar tilga qarab boshqa joyda turadi: o'zbekchada
 * "3 ta band stol", ruschada "Занятых столов: 3". Shuning uchun son
 * matnga yopishtirilmaydi, lug'atning o'zida `{n}` bo'lib turadi.
 */
function fill(text: string, params?: TParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * Kalit topilmasa o'zbekchasi, u ham bo'lmasa kalitning o'zi: bo'sh
 * tugmadan ko'ra g'alati yozuv yaxshiroq — xato darhol ko'rinadi.
 */
export function translate(locale: Locale, key: TranslationKey, params?: TParams): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  return fill(dict[key] ?? uz[key] ?? key, params);
}

/**
 * Hozir tanlangan til — diskdan.
 *
 * Chek chop etilayotganda React holatiga kirib bo'lmaydi, lekin tanlov
 * `setLocale` da darhol diskka yoziladi, ya'ni ikkalasi hech qachon
 * ajralmaydi.
 *
 * Avval xodim tanlagani, keyin qurilma tili, keyin o'zbekcha. Xodimning
 * tanlovi qurilma sozlamasidan ustun: u ataylab bosilgan, sozlama esa
 * telefon sotib olinganda qanday bo'lsa shundayligicha qolgan bo'lishi
 * mumkin.
 */
export function activeLocale(): Locale {
  const saved = readText(LOCALE_KEY);
  if (isLocale(saved)) return saved;

  if (typeof navigator !== 'undefined') {
    const fromDevice = localeFromNavigator(navigator.languages ?? [navigator.language]);
    if (fromDevice) return fromDevice;
  }
  return DEFAULT_LOCALE;
}

/** `const t = translator(locale)` — chek quruvchilar shu bilan ishlaydi. */
export function translator(locale?: Locale) {
  const active = locale ?? activeLocale();
  return (key: TranslationKey, params?: TParams) => translate(active, key, params);
}
