import { ChevronDown } from 'lucide-react';
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
 * Ko'rinishi yonidagi printer va yangilash tugmalari bilan bir xil: bir
 * qatorda turgan uchta boshqaruvning bittasi boshqacha bo'lsa, u xatodek
 * ko'rinadi.
 *
 * Ichida oddiy `<select>`: kassa sensorli ekranda ishlaydi va tizimning o'z
 * tanlagichi barmoq uchun qo'lda yasalgan ro'yxatdan qulayroq.
 *
 * Ro'yxatda ham faqat qisqartma turadi ("UZ", "RU", "EN"). To'liq nom
 * ("RU — Русский") sarlavhaning yarmini egallab qo'yardi, holbuki bu ikki
 * harf tarjimasiz tushunarli — kassa tanimagan tilda ochilib qolsa ham til
 * qayerdan o'zgartirilishi topiladi. To'liq nomi `title` da qoladi.
 *
 * Globus belgisi ham olib tashlandi: "RU" ning o'zi nimaligini aytadi va
 * belgi tugmaning yarmini egallab, ikki harfni chekkaga siqib qo'yardi.
 */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={LOCALE_LABELS[locale]}
        title={LOCALE_LABELS[locale]}
        className="appearance-none h-10 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold tracking-wide rounded-xl pl-3 pr-6 border border-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer transition-all active:scale-98"
      >
        {LOCALES.map((code: Locale) => (
          <option key={code} value={code} title={LOCALE_LABELS[code]}>
            {LOCALE_SHORT[code]}
          </option>
        ))}
      </select>

      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
    </div>
  );
}
