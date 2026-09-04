import React from 'react';
import { Lock, RotateCw, ExternalLink } from 'lucide-react';
import { IS_DESKTOP_APP } from '../constants';
import { useT } from '../lib/i18n/LanguageProvider';

interface FrozenCafeScreenProps {
  cafeName: string;
  onRefresh: () => void;
}

/**
 * Tashqi havolani ochadi.
 *
 * Brauzerda oddiy `target="_blank"` yetarli, lekin Tauri oynasida u hech nima
 * qilmaydi — kassir "To'lov qilish" tugmasini bosadi va hech narsa
 * o'zgarmaydi. Desktopda havola tizim brauzerida ochiladi va ilovaning o'zi
 * joyida qoladi; aks holda kassa admin panelga o'tib ketib, orqaga qaytish
 * tugmasi bo'lmagani uchun ilovani yopishga to'g'ri kelardi.
 */
async function openExternal(url: string, event: React.MouseEvent) {
  if (!IS_DESKTOP_APP) return;
  event.preventDefault();
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    /* opener ishlamasa havola shunchaki ochilmaydi — kassa buzilmaydi */
  }
}

export const FrozenCafeScreen: React.FC<FrozenCafeScreenProps> = ({ cafeName, onRefresh }) => {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 py-[calc(1rem+env(safe-area-inset-top))] overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-8 max-w-md w-full text-center shadow-2xl text-white space-y-4 sm:space-y-5 animate-scaleUp my-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <div className="inline-block px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2">
            {t('frozen.badge')}
          </div>
          <h2 className="text-xl font-black text-white">{t('frozen.title')}</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {t('frozen.expired', { cafe: cafeName })}{' '}
            {t('frozen.howTo')}
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={onRefresh}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
          >
            <RotateCw className="w-4 h-4" />
            <span>{t('frozen.recheck')}</span>
          </button>
          <a
            href="https://orderplus.uz/admin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternal('https://orderplus.uz/admin', e)}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>{t('frozen.toAdmin')}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://t.me/orderplus_admin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternal('https://t.me/orderplus_admin', e)}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
          >
            <span>{t('frozen.support')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
