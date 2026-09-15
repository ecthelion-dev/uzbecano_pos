import React, { useState } from 'react';
import { Loader2, ScanLine, Ticket, X } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import type { PromoTerms } from '../lib/promo';
import { QrScannerModal } from './QrScannerModal';

interface PromoCodeFieldProps {
  promo: PromoTerms | null;
  /** Kod faqat ochiq buyurtmaga qo'llanadi — tasdiqlanmagan savatda buyurtma hali yo'q. */
  canApply: boolean;
  /** Bo'sh kod — olib tashlash. Xato bo'lsa uning matni, aks holda `null`. */
  onApply: (code: string) => Promise<string | null>;
}

/**
 * Kvitansiyadagi promo-kod: qo'lda yoziladi, USB skaner bilan (u klaviatura
 * kabi yozib Enter bosadi) yoki kamera orqali QR dan o'qiladi.
 */
export const PromoCodeField: React.FC<PromoCodeFieldProps> = ({ promo, canApply, onApply }) => {
  const t = useT();
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const apply = async (value: string) => {
    if (isBusy) return;
    setIsBusy(true);
    setError('');
    const failure = await onApply(value);
    setIsBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    setCode('');
  };

  const errorLine = error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>;

  if (promo) {
    const amount = promo.type === 'percent'
      ? `${promo.value}%`
      : `${promo.value.toLocaleString()} ${t('common.currency')}`;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 pl-3 pr-1 py-1">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Ticket className="w-4 h-4 shrink-0" />
            <span className="truncate">{promo.code}</span>
            <span className="shrink-0 font-semibold text-emerald-600">−{amount}</span>
          </span>
          <button
            type="button"
            onClick={() => apply('')}
            disabled={isBusy}
            title={t('promo.remove')}
            aria-label={t('promo.remove')}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 active:scale-95 transition-colors cursor-pointer"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        </div>
        {errorLine}
      </div>
    );
  }

  const isDisabled = !canApply || isBusy;

  return (
    <div className="space-y-1">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) apply(code.trim());
        }}
      >
        <input
          id="pos-promo-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={canApply ? t('promo.placeholder') : t('promo.needOrder')}
          aria-label={t('promo.placeholder')}
          disabled={isDisabled}
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          className="h-10 flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold tracking-wider text-slate-900 placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:border-orange-500 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setIsScanning(true)}
          disabled={isDisabled}
          title={t('promo.scan')}
          aria-label={t('promo.scan')}
          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-colors cursor-pointer"
        >
          <ScanLine className="w-4 h-4" />
        </button>
        <button
          type="submit"
          disabled={isDisabled || !code.trim()}
          className="h-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-colors cursor-pointer"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('promo.apply')}
        </button>
      </form>
      {errorLine}
      {isScanning && (
        <QrScannerModal
          onClose={() => setIsScanning(false)}
          onDetected={(scanned) => {
            setIsScanning(false);
            setCode(scanned);
            apply(scanned);
          }}
        />
      )}
    </div>
  );
};
