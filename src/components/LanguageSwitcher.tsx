import { ChevronDown, Languages } from 'lucide-react';
import { useLocale } from '../lib/i18n/LanguageProvider';
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from '../lib/i18n/locales';

/**
 * Til tanlash.
 *
 * Ochiladigan ro'yxat, uchta ochiq tugma emas: sarlavhada joy tor va uchta
 * tugma stol nomlari bilan bir qatorda turib, kassirni chalg'itardi. Til
 * kuniga bir marta, ko'pincha umuman o'zgartirilmaydi — doim ko'rinib
 * turishi shart bo'lgan boshqaruv emas.
 *
 * Ichida oddiy `<select>`: kassa sensorli ekranda ishlaydi va tizimning o'z
 * tanlagichi barmoq uchun qo'lda yasalgan ro'yxatdan qulayroq. Yopiq holatda
 * "UZ" ko'rinadi — tarjimasiz tushunarli, ya'ni kassa tanimagan tilda
 * ochilib qolsa ham til qayerdan o'zgartirilishi topiladi.
 */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Languages className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />

      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={LOCALE_LABELS[locale]}
        title={LOCALE_LABELS[locale]}
        className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold tracking-wide rounded-lg pl-7 pr-6 py-1.5 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer transition-colors"
      >
        {LOCALES.map((code: Locale) => (
          <option key={code} value={code}>
            {LOCALE_SHORT[code]} — {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>

      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
    </div>
  );
}
