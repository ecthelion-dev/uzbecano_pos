import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { actorOf, type FailedAction } from '../lib/failedActions';
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
 * xodim "tushunarli" demaguncha ro'yxatdan chiqmaydi.
 */

interface RejectedActionsModalProps {
  items: FailedAction[];
  onAcknowledge: (qid: string) => void;
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
          <button
            onClick={onClose}
            title={t('net.rejectedClose')}
            aria-label={t('net.rejectedClose')}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('net.rejectedEmpty')}</p>
          ) : (
            items.map((item, index) => {
              const actor = actorOf(item);
              return (
                <div
                  key={item.qid || `legacy-${index}`}
                  className="bg-rose-50 border border-rose-200 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 break-words">{whatOf(item)}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {actor ? t('net.rejectedBy', { name: actor }) : t('net.rejectedByUnknown')}
                        {whenOf(item) && ` · ${whenOf(item)}`}
                      </div>
                    </div>
                    {item.qid && (
                      <button
                        onClick={() => onAcknowledge(item.qid as string)}
                        className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {t('net.rejectedAck')}
                      </button>
                    )}
                  </div>
                  {item.rejectedReason && (
                    <p className="text-xs font-semibold text-rose-700 mt-2 break-words">
                      {item.rejectedReason}
                    </p>
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
