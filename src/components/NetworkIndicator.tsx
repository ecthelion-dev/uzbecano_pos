import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useT } from '../lib/i18n/LanguageProvider';

export const NetworkIndicator: React.FC = () => {
  const t = useT();
  const { isOnline, pendingCount, failedCount, triggerSync } = useNetworkStatus();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-800 border-slate-700 text-slate-200 shadow-sm">
      {isOnline ? (
        <span className="flex items-center gap-1 text-emerald-400">
          <Wifi className="w-3.5 h-3.5" />
          <span>{t('net.online')}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-amber-400">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t('net.offline')}</span>
        </span>
      )}

      {pendingCount > 0 && (
        <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
          <span>{pendingCount} kutilmoqda</span>
        </span>
      )}

      {failedCount > 0 && (
        <span className="flex items-center gap-1 bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" />
          <span>{failedCount} xato</span>
        </span>
      )}

      {isOnline && pendingCount > 0 && (
        <button
          onClick={triggerSync}
          className="p-1 hover:bg-slate-700 rounded-full transition-colors"
          title={t('net.startSync')}
        >
          <RefreshCw className="w-3 h-3 text-slate-300 animate-spin" />
        </button>
      )}
    </div>
  );
};
