import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readText, writeText } from '../storage';
import { uz, type TranslationKey } from './dictionaries/uz';
import { ru } from './dictionaries/ru';
import { en } from './dictionaries/en';
import { DEFAULT_LOCALE, isLocale, localeFromNavigator, type Locale } from './locales';

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { uz, ru, en };

/** Til QURILMANIKI: bir kafeda xodimlar har xil tilda ishlashi mumkin. */
const LOCALE_KEY = 'orderplus_lang';

interface LanguageValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Boshlang'ich til.
 *
 * Avval xodim tanlagani, keyin qurilma tili, keyin o'zbekcha. Xodimning
 * tanlovi qurilma sozlamasidan ustun: u ataylab bosilgan, sozlama esa
 * telefon sotib olinganda qanday bo'lsa shundayligicha qolgan bo'lishi
 * mumkin.
 *
 * `readText` xotira yopiq brauzerda ham otmaydi — kassa Samsung Internet
 * da oq ekranga aylangan voqeadan keyin hamma o'qish shu yordamchi orqali
 * ketadi.
 */
function initialLocale(): Locale {
  const saved = readText(LOCALE_KEY);
  if (isLocale(saved)) return saved;

  if (typeof navigator !== 'undefined') {
    const fromDevice = localeFromNavigator(navigator.languages ?? [navigator.language]);
    if (fromDevice) return fromDevice;
  }
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    writeText(LOCALE_KEY, next);
    try {
      document.documentElement.lang = next;
    } catch {
      /* muhim emas */
    }
  }, []);

  const value = useMemo<LanguageValue>(() => {
    const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
    // Kalit topilmasa o'zbekchasi, u ham bo'lmasa kalitning o'zi: bo'sh
    // tugmadan ko'ra g'alati yozuv yaxshiroq — xato darhol ko'rinadi.
    return { locale, setLocale, t: (key) => dict[key] ?? uz[key] ?? key };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT/useLocale faqat <LanguageProvider> ichida ishlaydi');
  return ctx;
}

export function useT(): (key: TranslationKey) => string {
  return useLanguage().t;
}

export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const { locale, setLocale } = useLanguage();
  return { locale, setLocale };
}
