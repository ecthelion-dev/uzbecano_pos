import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import type { DBOrder, DBWaiter, DebtPaymentEntry } from '../types';
import { writeCafeJson } from '../lib/storage';
import { decideFromStatus } from '../lib/syncQueue';
import { newId } from '../lib/uuid';

export interface UseArchiveOperationsParams {
  orders: DBOrder[];
  ordersRef: MutableRefObject<DBOrder[]>;
  currentWaiter: DBWaiter | null;
  isOfflineMode: boolean;
  requestAdminPin: (callback: (approvalToken?: string) => void | Promise<void>) => void;
  getActiveCafeId: () => string;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => string;
  flushNow: (qid?: string | string[]) => Promise<Response | null>;
  setOrders: (orders: DBOrder[]) => void;
  setSelectedArchiveOrder: Dispatch<SetStateAction<DBOrder | null>>;
  setToastMessage: (msg: string | null) => void;
  setApiError: (msg: string | null) => void;
  t: (key: any, options?: any) => string;
}

export function useArchiveOperations(params: UseArchiveOperationsParams) {
  const {
    orders,
    ordersRef,
    currentWaiter,
    isOfflineMode,
    requestAdminPin,
    getActiveCafeId,
    queuePatchForSync,
    flushNow,
    setOrders,
    setSelectedArchiveOrder,
    setToastMessage,
    setApiError,
    t,
  } = params;

  /*
   * Arxiv amallari ham faqat navbat orqali (2026-10-16). To'g'ridan-to'g'ri
   * so'rov hali navbatda turgan chekni (oflayn ochilgan, endi to'langan)
   * quvib o'tib 404 olardi va amal "saqlanmadi" deb yo'qolardi; navbat esa
   * uni chekning o'z amallaridan keyin yuboradi.
   *
   * `rejected` — server aniq rad etdi (navbat uni sababi bilan rad
   * etilganlarga qo'ygan); mahalliy holat o'zgartirilmaydi.
   */
  const sendQueued = useCallback(
    async (qid: string): Promise<{ res: Response | null; rejected: string | null }> => {
      if (isOfflineMode) return { res: null, rejected: null };
      const res = await flushNow(qid);
      if (!res || res.ok || res.status === 401 || decideFromStatus(res.status) === 'retry') {
        return { res, rejected: null };
      }
      const data = await res.json().catch(() => ({}));
      return { res, rejected: typeof data.error === 'string' ? data.error : '' };
    },
    [isOfflineMode, flushNow],
  );

  const handleRefundOrder = useCallback(
    (targetOrder: DBOrder, reason: string) => {
      requestAdminPin(async (approvalToken?: string) => {
        const refundBody = { action: 'refund', refundReason: reason };
        const qid = queuePatchForSync(targetOrder.id, refundBody, 'refund', approvalToken);
        const { res, rejected } = await sendQueued(qid);
        if (rejected !== null) {
          setApiError(rejected || t('toast.refundNotSaved'));
          return;
        }
        if (!isOfflineMode && !res?.ok) setApiError(t('toast.refundQueued'));

        const updatedOrders = orders.map((o) =>
          o.id === targetOrder.id
            ? {
                ...o,
                refunded: true,
                refundReason: reason,
                refundedAt: new Date().toISOString(),
                refundedBy: currentWaiter?.name || '',
              }
            : o
        );

        setOrders(updatedOrders);
        writeCafeJson(getActiveCafeId(), 'orders', updatedOrders);
        setSelectedArchiveOrder((prev) =>
          prev && prev.id === targetOrder.id
            ? {
                ...prev,
                refunded: true,
                refundReason: reason,
              }
            : prev
        );

        setToastMessage(t('toast.refundDone', { id: targetOrder.id.slice(-6) }));
        setTimeout(() => setToastMessage(null), 2500);
      });
    },
    [
      orders,
      currentWaiter,
      isOfflineMode,
      requestAdminPin,
      getActiveCafeId,
      queuePatchForSync,
      sendQueued,
      setOrders,
      setSelectedArchiveOrder,
      setToastMessage,
      setApiError,
      t,
    ]
  );

  const handlePayDebt = useCallback(
    async (targetOrder: DBOrder, amount: number, method: 'naqd' | 'karta', note?: string) => {
      if (amount <= 0) return;
      /*
       * To'lov identifikatori SHU YERDA yaratiladi va ham so'rovga, ham
       * mahalliy yozuvga qo'yiladi.
       *
       * Sabab: offline navbatdagi to'lov javob yo'qolganda qayta yuboriladi
       * (useOfflineSync navbatni aynan o'sha tana bilan qaytaradi). Server
       * yozuvni allaqachon qabul qilgan bo'lsa, ikkinchi so'rov ikkinchi
       * yozuv qo'shib, mijoz ikki marta to'lagandek ko'rinardi. Server
       * `debtPayment.id` ni ko'rib, takroriy so'rovni jimgina qaytaradi.
       */
      const paymentId = newId();
      const debtPayment = {
        id: paymentId,
        amount,
        method,
        note: note || undefined,
      };
      const patchBody = { debtPayment };

      let serverUpdatedOrder: DBOrder | null = null;

      const qid = queuePatchForSync(targetOrder.id, patchBody, 'debtPayment');
      const { res, rejected } = await sendQueued(qid);
      if (rejected !== null) {
        setApiError(rejected || t('toast.debtPaymentNotSaved'));
        return;
      }
      if (res?.ok) {
        /*
         * Server YALANG'OCH chekni qaytaradi (`{ order }` konverti yo'q) —
         * `useOfflineSync.sendAppendItems` ham xuddi shunday o'qiydi.
         * Ilgari bu yerda `data.order` tekshirilar edi, ya'ni shart hech
         * qachon bajarilmasdi va kassa mahalliy (taxminiy) hisobda
         * qolaverardi: serverda saqlangan haqiqiy holat emas.
         */
        const data = await res.json().catch(() => ({}));
        if (data?.id === targetOrder.id) {
          serverUpdatedOrder = data as DBOrder;
        }
      }

      const paymentEntry: DebtPaymentEntry = {
        id: paymentId,
        amount,
        method,
        paidAt: new Date().toISOString(),
        paidBy: currentWaiter?.name || '',
        note: note || undefined,
      };

      const existingPayments = Array.isArray(targetOrder.debtPayments) ? targetOrder.debtPayments : [];
      const updatedPayments = [...existingPayments, paymentEntry];
      const totalPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const orderTotal = Number(targetOrder.total) || 0;
      const isFullyPaid = totalPaid >= orderTotal;

      const updatedOrder: DBOrder = serverUpdatedOrder || {
        ...targetOrder,
        debtPayments: updatedPayments,
        cashAmount: method === 'naqd' ? (Number(targetOrder.cashAmount) || 0) + amount : targetOrder.cashAmount,
        cardAmount: method === 'karta' ? (Number(targetOrder.cardAmount) || 0) + amount : targetOrder.cardAmount,
        paymentMethod: isFullyPaid ? method : 'qarz',
        closedAt: isFullyPaid ? new Date().toISOString() : targetOrder.closedAt,
        closedBy: isFullyPaid ? currentWaiter?.name || '' : targetOrder.closedBy,
      };

      const updatedOrders = ordersRef.current.map((o) => (o.id === targetOrder.id ? updatedOrder : o));
      ordersRef.current = updatedOrders;
      setOrders(updatedOrders);
      writeCafeJson(getActiveCafeId(), 'orders', updatedOrders);
      setSelectedArchiveOrder((prev) => (prev && prev.id === targetOrder.id ? updatedOrder : prev));

      const formattedAmount = amount.toLocaleString();
      if (isFullyPaid) {
        setToastMessage(
          t('toast.debtPaidFull', {
            amount: formattedAmount,
            currency: t('common.currency'),
            method: method === 'naqd' ? t('common.cash') : t('common.card'),
          })
        );
      } else {
        const remaining = Math.max(0, orderTotal - totalPaid);
        setToastMessage(
          t('toast.debtPaidPartial', {
            amount: formattedAmount,
            remaining: remaining.toLocaleString(),
            currency: t('common.currency'),
          })
        );
      }
      setTimeout(() => setToastMessage(null), 3000);
    },
    [
      getActiveCafeId,
      queuePatchForSync,
      sendQueued,
      currentWaiter,
      ordersRef,
      setOrders,
      setSelectedArchiveOrder,
      setToastMessage,
      setApiError,
      t,
    ]
  );

  return {
    handleRefundOrder,
    handlePayDebt,
  };
}
