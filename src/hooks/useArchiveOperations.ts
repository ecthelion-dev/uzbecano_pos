import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import type { DBOrder, DBWaiter, DebtPaymentEntry } from '../types';
import { writeCafeJson } from '../lib/storage';
import { fetchWithTimeout } from '../lib/net';
import { decideFromStatus } from '../lib/syncQueue';
import { API_BASE_URL } from '../constants';

export interface UseArchiveOperationsParams {
  orders: DBOrder[];
  ordersRef: MutableRefObject<DBOrder[]>;
  currentWaiter: DBWaiter | null;
  isOfflineMode: boolean;
  requestAdminPin: (callback: (approvalToken?: string) => void | Promise<void>) => void;
  getActiveCafeId: () => string;
  getAuthHeaders: (approvalToken?: string, tokenOverride?: string | null) => Record<string, string>;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => void;
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
    getAuthHeaders,
    queuePatchForSync,
    setOrders,
    setSelectedArchiveOrder,
    setToastMessage,
    setApiError,
    t,
  } = params;

  const handleRefundOrder = useCallback(
    (targetOrder: DBOrder, reason: string) => {
      requestAdminPin(async (approvalToken?: string) => {
        const refundBody = { action: 'refund', refundReason: reason };
        if (!isOfflineMode) {
          try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(approvalToken),
              body: JSON.stringify(refundBody),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              if (decideFromStatus(res.status) !== 'retry') {
                setApiError(data.error || t('toast.refundNotSaved'));
                return;
              }
              setApiError(data.error || t('toast.refundNotSaved'));
              queuePatchForSync(targetOrder.id, refundBody, 'refund', approvalToken);
            }
          } catch {
            setApiError(t('toast.refundQueued'));
            queuePatchForSync(targetOrder.id, refundBody, 'refund', approvalToken);
          }
        } else {
          queuePatchForSync(targetOrder.id, refundBody, 'refund', approvalToken);
        }

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
      getAuthHeaders,
      queuePatchForSync,
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
      const debtPayment = {
        amount,
        method,
        note: note || undefined,
      };
      const patchBody = { debtPayment };

      let serverUpdatedOrder: DBOrder | null = null;

      if (!isOfflineMode) {
        try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(patchBody),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.order) {
              serverUpdatedOrder = data.order;
            }
          } else {
            const data = await res.json().catch(() => ({}));
            if (decideFromStatus(res.status) !== 'retry') {
              setApiError(data.error || t('toast.debtPaymentNotSaved'));
              return;
            }
            queuePatchForSync(targetOrder.id, patchBody, 'debtPayment');
          }
        } catch {
          queuePatchForSync(targetOrder.id, patchBody, 'debtPayment');
        }
      } else {
        queuePatchForSync(targetOrder.id, patchBody, 'debtPayment');
      }

      const paymentEntry: DebtPaymentEntry = {
        id: crypto.randomUUID(),
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
      isOfflineMode,
      getActiveCafeId,
      getAuthHeaders,
      queuePatchForSync,
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
