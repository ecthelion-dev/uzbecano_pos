import { useCallback, useRef, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { CartItem, DBOrder, DBWaiter, DebtCustomerInfo } from '../types';
import { orderTotals, parsePromoTerms, type PromoTerms } from '../lib/promo';
import { splitPayment } from '../lib/payment';
import { adoptServerId, cartLineToOrderItem, type OutgoingOrderItem } from '../lib/orderItems';
import { writeCafeJson } from '../lib/storage';
import { createExclusive } from '../lib/exclusive';
import { isActiveOrder } from '../constants';
import { newId } from '../lib/uuid';

export interface UseCheckoutParams {
  orders: DBOrder[];
  ordersRef: MutableRefObject<DBOrder[]>;
  selectedTable: string;
  tableCarts: Record<string, CartItem[]>;
  isOfflineMode: boolean;
  currentWaiter: DBWaiter | null;
  serviceFeePercent: number;
  draftSubtotal: number;
  tableDraftPromos: Record<string, PromoTerms | null>;
  getActiveCafeId: () => string;
  getAuthHeaders: (approvalToken?: string, tokenOverride?: string | null) => Record<string, string>;
  sendAppendItems: (orderId: string, items: OutgoingOrderItem[]) => Promise<DBOrder | null>;
  queueOrderForSync: (order: any) => string;
  /** Navbatni hozir yuboradi va `qid` javobini qaytaradi (`useOfflineSync`). */
  flushNow: (qid?: string) => Promise<Response | null>;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => string | void;
  printClosedReceipt: (closedOrder: any) => void;
  handleSessionExpired: () => void;
  setOrders: (orders: DBOrder[]) => void;
  setTableDraftPromos: Dispatch<SetStateAction<Record<string, PromoTerms | null>>>;
  setTableCarts: Dispatch<SetStateAction<Record<string, CartItem[]>>>;
  setSelectedArchiveOrder: (order: DBOrder | null) => void;
  setShowUnsavedCartModal: (show: boolean) => void;
  setToastMessage: (msg: string | null) => void;
  setApiError: (msg: string | null) => void;
  setStorageBlockingError: (msg: string | null) => void;
  t: (key: any, options?: any) => string;
}

export function useCheckout(params: UseCheckoutParams) {
  const {
    orders,
    ordersRef,
    selectedTable,
    tableCarts,
    isOfflineMode,
    currentWaiter,
    serviceFeePercent,
    draftSubtotal,
    tableDraftPromos,
    getActiveCafeId,
    getAuthHeaders,
    sendAppendItems,
    queueOrderForSync,
    queuePatchForSync,
    flushNow,
    printClosedReceipt,
    setOrders,
    setTableDraftPromos,
    setTableCarts,
    setSelectedArchiveOrder,
    setShowUnsavedCartModal,
    setToastMessage,
    setApiError,
    setStorageBlockingError,
    t,
  } = params;

  const closeTable = useCallback(
    async (
      tableNum?: string,
      skipConfirm = false,
      payment?: { cash: number; card: number; debtCustomer?: DebtCustomerInfo }
    ) => {
      const targetTable = typeof tableNum === 'string' && tableNum.trim() ? tableNum.trim() : selectedTable;
      const normTarget = targetTable.trim().toLowerCase();
      const currentCart = tableCarts[targetTable] || [];
      const activeOrder = orders.find(
        (o) => (o.tableNumber || '').trim().toLowerCase() === normTarget && isActiveOrder(o.status)
      );

      if (!activeOrder && currentCart.length === 0) {
        setToastMessage(t('toast.noOrderOnTable'));
        setTimeout(() => setToastMessage(null), 2500);
        return;
      }

      let currentOrders = [...ordersRef.current];

      if (currentCart.length > 0) {
        if (!skipConfirm) {
          setShowUnsavedCartModal(true);
          return;
        }

        const newItems = currentCart.map((c) => ({
          id: c.product.id,
          ...cartLineToOrderItem(c),
          selectedAddons: c.selectedAddons,
        }));

        const sub = draftSubtotal;

        const latestActive = currentOrders.find(
          (o) => (o.tableNumber || '').trim().toLowerCase() === normTarget && isActiveOrder(o.status)
        );
        if (latestActive) {
          let existingItems: any[] = [];
          try {
            existingItems =
              typeof latestActive.items === 'string' ? JSON.parse(latestActive.items) : latestActive.items || [];
          } catch {}
          const combinedItems = [...existingItems, ...newItems];
          const combinedSubtotal = combinedItems.reduce(
            (s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
            0
          );
          const combined = orderTotals(combinedSubtotal, serviceFeePercent, parsePromoTerms(latestActive.promo));

          const serverOrder = await sendAppendItems(latestActive.id, newItems);

          currentOrders = currentOrders.map((o) =>
            o.id !== latestActive.id
              ? o
              : serverOrder
              ? { ...o, ...serverOrder }
              : {
                  ...o,
                  items: JSON.stringify(combinedItems),
                  subtotal: combinedSubtotal,
                  serviceFee: combined.serviceFee,
                  discount: combined.discount,
                  total: combined.total,
                }
          );
        } else {
          const draftPromo = tableDraftPromos[targetTable] || null;
          const { serviceFee: orderFee, discount, total: orderTot } = orderTotals(sub, serviceFeePercent, draftPromo);
          const newOrderObj = {
            id: newId(),
            cafeId: getActiveCafeId(),
            tableNumber: targetTable,
            waiterName: currentWaiter?.name || '',
            items: JSON.stringify(newItems),
            subtotal: sub,
            serviceFee: orderFee,
            discount,
            promo: draftPromo
              ? {
                  code: draftPromo.code,
                  type: draftPromo.type,
                  value: draftPromo.value,
                  minOrder: draftPromo.minOrder ?? 0,
                }
              : undefined,
            total: orderTot,
            status: 'sent_to_kitchen',
          };

          // To'g'ridan-to'g'ri POST yo'q: navbatga va SHU ZAHOTI yuborish.
          // Navbatda shu stolning oldingi amallari bo'lsa, ular oldin ketadi.
          const createQid = queueOrderForSync(newOrderObj);
          if (!isOfflineMode) {
            const res = await flushNow(createQid);
            if (res?.ok) {
              await adoptServerId(res, newOrderObj);
              const serverCreated = await res.clone().json().catch(() => null);
              if (serverCreated) {
                if (serverCreated.promo !== undefined) (newOrderObj as any).promo = serverCreated.promo;
                if (serverCreated.discount !== undefined) (newOrderObj as any).discount = serverCreated.discount;
                if (serverCreated.total !== undefined) (newOrderObj as any).total = serverCreated.total;
              }
            }
          }

          currentOrders.push(newOrderObj);
          setTableDraftPromos((prev) => {
            if (!prev[targetTable]) return prev;
            const copy = { ...prev };
            delete copy[targetTable];
            return copy;
          });
        }

        ordersRef.current = currentOrders;
        setOrders(currentOrders);
        if (!writeCafeJson(getActiveCafeId(), 'orders', currentOrders)) {
          setStorageBlockingError(t('storage.writeFailed'));
          return;
        }
      }

      setApiError(null);
      try {
        const latestOrder = currentOrders.find(
          (o) => (o.tableNumber || '').trim().toLowerCase() === normTarget && isActiveOrder(o.status)
        );
        let closedOrder: any = null;

        if (latestOrder) {
          const orderTotal = latestOrder.total || 0;
          const isDebt = Boolean(payment?.debtCustomer);

          const { cash: finalCash, card: finalCard, method: finalMethod } = splitPayment(
            orderTotal,
            payment ? payment.cash : orderTotal
          );

          const paymentPatchBody: any = isDebt
            ? {
                status: 'served',
                paymentMethod: 'qarz',
                cashAmount: 0,
                cardAmount: 0,
                debtCustomerName: payment!.debtCustomer!.name,
                debtCustomerPhone: payment!.debtCustomer!.phone || null,
                debtDueDate: payment!.debtCustomer!.dueDate || null,
                debtNote: payment!.debtCustomer!.note || null,
              }
            : {
                status: 'served',
                paymentMethod: finalMethod,
                cashAmount: finalCash,
                cardAmount: finalCard,
              };

          closedOrder = {
            ...latestOrder,
            status: 'served',
            paymentMethod: isDebt ? 'qarz' : finalMethod,
            cashAmount: isDebt ? 0 : finalCash,
            cardAmount: isDebt ? 0 : finalCard,
            debtCustomerName: isDebt ? payment!.debtCustomer!.name : latestOrder.debtCustomerName ?? null,
            debtCustomerPhone: isDebt
              ? payment!.debtCustomer!.phone || null
              : latestOrder.debtCustomerPhone ?? null,
            debtDueDate: isDebt ? payment!.debtCustomer!.dueDate || null : latestOrder.debtDueDate ?? null,
            debtNote: isDebt ? payment!.debtCustomer!.note || null : latestOrder.debtNote ?? null,
            closedAt: latestOrder.closedAt || new Date().toISOString(),
            waiterName: latestOrder.waiterName || currentWaiter?.name || 'Xodim',
            debtCustomer: payment?.debtCustomer ?? null,
          };

          const updatedOrders = currentOrders.map((o) => (o.id === latestOrder.id ? closedOrder : o));

          ordersRef.current = updatedOrders;
          setOrders(updatedOrders);
          if (!writeCafeJson(getActiveCafeId(), 'orders', updatedOrders)) {
            setStorageBlockingError(t('storage.writeFailed'));
            return;
          }
          setSelectedArchiveOrder(closedOrder);

          /*
           * Tartib: to'lov NAVBATGA -> chek -> serverga.
           *
           * Pul chek bosilishidan OLDIN diskda bo'lishi shart. Brauzerda chek
           * tizimning chop etish oynasi orqali chiqadi va u ochiq turganda
           * sahifaning JS i to'xtaydi: navbatga yozish chekdan keyin bo'lsa,
           * oyna ochiq paytda ilova yopilganda to'lov yo'qolardi. 2026-10-03
           * da test-cafe oflayn sinovida aynan shunday bo'ldi — buyurtma
           * serverga yetdi, to'lovi yetmadi.
           *
           * Chek esa tarmoqni KUTMAYDI (net.test.ts: "qog'oz birinchi").
           *
           * Server qabul qilsa yozuv navbatdan olinadi. Drenaj uni ham
           * yuborib ulgursa — zarari yo'q: server takroriy yopishni
           * (served -> served) xato hisoblamaydi.
           */
          const paymentQid = queuePatchForSync(latestOrder.id, paymentPatchBody, 'finalize_payment');

          printClosedReceipt(closedOrder);

          /*
           * To'lov ham navbat orqali — o'zidan oldingi amallar (shu chekning
           * yaratilishi, taom qo'shish) server tomonidan qabul qilingandan
           * KEYIN ketadi. Ilgari u to'g'ridan-to'g'ri ketib, hali yaratilmagan
           * chekka yetardi: "Buyurtma topilmadi" (2026-10-16).
           */
          if (!isOfflineMode && paymentQid) {
            const res = await flushNow(paymentQid);
            if (!res) {
              setApiError(t('toast.paymentQueued'));
            } else if (!res.ok && res.status !== 401) {
              setApiError(t('toast.paymentNotSaved'));
            }
          }
        }
        setTableCarts((prev) => ({ ...prev, [targetTable]: [] }));
        setToastMessage(`${targetTable} muvaffaqiyatli to'lanib yopildi!`);
        setTimeout(() => setToastMessage(null), 2500);
      } catch (err: any) {
        setApiError(`Stolni yopishda xatolik: ${err.message || err}`);
      }
    },
    [
      orders,
      selectedTable,
      tableCarts,
      isOfflineMode,
      currentWaiter,
      getActiveCafeId,
      getAuthHeaders,
      sendAppendItems,
      queueOrderForSync,
      flushNow,
      queuePatchForSync,
      serviceFeePercent,
      draftSubtotal,
      printClosedReceipt,
      tableDraftPromos,
      ordersRef,
      setOrders,
      setSelectedArchiveOrder,
      setShowUnsavedCartModal,
      setStorageBlockingError,
      setTableCarts,
      setTableDraftPromos,
      setToastMessage,
      setApiError,
      t,
    ]
  );

  // "To'lov" javob kutayotganda qayta bosilsa, to'lov va chek ikki-uch marta
  // ketardi (2026-10-05: bir stolga 1 soniyada uchta PATCH).
  const exclusive = useRef(createExclusive()).current;
  const handleCloseTable = useCallback(
    (...args: Parameters<typeof closeTable>) => exclusive(() => closeTable(...args)),
    [exclusive, closeTable],
  );

  return { handleCloseTable };
}
