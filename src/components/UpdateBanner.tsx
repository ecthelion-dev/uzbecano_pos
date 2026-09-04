import React, { useEffect, useState } from 'react';
import { Download, Loader2, RotateCw, X } from 'lucide-react';
import {
  subscribeUpdateStatus,
  dismissUpdate,
  installUpdate,
  UpdateStatus,
} from '../lib/autoUpdater';
import { useT } from '../lib/i18n/LanguageProvider';

/**
 * Yangilanish haqidagi banner.
 *
 * Ilova ustidan hech nimani to'smaydi va hech narsani majburlamaydi: qayta
 * ishga tushirish vaqtini xodimning o'zi tanlaydi, chunki o'rnatish ilovani
 * yopadi — buyurtma yozilayotgan payt bo'lsa, u yo'qoladi.
 */
export const UpdateBanner: React.FC = () => {
  const t = useT();
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => subscribeUpdateStatus(setStatus), []);

  if (!status) return null;

  const { phase, version, progress, dismissed } = status;
  // Tekshirish va xatolar jimgina o'tadi — kassirga aytadigan gap yo'q.
  if (phase !== 'downloading' && phase !== 'ready' && phase !== 'installing') return null;
  if (dismissed) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] w-[min(26rem,calc(100vw-1.5rem))] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 px-4 py-3 animate-fadeIn">
      <div className="flex items-center gap-3">
        {phase === 'ready' ? (
          <Download className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-sky-400 shrink-0 animate-spin" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">
            {phase === 'downloading' && `Yangi versiya ${version} yuklanmoqda…`}
            {phase === 'ready' && `Yangi versiya ${version} tayyor`}
            {phase === 'installing' && 'O‘rnatilmoqda…'}
          </p>
          {phase === 'ready' && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('update.hint')}
            </p>
          )}
          {phase === 'downloading' && (
            <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          )}
        </div>

        {phase === 'ready' && (
          <>
            <button
              onClick={() => void installUpdate()}
              className="shrink-0 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              {t('update.restart')}
            </button>
            <button
              onClick={dismissUpdate}
              aria-label={t('update.later')}
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
