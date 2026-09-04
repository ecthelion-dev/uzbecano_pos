import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { writeText } from '../storage';
import { type TranslationKey } from './dictionaries/uz';
import { isLocale, type Locale } from './locales';
import { LOCALE_KEY, activeLocale, translate, type TParams } from './translate';

export type { TParams };

interface LanguageValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, params?: TParams) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(activeLocale);

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

  const value = useMemo<LanguageValue>(
    // Qidiruvning o'zi `translate` da: chek ham xuddi shu funksiyani
    // chaqiradi, ya'ni ekran bilan qog'oz bir xil matnni ko'rsatadi.
    () => ({ locale, setLocale, t: (key, params) => translate(locale, key, params) }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT/useLocale faqat <LanguageProvider> ichida ishlaydi');
  return ctx;
}

export function useT(): (key: TranslationKey, params?: TParams) => string {
  return useLanguage().t;
}

export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const { locale, setLocale } = useLanguage();
  return { locale, setLocale };
}
