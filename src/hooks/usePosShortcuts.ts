import { useEffect, useRef } from 'react';

export interface PosShortcutHandlers {
  /** F1 — stollar bo'limi. */
  onTables: () => void;
  /** F2 — menyu bo'limi. */
  onMenu: () => void;
  /** F3 — arxiv oynasi (ochiladi/yopiladi). */
  toggleArchive: () => void;
  /** F4 — smena hisoboti (ochiladi/yopiladi). */
  toggleShiftReport: () => void;
  /** ESC — ochiq oynalar yopiladi. */
  onEscape: () => void;
}

/**
 * Kassaning global klaviatura tugmalari.
 *
 * Ilgari bu `App.tsx` ichida 45 qatorlik effekt edi, ya'ni tekshirib
 * bo'lmaydigan joyda turardi. Bu yerda u alohida: qaysi tugma nima
 * qilishini test bilan qulflash mumkin.
 *
 * Matn terilayotganda (INPUT/TEXTAREA ichida) tugmalar ishlamaydi: kassir
 * izohga "F1" deb yozsa yoki ESC bilan tahrirni bekor qilmoqchi bo'lsa,
 * bo'lim almashib ketmasligi kerak.
 */
export function usePosShortcuts(handlers: PosShortcutHandlers) {
  /*
   * Handler'lar ref orqali o'qiladi.
   *
   * `App` bu obyektni har renderda qayta yasaydi: uni effekt bog'liqligi
   * qilib qo'ysak, tinglovchi har renderda o'chib-qayta ulanardi (oyna
   * ko'rinishi o'zgarganda ham). Ref bilan tinglovchi bir marta ulanadi va
   * har doim eng yangi handler'ni chaqiradi.
   */
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          ref.current.onTables();
          break;
        case 'F2':
          e.preventDefault();
          ref.current.onMenu();
          break;
        case 'F3':
          e.preventDefault();
          ref.current.toggleArchive();
          break;
        case 'F4':
          e.preventDefault();
          ref.current.toggleShiftReport();
          break;
        case 'Escape':
          ref.current.onEscape();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
