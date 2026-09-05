import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useLocale } from '../lib/i18n/LanguageProvider';
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from '../lib/i18n/locales';

/**
 * Til tanlash.
 *
 * Tugmada faqat globus: adminka, kassa va QR menyu — uchalasida ham til shu
 * bitta belgi ostida turadi. Belgi hech qanday tilga tegishli emas, ya'ni
 * kassa tanimagan tilda ochilib qolsa ham u topiladi.
 *
 * Ko'rinishi yonidagi printer va yangilash tugmalari bilan bir xil: bir
 * qatorda turgan uchta boshqaruvning bittasi boshqacha bo'lsa, u xatodek
 * ko'rinadi.
 *
 * Ro'yxat ichida har til O'Z TILIDA yoziladi — "Русский" ni rus tilini
 * qidirayotgan odam aniq topadi, "Russian" ni esa yo'q.
 */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  /*
   * Tashqariga bosilganda va Escape bosilganda yopiladi.
   *
   * `pointerdown` — `click` emas: sensorli ekranda kassir ro'yxatdan
   * tashqariga bosganda ostidagi tugma ham bosilib ketmasligi uchun
   * yopilish bosishning boshida bo'lgani yaxshi.
   */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={boxRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={LOCALE_LABELS[locale]}
        title={LOCALE_LABELS[locale]}
        className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 transition-all active:scale-95 cursor-pointer"
      >
        <Globe className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={LOCALE_LABELS[locale]}
          className="absolute right-0 top-full mt-1.5 min-w-[10rem] p-1 rounded-2xl bg-white border border-slate-200 shadow-lg z-50"
        >
          {LOCALES.map((code: Locale) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                  active
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="whitespace-nowrap">{LOCALE_LABELS[code]}</span>
                {active ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <span className="text-[10px] font-bold tracking-wide text-slate-400 shrink-0">
                    {LOCALE_SHORT[code]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
