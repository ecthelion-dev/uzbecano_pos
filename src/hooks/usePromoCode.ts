import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { DBOrder } from '../types';
import { parsePromoTerms, orderTotals, type PromoTerms } from '../lib/promo';
import { fetchWithTimeout } from '../lib/net';
import { API_BASE_URL } from '../constants';
import { unsyncedOrderIds } from '../lib/orderMerge';

export interface UsePromoCodeParams {
  activeTableOrder: DBOrder | null;
  selectedTable: string;
  draftSubtotal: number;
  activeSubtotal: number;
  isOfflineMode: boolean;
  serviceFeePercent: number;
  ordersRef: MutableRefObject<DBOrder[]>;
  getAuthHeaders: (approvalToken?: string, tokenOverride?: string | null) => Record<string, string>;
  getActiveCafeId: () => string;
  readSyncQueue: (cafeId: string) => unknown[];
  flushNow: (qid?: string | string[]) => Promise<Response | null>;
  setOrders: (orders: DBOrder[]) => void;
  persistOrders: (orders: DBOrder[]) => void;
  setTableDraftPromos: Dispatch<SetStateAction<Record<string, PromoTerms | null>>>;
  t: (key: any, options?: any) => string;
}

export function usePromoCode(params: UsePromoCodeParams) {
  const {
    activeTableOrder,
    selectedTable,
    draftSubtotal,
    activeSubtotal,
    isOfflineMode,
    serviceFeePercent,
    ordersRef,
    getAuthHeaders,
    getActiveCafeId,
    readSyncQueue,
    flushNow,
    setOrders,
    persistOrders,
    setTableDraftPromos,
    t,
  } = params;

  /**
   * Promo-kodni stolning ochiq buyurtmasiga yoki tasdiqlanmagan savatiga
   * qo'llaydi, bo'sh kod bilan esa olib tashlaydi.
   *
   * Faqat onlayn: kodning yaroqliligi va hisoblagichi serverda. Navbatga
   * qo'yilsa, kassir mijozga chegirmali summani aytib bo'lgach server kodni
   * rad etishi mumkin edi. Summalar mahalliy taomlardan qayta hisoblanadi —
   * hali serverga yetmagan taom ham chekda qolsin.
   */
  const handleApplyPromo = useCallback(async (code: string): Promise<string | null> => {
    const order = activeTableOrder;
    if (!order) {
      if (!code.trim()) {
        setTableDraftPromos((prev) => {
          if (!prev[selectedTable]) return prev;
          const copy = { ...prev };
          delete copy[selectedTable];
          return copy;
        });
        return null;
      }
      if (isOfflineMode) return t('promo.offline');
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/promos/validate`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ code: code.trim(), subtotal: draftSubtotal }),
        });
        const body: any = await res.json().catch(() => null);
        if (!res.ok) return body?.error || t('promo.failed');

        const promo = parsePromoTerms(body);
        if (!promo) return t('promo.failed');

        setTableDraftPromos((prev) => ({
          ...prev,
          [selectedTable]: promo,
        }));
        return null;
      } catch {
        return t('promo.offline');
      }
    }
    if (isOfflineMode) return t('promo.offline');
    /*
     * Chekning navbatdagi amallari AVVAL yuboriladi (2026-10-16): Wi-Fi
     * qaytgan zahoti chek hali serverda bo'lmasligi mumkin va promo uni quvib
     * o'tib 404 olardi. Navbatga esa promo qo'yilmaydi (yuqoridagi sabab) —
     * chek yetib bormagan bo'lsa, kassir "internet kerak" deb biladi.
     */
    await flushNow();
    if (unsyncedOrderIds(readSyncQueue(getActiveCafeId()), []).has(order.id)) return t('promo.offline');
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ promoCode: code }),
      });
      const body: any = await res.json().catch(() => null);
      if (!res.ok) return body?.error || t('promo.failed');

      const promo = parsePromoTerms(body?.promo);
      const totals = orderTotals(activeSubtotal, serviceFeePercent, promo);
      const updated = ordersRef.current.map((o) => (o.id === order.id
        ? { ...o, promo, subtotal: activeSubtotal, serviceFee: totals.serviceFee, discount: totals.discount, total: totals.total }
        : o));
      ordersRef.current = updated;
      setOrders(updated);
      persistOrders(updated);
      return null;
    } catch {
      return t('promo.offline');
    }
  }, [activeTableOrder, selectedTable, draftSubtotal, isOfflineMode, getAuthHeaders, getActiveCafeId, readSyncQueue, flushNow, activeSubtotal, serviceFeePercent, ordersRef, setOrders, persistOrders, setTableDraftPromos, t]);

  return { handleApplyPromo };
}
