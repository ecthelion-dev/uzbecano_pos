import React from 'react';
import { AlertCircle, X, RefreshCw, ShoppingCart } from 'lucide-react';
import {
  actorOf,
  extractActionItems,
  tableNumberOfAction,
  type FailedAction,
} from '../lib/failedActions';
import { useT } from '../lib/i18n/LanguageProvider';

/**
 * Serverga o'tmagan amallar ro'yxati.
 *
 * Ilgari bu yerda hech narsa yo'q edi: rad etish olti soniyalik xabar bilan
 * o'tib ketar, keyin faqat "2 xato" degan kichkina belgi qolardi. Amalni
 * kiritgan xodim uni o'tdi deb bilar, boshqasi boshqa holatni ko'rar va
 * tortishuv shundan boshlanardi.
 *
 * Endi har bir yozuv uch savolga javob beradi — kim, nega, qachon — va
 * xodim "qayta yuborish", "savatga yuklash" yoki "tushunarli" demaguncha
 * ro'yxatdan chiqmaydi.
 */

interface RejectedActionsModalProps {
  items: FailedAction[];
  onAcknowledge: (qid: string) => void;
  onRetry?: (qid: string) => void;
  onRetryAll?: () => void;
  onRestoreToCart?: (item: FailedAction) => void;
  onClose: () => void;
}

function whatOf(item: FailedAction): string {
  if (item.kind === 'create') return item.order?.tableNumber || '—';
  if (item.kind === 'cash') return item.label || '—';
  return item.label || item.orderId || '—';
}

function whenOf(item: FailedAction): string {
  const at = item.rejectedAt || item.queuedAt;
  if (!at) return '';
  return new Date(at).toLocaleString('uz-UZ');
}

export const RejectedActionsModal: React.FC<RejectedActionsModalProps> = ({
  items,
  onAcknowledge,
  onRetry,
  onRetryAll,
  onRestoreToCart,
  onClose,
}) => {
  const t = useT();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-rose-700">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              {t('net.rejectedTitle')}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">{t('net.rejectedHint')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRetryAll && items.length > 0 && (
              <button
                onClick={onRetryAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                title={t('net.retryAll')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('net.retryAll')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              title={t('net.rejectedClose')}
              aria-label={t('net.rejectedClose')}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('net.rejectedEmpty')}</p>
          ) : (
            items.map((item, index) => {
              const actor = actorOf(item);
              const actionItems = extractActionItems(item);

              return (
                <div
                  key={item.qid || `legacy-${index}`}
                  className="bg-rose-50 border border-rose-200 rounded-xl p-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 break-words">{whatOf(item)}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {actor ? t('net.rejectedBy', { name: actor }) : t('net.rejectedByUnknown')}
                        {whenOf(item) && ` · ${whenOf(item)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {onRetry && item.qid && (
                        <button
                          onClick={() => onRetry(item.qid as string)}
                          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                          title={t('net.retry')}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{t('net.retry')}</span>
                        </button>
                      )}
                      {onRestoreToCart && actionItems.length > 0 && (
                        <button
                          onClick={() => onRestoreToCart(item)}
                          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
                          title={t('net.restoreToCart')}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>{t('net.restoreToCart')}</span>
                        </button>
                      )}
                      {item.qid && (
                        <button
                          onClick={() => onAcknowledge(item.qid as string)}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {t('net.rejectedAck')}
                        </button>
                      )}
                    </div>
                  </div>
                  {item.rejectedReason && (
                    <p className="text-xs font-semibold text-rose-700 mt-2 break-words">
                      {item.rejectedReason}
                    </p>
                  )}
                  {actionItems.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/60 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{t('net.itemsPreview')} </span>
                      <span>
                        {actionItems.map((ai) => `${ai.name} × ${ai.quantity}`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
