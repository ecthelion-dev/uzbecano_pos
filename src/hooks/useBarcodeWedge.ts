import { useEffect, useRef } from 'react';
import { createWedgeReader } from '../lib/barcodeWedge';

/** Kassir shu yerga yozayotgan bo'lsa tugmalar o'sha maydonniki. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * USB skanerni tinglaydi (u klaviatura kabi yozadi).
 *
 * Faqat yoqilganda (menyu ekrani, stol tanlangan) ishlaydi: aks holda
 * skanerlangan tovar kassir ko'rmayotgan stolga tushib ketardi. Kod
 * aniqlansa skanerning Enter i to'xtatiladi — u tasodifan fokusdagi
 * tugmani bosib yubormasin. Ajratish qoidasi `lib/barcodeWedge.ts` da.
 */
export function useBarcodeWedge(enabled: boolean, onScan: (code: string) => void): void {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;
    const reader = createWedgeReader();

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const code = reader.push(e.key, Date.now());
      if (!code) return;
      e.preventDefault();
      onScanRef.current(code);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
