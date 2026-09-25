import { useCallback } from 'react';
import {
  claimPrintJob,
  closePrintJob,
  isInFlight,
  type PrintJob,
} from '../lib/printQueue';
import {
  printReceiptDirect,
  printKitchenSlipDirect,
  getLastPrintError,
} from '../lib/printer';
import { IS_DESKTOP_APP } from '../constants';
import type { TranslationKey } from '../lib/i18n/dictionaries/uz';

interface UsePrintQueueWorkerParams {
  connectedCafeName: string;
  getAuthHeaders: (approvalToken?: string) => Record<string, string>;
  setToastMessage: (msg: string | null) => void;
  t: (key: TranslationKey, params?: any) => string;
}

/**
 * Chop etish navbatini bo'shatadi — faqat printer ulangan desktop kassada.
 */
export function usePrintQueueWorker({
  connectedCafeName,
  getAuthHeaders,
  setToastMessage,
  t,
}: UsePrintQueueWorkerParams) {
  const drainPrintJobs = useCallback(async (incoming: PrintJob[]) => {
    if (!IS_DESKTOP_APP) return;
    const headers = getAuthHeaders();
    const jobs = incoming.filter((j) => !isInFlight(j.id));

    for (const job of jobs) {
      if (!claimPrintJob(job.id)) continue;

      let ok = false;
      let why: string | null = null;
      try {
        if (job.kind === 'receipt' && job.order) {
          ok = await printReceiptDirect(job.order, connectedCafeName || 'OrderPlus');
          if (!ok) why = getLastPrintError() || t('toast.printFailed');
        } else if (job.kind === 'kitchen') {
          const extra = job.payload ? JSON.parse(job.payload) : null;
          const data = {
            tableNumber: extra?.tableNumber || job.order?.tableNumber || 'Zal',
            waiterName: extra?.waiterName || job.order?.waiterName || 'Offitsiant',
            items: extra?.items ?? job.order?.items,
            time: extra?.time,
            slipNumber: extra?.slipNumber,
          };
          ok = await printKitchenSlipDirect(data, connectedCafeName || 'OrderPlus');
          if (!ok) why = getLastPrintError() || t('toast.printFailed');
        } else {
          why = t('toast.orderNotFound');
        }
      } catch (e: unknown) {
        why = e instanceof Error ? e.message : String(e);
      }

      await closePrintJob(headers, job.id, ok, why);
      if (ok) {
        setToastMessage(
          job.kind === 'kitchen'
            ? t('toast.kitchenSlipPrinted')
            : t('toast.receiptPrinted'),
        );
        window.setTimeout(() => setToastMessage(null), 3000);
      }
    }
  }, [getAuthHeaders, connectedCafeName, setToastMessage, t]);

  return { drainPrintJobs };
}
