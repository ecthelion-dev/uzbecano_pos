import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import type { DBOrder, CartItem } from '../types';
import type { PromoTerms } from '../lib/promo';
import { writeCafeJson } from '../lib/storage';
import { isActiveOrder } from '../constants';

export interface UseTableMoveParams {
  orders: DBOrder[];
  ordersRef: MutableRefObject<DBOrder[]>;
  tableCarts: Record<string, CartItem[]>;
  isOfflineMode: boolean;
  serviceFeePercent: number;
  getActiveCafeId: () => string;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => string;
  queueDeleteForSync: (orderId: string, label?: string, afterOrderId?: string) => string;
  flushNow: (qid?: string | string[]) => Promise<Response | null>;
  setOrders: (orders: DBOrder[]) => void;
  setTableCarts: Dispatch<SetStateAction<Record<string, CartItem[]>>>;
  setTableDraftPromos: Dispatch<SetStateAction<Record<string, PromoTerms | null>>>;
  setSelectedTable: (table: string) => void;
  setToastMessage: (msg: string | null) => void;
}

export function useTableMove(params: UseTableMoveParams) {
  const {
    orders,
    ordersRef,
    tableCarts,
    isOfflineMode,
    serviceFeePercent,
    getActiveCafeId,
    queuePatchForSync,
    queueDeleteForSync,
    flushNow,
    setOrders,
    setTableCarts,
    setTableDraftPromos,
    setSelectedTable,
    setToastMessage,
  } = params;

  const handleMoveTable = useCallback(
    async (sourceTable: string, targetTable: string, isMerge: boolean) => {
      const sourceOrder = orders.find((o) => o.tableNumber === sourceTable && isActiveOrder(o.status));
      const sourceCart = tableCarts[sourceTable] || [];

      if (!sourceOrder && sourceCart.length === 0) return;

      let updatedOrders = [...ordersRef.current];
      /*
       * Yozuvlar faqat navbat orqali (2026-10-16): avval to'g'ridan-to'g'ri
       * PATCH, keyin DELETE ketardi va PATCH rad etilsa ham DELETE o'tib,
       * manba chek taomlari bilan yo'qolardi. Navbat ularni tartib bilan
       * yuboradi, o'chirish esa birlashtirish o'tgandan keyingina ketadi.
       */
      let pending: string[] = [];
      const moveOrder = (order: DBOrder) => {
        pending = [queuePatchForSync(order.id, { tableNumber: targetTable }, 'move_table')];
        updatedOrders = updatedOrders.map((o) => (o.id === order.id ? { ...o, tableNumber: targetTable } : o));
      };

      if (isMerge) {
        const targetOrder = orders.find((o) => o.tableNumber === targetTable && isActiveOrder(o.status));

        if (sourceOrder && targetOrder) {
          let srcItems: any[] = [];
          let tgtItems: any[] = [];
          try {
            srcItems =
              typeof sourceOrder.items === 'string' ? JSON.parse(sourceOrder.items) : sourceOrder.items || [];
          } catch {}
          try {
            tgtItems =
              typeof targetOrder.items === 'string' ? JSON.parse(targetOrder.items) : targetOrder.items || [];
          } catch {}

          const mergedItems = [...tgtItems, ...srcItems];
          const sub = mergedItems.reduce(
            (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
            0
          );
          const fee = Math.round((sub * serviceFeePercent) / 100);
          const tot = sub + fee;

          const mergeTablePatchBody = {
            tableNumber: targetTable,
            items: JSON.stringify(mergedItems),
            subtotal: sub,
            serviceFee: fee,
            total: tot,
          };
          pending = [
            queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table'),
            queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup', targetOrder.id),
          ];

          updatedOrders = updatedOrders
            .filter((o) => o.id !== sourceOrder.id)
            .map((o) =>
              o.id === targetOrder.id
                ? {
                    ...o,
                    tableNumber: targetTable,
                    items: JSON.stringify(mergedItems),
                    subtotal: sub,
                    serviceFee: fee,
                    total: tot,
                  }
                : o
            );
        } else if (sourceOrder && !targetOrder) {
          moveOrder(sourceOrder);
        }

        setToastMessage(`${sourceTable} va ${targetTable} muvaffaqiyatli birlashtirildi!`);
      } else {
        if (sourceOrder) moveOrder(sourceOrder);
        setToastMessage(`${sourceTable} buyurtmasi ${targetTable}ga ko'chirildi!`);
      }

      // Transfer draft carts and draft promos
      setTableCarts((prev) => {
        const srcCart = prev[sourceTable] || [];
        if (srcCart.length === 0) return prev;
        const next = { ...prev };
        delete next[sourceTable];
        if (isMerge) {
          next[targetTable] = [...(next[targetTable] || []), ...srcCart];
        } else {
          next[targetTable] = srcCart;
        }
        return next;
      });

      setTableDraftPromos((prev) => {
        const srcPromo = prev[sourceTable];
        if (!srcPromo) return prev;
        const next = { ...prev };
        delete next[sourceTable];
        if (!next[targetTable]) {
          next[targetTable] = srcPromo;
        }
        return next;
      });

      setOrders(updatedOrders);
      writeCafeJson(getActiveCafeId(), 'orders', updatedOrders);
      setSelectedTable(targetTable);
      setTimeout(() => setToastMessage(null), 2500);

      // Kassa allaqachon yangi holatda; server javobi kutilmaydi (ko'pi bilan
      // 8 soniya), rad etilsa navbat o'zi xabar beradi.
      if (pending.length > 0 && !isOfflineMode) await flushNow(pending);
    },
    [
      orders,
      ordersRef,
      tableCarts,
      isOfflineMode,
      serviceFeePercent,
      getActiveCafeId,
      queuePatchForSync,
      queueDeleteForSync,
      flushNow,
      setOrders,
      setTableCarts,
      setTableDraftPromos,
      setSelectedTable,
      setToastMessage,
    ]
  );

  return { handleMoveTable };
}
