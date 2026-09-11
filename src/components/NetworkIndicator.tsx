import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useT } from '../lib/i18n/LanguageProvider';

/**
 * Aloqa holati va yuborilmagan amallar soni.
 *
 * Bu komponent ancha oldin yozilgan edi, lekin hech qayerda chizilmasdi.
 * 2026-09-10 da uzbecano kafesida Wi-Fi uzildi, to'rtta buyurtma navbatda
 * qoldi va keyin yo'qoldi — kassir esa buni ko'rmadi, chunki ko'radigan
 * joyi yo'q edi. Endi u sarlavhada, printer tugmasi yonida turadi.
 *
 * Ranglar sarlavhaning o'z lug'atidan: oq fon, slate hoshiya. Ilgari bu
 * yerda to'q fon uchun yozilgan ranglar bor edi — oq sarlavhada ular
 * o'qilmasdi.
 *
 * Ilgari hammasi joyida bo'lsa bu yerda hech narsa chizilmasdi — kassir
 * "Wi-Fi umuman ishlayaptimi" degan savolga javobni faqat muammo
 * chiqqandagina ko'rar edi. Endi holat doim ko'rinadi: onlaynda yashil
 * "Wi-Fi" belgisi, oflaynda amber "Offline" yozuvi bilan.
 */
export const NetworkIndicator: React.FC = () => {
  const t = useT();
  const { isOnline, pendingCount, failedCount, triggerSync } = useNetworkStatus();

  return (
    <div className="hidden sm:flex items-center gap-2 h-10 px-3 rounded-xl border bg-white border-slate-200 shadow-2xs shrink-0">
      {isOnline ? (
        <span className="flex items-center gap-1.5 text-emerald-600" title={t('net.online')}>
          <Wifi className="w-4 h-4" />
          <span className="text-[11px] font-bold">{t('net.online')}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-amber-600">
          <WifiOff className="w-4 h-4" />
          <span className="text-[11px] font-bold">{t('net.offline')}</span>
        </span>
      )}

      {pendingCount > 0 && (
        <span className="text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
          {t('net.pending', { n: pendingCount })}
        </span>
      )}

      {failedCount > 0 && (
        <span className="flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {t('net.failed', { n: failedCount })}
        </span>
      )}

      {isOnline && pendingCount > 0 && (
        <button
          onClick={triggerSync}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title={t('net.startSync')}
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
        </button>
      )}
    </div>
  );
};
