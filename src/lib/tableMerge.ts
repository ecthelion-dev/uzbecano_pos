import { isActiveOrder } from '../constants';
import { appendItemsPatch, sentItemToOrderItem, type AppendItemsPatch } from './orderItems';
import type { QueuedItem } from './syncCycle';

/**
 * "Stol band" 409 ni avtomatik hal qilish rejasi.
 *
 * 2026-10-08: internet uzilganda kassa oflayn stol ochdi, telefon esa mobil
 * internet orqali o'sha stolni serverda ochdi. Aloqa tiklanganda server
 * kassaning chekini "stolda ochiq buyurtma bor" deb rad etdi va 5 ta chek
 * kassirning qo'liga tushdi: har birini "Savatga yuklash" bilan stoldagi
 * chekka qayta qo'shish kerak edi.
 *
 * Navbat endi xuddi shu ishni o'zi qiladi — taomlarni stoldagi ochiq chekka
 * `addItems` bilan qo'shadi. Lekin FAQAT pul masalasi bo'lmagan holatda:
 *
 *   - chek ochiq (to'lanmagan, bekor qilinmagan);
 *   - chegirma yo'q (promo ham, qo'lda ham) — qo'shish uni olib o'tolmaydi,
 *     ya'ni mijoz chegirmasiz qolardi;
 *   - chekning navbatdagi boshqa amallari faqat taom qo'shish. To'lov,
 *     o'chirish yoki ko'chirish bo'lsa, qaror kassirniki: kassa olgan pul
 *     stoldagi chekning summasiga to'g'ri kelmaydi.
 *
 * Qolgan hamma holat avvalgidek rad etilganlarga chiqadi.
 */

export interface TableMergePlan {
  /** Stoldagi serverdagi ochiq chek. */
  targetOrderId: string;
  patch: AppendItemsPatch;
}

/** Taom qo'shishdan boshqa hech narsa qilmaydigan PATCH tanasi. */
const APPEND_ONLY_KEYS = new Set(['addItems', 'appendKey', 'status']);

function isAppendOnly(item: QueuedItem): boolean {
  if (item.kind !== 'patch') return false;
  const body = item.body;
  if (!body || typeof body !== 'object' || !Array.isArray(body.addItems)) return false;
  return Object.keys(body).every((k) => APPEND_ONLY_KEYS.has(k));
}

function conflictOrderId(body: unknown): string | null {
  const id = (body as { conflict?: { orderId?: unknown } } | null)?.conflict?.orderId;
  return typeof id === 'string' && id.trim().length > 0 ? id : null;
}

function parseItems(raw: unknown): unknown[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasDiscount(order: { promo?: unknown; promoCode?: unknown; discount?: unknown }): boolean {
  return Boolean(order?.promo) || Boolean(order?.promoCode) || (Number(order?.discount) || 0) > 0;
}

/**
 * Rad etilgan yaratishni stoldagi chekka qo'shish mumkinmi.
 *
 * `null` — mumkin emas, chek avvalgidek kassirga chiqadi.
 * `queue` — navbatning shu siklda ko'rilgan holati: chekning keyingi
 * amallari shundan tekshiriladi.
 */
export function planTableMerge(
  item: QueuedItem,
  conflictBody: unknown,
  queue: readonly QueuedItem[],
): TableMergePlan | null {
  if (item.kind !== 'create') return null;
  const order = item.order;
  const localId = typeof order?.id === 'string' ? order.id : null;
  const targetOrderId = conflictOrderId(conflictBody);
  if (!localId || !targetOrderId || targetOrderId === localId) return null;

  if (!isActiveOrder(order.status) || order.paymentMethod) return null;
  if (hasDiscount(order)) return null;

  const items = parseItems(order.items).map(sentItemToOrderItem);
  if (items.length === 0) return null;

  const laterActions = queue.filter(
    (q) => q !== item && q.kind !== 'create' && q.kind !== 'cash' && q.orderId === localId,
  );
  if (!laterActions.every(isAppendOnly)) return null;

  // Kalit chekning o'zidan: tarmoq uzilib, keyingi siklda yana 409 kelsa,
  // server bu qo'shishni takror deb taniydi va taomni ikkilantirmaydi.
  const appendKey = `merge:${order.idempotencyKey || localId}`;
  return { targetOrderId, patch: appendItemsPatch(items, appendKey) };
}
