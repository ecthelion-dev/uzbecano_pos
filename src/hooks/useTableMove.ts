import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import type { DBOrder, CartItem } from '../types';
import type { PromoTerms } from '../lib/promo';
import { writeCafeJson } from '../lib/storage';
import { fetchWithTimeout } from '../lib/net';
import { API_BASE_URL, isActiveOrder } from '../constants';

export interface UseTableMoveParams {
  orders: DBOrder[];
  ordersRef: MutableRefObject<DBOrder[]>;
  tableCarts: Record<string, CartItem[]>;
  isOfflineMode: boolean;
  serviceFeePercent: number;
  getActiveCafeId: () => string;
  getAuthHeaders: (approvalToken?: string, tokenOverride?: string | null) => Record<string, string>;
  queuePatchForSync: (orderId: string, body: any, label?: string, approvalToken?: string) => void;
  queueDeleteForSync: (orderId: string, label?: string) => void;
  setOrders: (orders: DBOrder[]) => void;
  setTableCarts: Dispatch<SetStateAction<Record<string, CartItem[]>>>;
  setTableDraftPromos: Dispatch<SetStateAction<Record<string, PromoTerms>>>;
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
    getAuthHeaders,
    queuePatchForSync,
    queueDeleteForSync,
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
          if (!isOfflineMode) {
            try {
              const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(mergeTablePatchBody),
              });
              if (!res.ok) queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table');
            } catch {
              queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table');
            }

            try {
              const delRes = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
              });
              if (!delRes.ok) queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup');
            } catch {
              queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup');
            }
          } else {
            queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table');
            queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup');
          }

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
          if (!isOfflineMode) {
            try {
              const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ tableNumber: targetTable }),
              });
              if (!res.ok) queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
            } catch {
              queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
            }
          } else {
            queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
          }
          updatedOrders = updatedOrders.map((o) =>
            o.id === sourceOrder.id ? { ...o, tableNumber: targetTable } : o
          );
        }

        setToastMessage(`${sourceTable} va ${targetTable} muvaffaqiyatli birlashtirildi!`);
      } else {
        if (sourceOrder) {
          if (!isOfflineMode) {
            try {
              const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ tableNumber: targetTable }),
              });
              if (!res.ok) queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
            } catch {
              queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
            }
          } else {
            queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
          }

          updatedOrders = updatedOrders.map((o) =>
            o.id === sourceOrder.id ? { ...o, tableNumber: targetTable } : o
          );
        }
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
    },
    [
      orders,
      ordersRef,
      tableCarts,
      isOfflineMode,
      serviceFeePercent,
      getActiveCafeId,
      getAuthHeaders,
      queuePatchForSync,
      queueDeleteForSync,
      setOrders,
      setTableCarts,
      setTableDraftPromos,
      setSelectedTable,
      setToastMessage,
    ]
  );

  return { handleMoveTable };
}
