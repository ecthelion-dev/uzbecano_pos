import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { API_BASE_URL } from '../constants';
import { cartToHoldLines, parseHoldItems } from '../lib/cartSync';
import { fetchWithTimeout } from '../lib/net';
import type { TableHold } from '../lib/floorPlan';
import type { CartItem, DBWaiter } from '../types';

export interface UseTableHoldsParams {
  /** Shu qurilmaning nomi — o'z belgisini boshqalarnikidan ajratish uchun. */
  deviceId: string;
  tableCarts: Record<string, CartItem[]>;
  setTableCarts: Dispatch<SetStateAction<Record<string, CartItem[]>>>;
  tableHolds: TableHold[];
  currentWaiter: DBWaiter | null;
  isOfflineMode: boolean;
  serviceFeePercent: number;
  getAuthHeaders: () => Record<string, string>;
}

/** Belgini serverga yozish/tekshirish davri. */
const REPORT_INTERVAL_MS = 45_000;

/**
 * Stollarning "kimdir yig'yapti" belgilari.
 *
 * Savat serverga chiqmaydi — u "Tasdiqlash" bosilgunga qadar shu
 * qurilmaning diskida turadi. Shuning uchun belgi kerak: usiz desktop
 * kassada band ko'ringan stol telefonda bo'sh turardi va ikki kishi bitta
 * stolga buyurtma yozib yuborishi mumkin edi.
 *
 * Ikki qism: belgini yozish (yuborish) va boshqa qurilmaning belgisini
 * qabul qilish (shu yerdagi nusxani tashlash). Ilgari ikkalasi ham App.tsx
 * ichida edi — bu yerda ular ajratilgan va sabablari yonida yozilgan.
 */
export function useTableHolds(params: UseTableHoldsParams) {
  const {
    deviceId,
    tableCarts,
    setTableCarts,
    tableHolds,
    currentWaiter,
    isOfflineMode,
    serviceFeePercent,
    getAuthHeaders,
  } = params;

  /*
   * Kassa qaysi stollarda buyurtma yig'ayotganini serverga aytadi.
   *
   * So'rov TO'LIQ ro'yxat yuboradi, o'zgarishni emas: shuning uchun stol
   * savatdan chiqqanda darhol bo'shaydi va "bo'shatishni unutish" degan
   * xato imkoni yo'q.
   *
   * Belgi serverda ikki daqiqada eskiradi, shuning uchun savat turgan
   * ekan, muntazam takrorlanadi — ilova yopilib qolsa stol o'zi bo'shaydi.
   */
  useEffect(() => {
    if (!currentWaiter || isOfflineMode) return;

    const open = Object.entries(tableCarts).filter(([, items]) => (items?.length ?? 0) > 0);
    const busy = open.map(([table]) => table);

    // Summani savat turgan qurilmaning O'ZI hisoblaydi: boshqa tomonda uni
    // taxmin qilib bo'lmaydi va "Jami: 0" bo'sh stoldek ko'rinardi.
    const totals: Record<string, number> = {};
    // Savatning o'zi ham ketadi: buyurtmani boshlagan xodim uni boshqa
    // qurilmadan ochib davom ettira olishi uchun.
    const items: Record<string, unknown[]> = {};
    for (const [table, cartItems] of open) {
      const sub = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      totals[table] = sub + Math.round((sub * serviceFeePercent) / 100);
      items[table] = cartToHoldLines(cartItems);
    }

    let cancelled = false;

    const report = async () => {
      try {
        await fetchWithTimeout(`${API_BASE_URL}/api/table-holds`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ deviceId, tables: busy, totals, items }),
        });
      } catch {
        // Yetib bormadi — belgi eskiradi va stol bo'shaydi. Bu savatning
        // o'ziga ta'sir qilmaydi: u shu qurilmada joyida turaveradi.
      }
    };

    void report();

    // Savat bo'sh bo'lsa takrorlashning hojati yo'q: bir marta yuborilgan
    // bo'sh ro'yxat serverdagi belgilarni allaqachon o'chirgan.
    if (busy.length === 0) return;

    const interval = setInterval(() => { if (!cancelled) void report(); }, REPORT_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tableCarts, currentWaiter, isOfflineMode, deviceId, getAuthHeaders, serviceFeePercent]);

  /*
   * Savat boshqa qurilmaga o'tgan bo'lsa, shu yerdagi nusxa tashlanadi.
   *
   * Stolni oxirgi ochgan qurilma egasi bo'ladi. Eski nusxa qolib ketsa
   * ikkita zarar bor: u belgi orqali serverga qaytadan yozilib, ikkinchi
   * qurilmada qo'shilgan taomni o'chirib yuborardi, va ikkalasidan ham
   * yuborilsa stolda ikkita ochiq chek paydo bo'lardi.
   *
   * Faqat serverdagi belgida SAVAT BOR bo'lsa tashlanadi: bo'sh belgi
   * uchun mahalliy savatni o'chirish uni yo'q qilish bo'lardi.
   */
  useEffect(() => {
    if (tableHolds.length === 0) return;

    setTableCarts((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const hold of tableHolds) {
        if (hold.deviceId === deviceId) continue;
        if (parseHoldItems(hold.items).length === 0) continue;

        const name = Object.keys(next).find(
          (table) => table.trim().toLowerCase() === (hold.tableNumber || '').trim().toLowerCase(),
        );
        if (!name || (next[name]?.length ?? 0) === 0) continue;

        delete next[name];
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [tableHolds, deviceId, setTableCarts]);
}
