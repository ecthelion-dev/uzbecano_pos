import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { CartItem, DBOrder, DBWaiter, KitchenSlipData } from '../types';
import type { PromoTerms } from '../lib/promo';
import { orderTotals, parsePromoTerms } from '../lib/promo';
import { cartLineToOrderItem, sentItemToOrderItem, type OutgoingOrderItem } from '../lib/orderItems';
import { fetchWithTimeout } from '../lib/net';
import { decideFromStatus } from '../lib/syncQueue';
import { writeCafeJson, readGlobalText } from '../lib/storage';
import { formatClock } from '../lib/timeFormat';
import { API_BASE_URL, DEFAULT_CAFE_ID } from '../constants';

export interface UseKitchenDispatchParams {
  cart: CartItem[];
  selectedTable: string;
  activeTableOrder: DBOrder | null;
  activeTableOrderItems: any[];
  draftSubtotal: number;
  orders: DBOrder[];
  ordersRef: MutableRefObject<DBOrder[]>;
  isOfflineMode: boolean;
  currentWaiter: DBWaiter | null;
  serviceFeePercent: number;
  tableDraftPromos: Record<string, PromoTerms>;
  getActiveCafeId: () => string;
  getAuthHeaders: (approvalToken?: string, tokenOverride?: string | null) => Record<string, string>;
  sendAppendItems: (orderId: string, items: OutgoingOrderItem[]) => Promise<DBOrder | null>;
  queueOrderForSync: (order: any) => void;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => void;
  applyFrozenFromResponse: (res: Response, cafeId: string) => Promise<boolean>;
  requestAdminPin: (callback: (approvalToken?: string) => void | Promise<void>) => void;
  setOrders: (orders: DBOrder[]) => void;
  setTableDraftPromos: Dispatch<SetStateAction<Record<string, PromoTerms>>>;
  setTableCarts: Dispatch<SetStateAction<Record<string, CartItem[]>>>;
  setKitchenSlipData: (slip: KitchenSlipData | null) => void;
  setToastMessage: (msg: string | null) => void;
  setApiError: (msg: string | null) => void;
  setStorageBlockingError: (msg: string | null) => void;
  t: (key: any, options?: any) => string;
}

export function useKitchenDispatch(params: UseKitchenDispatchParams) {
  const {
    cart,
    selectedTable,
    activeTableOrder,
    activeTableOrderItems,
    draftSubtotal,
    orders,
    ordersRef,
    isOfflineMode,
    currentWaiter,
    serviceFeePercent,
    tableDraftPromos,
    getActiveCafeId,
    getAuthHeaders,
    sendAppendItems,
    queueOrderForSync,
    queuePatchForSync,
    applyFrozenFromResponse,
    requestAdminPin,
    setOrders,
    setTableDraftPromos,
    setTableCarts,
    setKitchenSlipData,
    setToastMessage,
    setApiError,
    setStorageBlockingError,
    t,
  } = params;

  const handleRemoveKitchenItem = useCallback(
    (itemIndex: number) => {
      requestAdminPin(async (approvalToken?: string) => {
        if (!activeTableOrder) return;
        const updatedItems = [...activeTableOrderItems];
        updatedItems.splice(itemIndex, 1);
        const sub = updatedItems.reduce(
          (s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
          0
        );
        const fee = Math.round((sub * serviceFeePercent) / 100);
        const tot = sub + fee;

        const patchBody = { items: JSON.stringify(updatedItems), subtotal: sub, serviceFee: fee, total: tot };
        if (!isOfflineMode) {
          try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${activeTableOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(approvalToken),
              body: JSON.stringify(patchBody),
            });
            if (!res.ok) {
              if (decideFromStatus(res.status) !== 'retry') {
                const why = await res.json().catch(() => null);
                setToastMessage(why?.error || "Taomni o'chirib bo'lmadi");
                setTimeout(() => setToastMessage(null), 5000);
                return;
              }
              queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item', approvalToken);
            }
          } catch {
            queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item', approvalToken);
          }
        } else {
          queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item', approvalToken);
        }

        const emptied = updatedItems.length === 0;
        const updatedOrders = orders.map((o) =>
          o.id === activeTableOrder.id
            ? {
                ...o,
                items: JSON.stringify(updatedItems),
                subtotal: sub,
                serviceFee: fee,
                total: tot,
                ...(emptied ? { status: 'cancelled' } : {}),
              }
            : o
        );
        setOrders(updatedOrders);
        writeCafeJson(getActiveCafeId(), 'orders', updatedOrders);
        setToastMessage(emptied ? t('toast.tableFreed') : t('toast.dishCancelled'));
        setTimeout(() => setToastMessage(null), 2500);
      });
    },
    [
      activeTableOrder,
      activeTableOrderItems,
      orders,
      isOfflineMode,
      requestAdminPin,
      getActiveCafeId,
      getAuthHeaders,
      queuePatchForSync,
      serviceFeePercent,
      setOrders,
      setToastMessage,
      t,
    ]
  );

  const handleSendToKitchen = useCallback(async () => {
    if (cart.length === 0) return;
    setApiError(null);
    try {
      const newItems = cart.map(cartLineToOrderItem);
      let updatedOrders = [...ordersRef.current];

      let kitchenOrderId = '';
      let kitchenDailyNumber = 0;

      if (activeTableOrder) {
        kitchenOrderId = String(activeTableOrder.id || '');
        kitchenDailyNumber = Number((activeTableOrder as any).dailyNumber) || 0;
        const itemMap = new Map<string, OutgoingOrderItem>();
        activeTableOrderItems.forEach((i: any, idx: number) => {
          itemMap.set(`${i.name}_${i.note || ''}_${idx}`, sentItemToOrderItem(i));
        });
        newItems.forEach((i, idx) => {
          itemMap.set(`${i.name}_${i.note || ''}_new_${idx}`, i);
        });
        const combinedItems = Array.from(itemMap.values());
        const combinedSubtotal = combinedItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
        const { serviceFee: combinedFee, discount: combinedDiscount, total: combinedTotal } = orderTotals(
          combinedSubtotal,
          serviceFeePercent,
          parsePromoTerms(activeTableOrder.promo)
        );

        const serverOrder = await sendAppendItems(activeTableOrder.id, newItems);

        updatedOrders = updatedOrders.map((o) =>
          o.id !== activeTableOrder.id
            ? o
            : serverOrder
            ? { ...o, ...serverOrder }
            : {
                ...o,
                items: JSON.stringify(combinedItems),
                subtotal: combinedSubtotal,
                serviceFee: combinedFee,
                discount: combinedDiscount,
                total: combinedTotal,
              }
        );
      } else {
        const draftPromo = tableDraftPromos[selectedTable] || null;
        const sub = draftSubtotal;
        const { serviceFee: fee, discount, total: tot } = orderTotals(sub, serviceFeePercent, draftPromo);
        const cafeId = readGlobalText('cafeId') || DEFAULT_CAFE_ID;
        const newOrderObj: {
          id: string;
          cafeId: string;
          tableNumber: string;
          waiterName: string;
          items: string;
          subtotal: number;
          serviceFee: number;
          total: number;
          status: string;
          dailyNumber?: number;
          promo?: any;
          discount?: number;
        } = {
          id: crypto.randomUUID(),
          cafeId,
          tableNumber: selectedTable,
          waiterName: currentWaiter?.name || '',
          items: JSON.stringify(newItems),
          subtotal: sub,
          serviceFee: fee,
          discount,
          promo: draftPromo ? { code: draftPromo.code, type: draftPromo.type, value: draftPromo.value } : undefined,
          total: tot,
          status: 'sent_to_kitchen',
        };
        kitchenOrderId = newOrderObj.id;

        if (!isOfflineMode) {
          try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ ...newOrderObj, promoCode: draftPromo?.code, idempotencyKey: newOrderObj.id }),
            });
            if (await applyFrozenFromResponse(res, getActiveCafeId())) return;
            if (!res.ok) {
              queueOrderForSync(newOrderObj);
            } else {
              const serverCreated = await res.clone().json().catch(() => null);
              if (serverCreated) {
                if (serverCreated.id) newOrderObj.id = String(serverCreated.id);
                if (Number(serverCreated.dailyNumber) > 0) newOrderObj.dailyNumber = Number(serverCreated.dailyNumber);
                if (serverCreated.promo !== undefined) (newOrderObj as any).promo = serverCreated.promo;
                if (serverCreated.discount !== undefined) (newOrderObj as any).discount = serverCreated.discount;
                if (serverCreated.total !== undefined) (newOrderObj as any).total = serverCreated.total;
              }
              kitchenOrderId = newOrderObj.id;
              kitchenDailyNumber = Number(newOrderObj.dailyNumber) || 0;
            }
          } catch {
            queueOrderForSync(newOrderObj);
          }
        } else {
          queueOrderForSync(newOrderObj);
        }

        updatedOrders = [newOrderObj as any, ...updatedOrders];
        setTableDraftPromos((prev) => {
          if (!prev[selectedTable]) return prev;
          const copy = { ...prev };
          delete copy[selectedTable];
          return copy;
        });
      }

      ordersRef.current = updatedOrders;
      setOrders(updatedOrders);
      if (!writeCafeJson(getActiveCafeId(), 'orders', updatedOrders)) {
        setStorageBlockingError(t('storage.writeFailed'));
        return;
      }
      setTableCarts((prev) => ({ ...prev, [selectedTable]: [] }));

      const kitchenPayload: KitchenSlipData = {
        orderId: kitchenOrderId,
        tableNumber: selectedTable,
        waiterName: currentWaiter?.name || 'Offitsiant',
        items: newItems,
        time: formatClock(new Date()),
        timestamp: new Date().toISOString(),
        slipNumber: kitchenDailyNumber,
      };
      setKitchenSlipData(kitchenPayload);

      setToastMessage(t('toast.sentToKitchen'));
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: any) {
      setApiError(`Ulanish xatosi: ${err.message || err}`);
    }
  }, [
    selectedTable,
    cart,
    activeTableOrder,
    activeTableOrderItems,
    draftSubtotal,
    ordersRef,
    isOfflineMode,
    currentWaiter,
    serviceFeePercent,
    getActiveCafeId,
    getAuthHeaders,
    sendAppendItems,
    queueOrderForSync,
    applyFrozenFromResponse,
    tableDraftPromos,
    setOrders,
    setStorageBlockingError,
    t,
    setTableCarts,
    setKitchenSlipData,
    setToastMessage,
    setApiError,
    setTableDraftPromos,
  ]);

  return {
    handleSendToKitchen,
    handleRemoveKitchenItem,
  };
}
