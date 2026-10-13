import React, { Component, Suspense, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { useOnceOpened } from '../hooks/useOnceOpened';

/**
 * Bo'lak yuklanmasa faqat shu modal tushadi, kassa emas.
 *
 * `React.lazy` ning rad etilgan va'dasi eng yaqin xato chegarasiga boradi,
 * bu esa `main.tsx` dagi butun ekranlik `ErrorBoundary`. Deploydan keyin
 * eski bo'lak nomi yo'qolsa yoki telefon oflayn bo'lsa kassir bitta modal
 * o'rniga butun kassani yo'qotib, ochiq savatlari bilan qolardi.
 */
class ChunkBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  public state = { failed: false };

  public static getDerivedStateFromError() {
    return { failed: true };
  }

  public componentDidCatch(error: Error) {
    console.error('Modal bo\'lagi yuklanmadi:', error);
  }

  public render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface LazyModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Og'ir modalni birinchi ochilganda yuklaydi (`React.lazy` bolasi uchun).
 *
 * Birinchi ochilgandan keyin o'rnatilgan holda qoladi — ichki holat
 * (davr, qidiruv, forma) yopilganda yo'qolmasin; ko'rinishni bolaning
 * o'zi (`show` / `isOpen`) hal qiladi. Bo'lak kelguncha belgi ko'rinadi:
 * hech narsa chiqmasa kassir tugmani yana bosib, modalni yopib qo'yardi.
 */
export function LazyModal({ open, onClose, children }: LazyModalProps) {
  const t = useT();
  const isMounted = useOnceOpened(open);
  if (!isMounted) return null;

  const failed = open ? (
    <div role="alert" className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-rose-200 space-y-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <p className="font-bold text-slate-900">{t('lazy.loadFailed')}</p>
        <button
          onClick={onClose}
          className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  ) : null;

  const loading = open ? (
    <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-lg">
      {t('common.loading')}
    </div>
  ) : null;

  return (
    <ChunkBoundary fallback={failed}>
      <Suspense fallback={loading}>{children}</Suspense>
    </ChunkBoundary>
  );
}
