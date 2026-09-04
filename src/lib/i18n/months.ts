import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * Oy nomlari — qo'lda, brauzerdan emas.
 *
 * `toLocaleDateString` qurilmaga bog'liq: kassa Windows'ida "sentabr",
 * Android'da "Sentabr", ba'zi WebView'da umuman inglizcha chiqardi va
 * chekning sanasi qaysi qurilmada bosilganiga qarab o'zgarardi.
 *
 * Ro'yxat lug'atda emas, chunki lug'at `Record<TranslationKey, string>` —
 * unga massiv sig'maydi, o'n ikkita alohida kalit esa faqat shovqin
 * bo'lardi.
 *
 * Ruschasi qaratqich kelishigida ("1 сентября"), chunki oy nomi doim
 * sanadan keyin keladi.
 */
export const MONTHS: Record<Locale, readonly string[]> = {
  uz: [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ],
  ru: [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

export function monthName(locale: Locale, index: number): string {
  const list = MONTHS[locale] ?? MONTHS[DEFAULT_LOCALE];
  return list[index] ?? '';
}
