import { isActiveOrder } from '../constants';

/**
 * Serverdan kelgan cheklar ro'yxatini mahalliy ro'yxat bilan birlashtirish.
 *
 * Bu qoidalar ilgari `App.tsx` ichida, ikkita ALOHIDA joyda yashardi va
 * ikkisi bir xil emas edi. `applyActiveOrders` yopilgan chekni himoya qilardi,
 * `fetchOrderHistory` esa yo'q — va aynan ikkinchisi smena hisoboti ochilgan
 * paytda ishga tushardi.
 *
 * Natijasi shunday edi: kassir stolni yopadi, naqd pulni oladi, chek chiqadi.
 * To'lov PATCH'i sekin internetda navbatga tushadi. Kun oxirida kassir
 * hisobotni ochadi, `fetchOrderHistory` serverdan o'sha chekning eskirgan
 * "oshxonaga yuborilgan" nusxasini oladi va mahalliy "yopilgan" nusxa
 * ustidan yozadi — diskka ham. Hisobot `served` cheklarni sanaydi, bu chek
 * ularning orasida yo'q. Pul yashikda bor, hisobotda yo'q.
 *
 * Shuning uchun qoida endi bitta joyda va test bilan qulflangan: pul va
 * chekka tegishli har bir qoida `lib/` da bo'ladi.
 */

/** Birlashtirish uchun kerak bo'lgan minimal shakl. */
export interface MergeableOrder {
  id: string;
  status?: string | null;
}

/** Navbatdagi yoki rad etilgan yozuv qaysi chekka tegishli. */
function ownedOrderId(entry: any): string | null {
  const id = entry?.kind === 'create' ? entry?.order?.id : entry?.orderId;
  return typeof id === 'string' && id ? id : null;
}

/**
 * Serverga hali yetib bormagan cheklarning id lari.
 *
 * IKKALA ro'yxat ham o'qiladi. `sync_failed` ni o'tkazib yuborish — pul
 * yo'qotadigan xato: server rad etgan yozuv navbatdan CHIQADI va o'sha
 * ro'yxatga ko'chadi, ya'ni faqat navbatga qaralsa chek egasiz qoladi va
 * serverda ham yo'qligi uchun ro'yxatdan butunlay o'chib ketadi.
 *
 * `kind: 'cash'` yozuvi hech qanday chekni ushlab turmaydi — u buyurtma
 * emas, kassadan olingan pul.
 */
export function unsyncedOrderIds(queue: unknown, failed: unknown): Set<string> {
  const ids = new Set<string>();
  for (const list of [queue, failed]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const id = ownedOrderId(entry);
      if (id) ids.add(id);
    }
  }
  return ids;
}

/**
 * Mahalliy nusxa serverning nusxasidan ustun turadimi.
 *
 * Faqat bitta holatda: mahalliy chek tugagan (`served`/`cancelled`), server
 * esa uni hali faol deb biladi. Bu har doim eskirgan javob — chekni yopish
 * qarorini shu kassa qabul qilgan va u hali serverga yetib bormagan.
 *
 * Teskarisi emas: server chekni yopgan bo'lsa, unda to'lov tafsilotlari va
 * kunlik raqami bor, ya'ni uning nusxasi to'liqroq.
 */
function keepsLocal(local: MergeableOrder | undefined, incoming: MergeableOrder): boolean {
  if (!local) return false;
  return !isActiveOrder(local.status) && isActiveOrder(incoming.status);
}

/** Ro'yxatni id bo'yicha xaritaga soladi. */
function byId<T extends MergeableOrder>(list: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const o of list) {
    if (o && typeof o.id === 'string') map.set(o.id, o);
  }
  return map;
}

/**
 * `active=1` javobi bilan birlashtirish.
 *
 * Javobda yopilgan cheklar UMUMAN yo'q, shuning uchun mahalliy ro'yxatdan
 * hech narsa o'chirilmaydi — aks holda har bir so'rov butun arxivni
 * ekrandan olib tashlardi.
 */
export function mergeActiveOrders<T extends MergeableOrder>(local: T[], incoming: T[]): T[] {
  const merged = byId(Array.isArray(local) ? local : []);
  if (!Array.isArray(incoming)) return [...merged.values()];

  for (const o of incoming) {
    if (!o || typeof o.id !== 'string') continue;
    if (keepsLocal(merged.get(o.id), o)) continue;
    merged.set(o.id, o);
  }
  return [...merged.values()];
}

/**
 * To'liq tarix javobi bilan birlashtirish.
 *
 * Bu javob ro'yxatning to'liq ko'rinishi, ya'ni unda yo'q chek odatda
 * rostdan ham yo'q — boshqa kassa o'chirgan bo'lishi mumkin. Istisno:
 * yozuvi hali navbatda yoki rad etilganlar orasida turgan chek. U faqat shu
 * qurilmada mavjud va uni o'chirish yuborilmagan pulni yo'qotish bo'lardi.
 */
export function mergeOrderHistory<T extends MergeableOrder>(
  local: T[],
  server: T[],
  unsyncedIds: Set<string>,
): T[] {
  const localList = Array.isArray(local) ? local : [];
  if (!Array.isArray(server)) return [...localList];

  const localById = byId(localList);
  const merged: T[] = [];

  for (const o of server) {
    if (!o || typeof o.id !== 'string') continue;
    const mine = localById.get(o.id);
    merged.push(keepsLocal(mine, o) ? (mine as T) : o);
  }

  const serverIds = new Set(merged.map((o) => o.id));
  for (const o of localList) {
    if (!o || serverIds.has(o.id)) continue;
    if (unsyncedIds.has(o.id)) merged.push(o);
  }

  return merged;
}
