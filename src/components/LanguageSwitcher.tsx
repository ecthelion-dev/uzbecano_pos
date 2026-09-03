import { useLocale } from '../lib/i18n/LanguageProvider';
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from '../lib/i18n/locales';

/**
 * Til tugmasi.
 *
 * Uchta ochiq tugma, ochiladigan ro'yxat emas: kassada ish tez ketadi va
 * xodim ikki marta bosishni xohlamaydi. "RU" yozuvi esa tarjimasiz
 * tushunarli — kassa tanimagan tilda ochilgan bo'lsa ham topiladi.
 */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 ${className}`}
      role="group"
    >
      {LOCALES.map((code: Locale) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            title={LOCALE_LABELS[code]}
            className={`px-2 py-1 rounded-md text-[11px] font-bold tracking-wide transition-colors ${
              active
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {LOCALE_SHORT[code]}
          </button>
        );
      })}
    </div>
  );
}
