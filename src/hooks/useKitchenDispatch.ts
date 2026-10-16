import { useCallback, useState, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { CartItem, DBOrder, DBWaiter, KitchenSlipData } from '../types';
import { orderTotals, parsePromoTerms, type PromoTerms } from '../lib/promo';
import { cartLineToOrderItem, removeItemPatch, sentItemToOrderItem, type OutgoingOrderItem } from '../lib/orderItems';
import { createExclusive } from '../lib/exclusive';
import { decideFromStatus } from '../lib/syncQueue';
import { writeCafeJson, readGlobalText } from '../lib/storage';
import { formatClock } from '../lib/timeFormat';
import { DEFAULT_CAFE_ID } from '../constants';
import { newId } from '../lib/uuid';

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
  tableDraftPromos: Record<string, PromoTerms | null>;
  getActiveCafeId: () => string;
  sendAppendItems: (orderId: string, items: OutgoingOrderItem[]) => Promise<DBOrder | null>;
  queueOrderForSync: (order: any) => string;
  /** Navbatni hozir yuboradi va `qid` javobini qaytaradi (`useOfflineSync`). */
  flushNow: (qid?: string) => Promise<Response | null>;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => string;
  requestAdminPin: (callback: (approvalToken?: string) => void | Promise<void>) => void;
  setOrders: (orders: DBOrder[]) => void;
  setTableDraftPromos: Dispatch<SetStateAction<Record<string, PromoTerms | null>>>;
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
    sendAppendItems,
    queueOrderForSync,
    flushNow,
    queuePatchForSync,
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
        // Hisob `removeItemPatch` ichida, server tartibi bo'yicha: chegirmani
        // ham qayta hisoblaydi. Qo'lda `sub + fee` yig'ish chegirmani
        // butunlab tushirib qoldirardi — kassa mijozga serverdan katta summa
        // ko'rsatardi.
        const patchBody = removeItemPatch(
          updatedItems,
          serviceFeePercent,
          parsePromoTerms(activeTableOrder.promo)
        );
        const { subtotal: sub, serviceFee: fee, discount, total: tot } = patchBody;
        /*
         * Faqat navbat orqali (2026-10-16): bu PATCH chekning TO'LIQ
         * ro'yxatini yuboradi. To'g'ridan-to'g'ri ketsa, navbatda turgan taom
         * qo'shishni quvib o'tardi — keyin o'sha qo'shish o'chirilgan taomni
         * qaytarib olib kelardi yoki chek hali serverda bo'lmay 404 olardi.
         */
        const qid = queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item', approvalToken);
        if (!isOfflineMode) {
          const res = await flushNow(qid);
          if (res && !res.ok && res.status !== 401 && decideFromStatus(res.status) !== 'retry') {
            const why = await res.json().catch(() => null);
            setToastMessage(why?.error || "Taomni o'chirib bo'lmadi");
            setTimeout(() => setToastMessage(null), 5000);
            return;
          }
        }

        const emptied = updatedItems.length === 0;
        const updatedOrders = orders.map((o) =>
          o.id === activeTableOrder.id
            ? {
                ...o,
                items: JSON.stringify(updatedItems),
                subtotal: sub,
                serviceFee: fee,
                discount,
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
      queuePatchForSync,
      flushNow,
      serviceFeePercent,
      setOrders,
      setToastMessage,
      t,
    ]
  );

  /*
   * `printSlip: false` — to'lovdan oldin saqlanmagan savat avtomatik yuboriladigan
   * yo'l. U yerda taomlar stol yopilishi uchun buyurtmaga yoziladi, lekin
   * oshxonaga qog'oz chiqmaydi: kassir "To'lov va yopish" ni bosgan, "Tasdiqlash"
   * ni emas, ya'ni oshpazga buyruq berilmagan.
   */
  const sendToKitchen = useCallback(async (opts?: { printSlip?: boolean }) => {
    if (cart.length === 0) return;
    setApiError(null);
    try {
      const newItems = cart.map(cartLineToOrderItem);
      let updatedOrders = [...ordersRef.current];

      let kitchenOrderId = '';
      let kitchenDailyNumber = 0;
      /*
       * Avval KASSADA, keyin serverga (2026-10-16 22:18). Chek kassa
       * ro'yxatiga server javobidan KEYIN qo'shilardi — o'sha bir soniyada
       * bosilgan "To'lov" stolni bo'sh ko'rib ikkinchi chek ochardi.
       * Server javobi (kunlik raqam, promo summasi) kelgach ustiga yoziladi.
       */
      let sendToServer: () => Promise<void> = async () => {};
      const adoptLocal = (fn: (o: DBOrder) => DBOrder) => {
        const next = ordersRef.current.map(fn);
        ordersRef.current = next;
        setOrders(next);
        writeCafeJson(getActiveCafeId(), 'orders', next);
      };

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

        const appendTo = activeTableOrder.id;
        updatedOrders = updatedOrders.map((o) =>
          o.id !== appendTo
            ? o
            : {
                ...o,
                items: JSON.stringify(combinedItems),
                subtotal: combinedSubtotal,
                serviceFee: combinedFee,
                discount: combinedDiscount,
                total: combinedTotal,
              }
        );
        sendToServer = async () => {
          const serverOrder = await sendAppendItems(appendTo, newItems);
          if (!serverOrder) return;
          kitchenDailyNumber = Number((serverOrder as any).dailyNumber) || kitchenDailyNumber;
          adoptLocal((o) => (o.id === appendTo ? { ...o, ...serverOrder } : o));
        };
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
          id: newId(),
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

        const createQid = queueOrderForSync(newOrderObj);
        sendToServer = async () => {
          if (isOfflineMode) return;
          const res = await flushNow(createQid);
          if (!res?.ok) return;
          const created = await res.json().catch(() => null);
          if (!created) return;
          const localId = newOrderObj.id;
          const fromServer: Partial<DBOrder> = {};
          if (created.id) fromServer.id = String(created.id);
          if (Number(created.dailyNumber) > 0) fromServer.dailyNumber = Number(created.dailyNumber);
          if (created.promo !== undefined) (fromServer as any).promo = created.promo;
          if (created.discount !== undefined) fromServer.discount = created.discount;
          if (created.total !== undefined) fromServer.total = created.total;
          kitchenOrderId = fromServer.id || localId;
          kitchenDailyNumber = Number(fromServer.dailyNumber) || 0;
          adoptLocal((o) => (o.id === localId ? { ...o, ...fromServer } : o));
        };

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
      await sendToServer();

      /*
       * Oshxona qog'ozi tasdiqlash bosilishi bilan chiqadi, navbat raqami bilan.
       *
       * Raqam SERVERDAN: buyurtmaning kunlik tartib raqami, har kuni 1 dan
       * boshlanadi va chekdagi raqam bilan bir xil. Kassa o'z hisobini
       * yuritmaydi — ikkinchi qurilma qo'shilsa bir kunda ikkita "No 7"
       * chiqardi. Oflayn buyurtmada raqam hali yo'q (u sinxronizatsiyada
       * beriladi): qog'oz raqamsiz chiqadi, taomlar esa yo'qolmaydi.
       *
       * Faqat shu safar qo'shilgan taomlar bosiladi, buyurtmaning hammasi emas.
       */
      if (opts?.printSlip !== false) {
        setKitchenSlipData({
          orderId: kitchenOrderId,
          tableNumber: selectedTable,
          waiterName: currentWaiter?.name || 'Offitsiant',
          items: newItems,
          time: formatClock(new Date()),
          timestamp: new Date().toISOString(),
          slipNumber: kitchenDailyNumber,
        });
      }

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
    flushNow,
    currentWaiter,
    serviceFeePercent,
    getActiveCafeId,
    sendAppendItems,
    queueOrderForSync,
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

  // "Tasdiqlash" tarmoq javobini kutayotganda qayta bosilsa, oshxonaga ikki
  // marta ketardi: savat javobdan keyingina bo'shaydi.
  // `useState` — bir marta yaratiladi va render paytida o'qish xavfsiz
  // (`idle` ni qaytaramiz; ref'dan o'qish React qoidasiga zid).
  const [exclusive] = useState(createExclusive);
  const handleSendToKitchen = useCallback(
    (opts?: { printSlip?: boolean }) => exclusive(() => sendToKitchen(opts)),
    [exclusive, sendToKitchen],
  );

  return {
    handleSendToKitchen,
    handleRemoveKitchenItem,
    /** Yuborish ketayotgan bo'lsa — tugashini kutadi (`checkoutFlow.ts`). */
    waitForKitchenDispatch: exclusive.idle,
  };
}
