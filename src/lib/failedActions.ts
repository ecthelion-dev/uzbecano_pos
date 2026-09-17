import type { QueuedItem } from './syncCycle';
import type { CartItem, DBProduct } from '../types';

/**
 * Server rad etgan amal — kim qildi, nega o'tmadi, qachon.
 *
 * 2026-09-16 kechqurun `Bar 2` stolidagi chekka ikki marta o'zgartirish
 * yuborildi, server ikkalasini ham 400 bilan rad etdi. Kassada esa faqat
 * olti soniyalik xabar chiqdi va kichkina "2 xato" belgisi qoldi: nima
 * rad etilgani ham, nega rad etilgani ham hech qayerda yozilmagan edi.
 *
 * Buning oqibati texnik emas, insoniy: o'zgartirishni kiritgan xodim uni
 * o'tdi deb biladi, boshqasi boshqa holatni ko'radi, va tortishuv boshlanadi.
 * Shuning uchun rad etilgan har bir yozuv endi shu uch savolga javob beradi
 * va odam ko'rib "tushunarli" demaguncha yo'qolmaydi.
 */

/** Sabab matni cheksiz o'smasin — diskda ham, ekranda ham. */
const MAX_REASON_LENGTH = 300;

export type FailedAction = QueuedItem & {
  rejectedAt: number;
  rejectedStatus: number;
  rejectedReason: string;
  /** Xodim "Tushunarli" degan payt. Yozuv o'chmaydi — `acknowledge`. */
  acknowledgedAt?: number;
};

function clamp(text: string): string {
  return text.length > MAX_REASON_LENGTH ? `${text.slice(0, MAX_REASON_LENGTH - 1)}…` : text;
}

/**
 * Javob tanasidan odam o'qiydigan sababni ajratadi.
 *
 * Server xatolarni `{"error": "..."}` ko'rinishida qaytaradi, lekin nginx
 * yoki proksi oddiy matn ham qaytarishi mumkin. Hech narsa bo'lmasa holat
 * kodining o'zi aytiladi — "noma'lum xato" dan ko'ra foydaliroq.
 */
export function extractReason(raw: string | null | undefined, status: number): string {
  const text = typeof raw === 'string' ? raw.trim() : '';

  if (text) {
    try {
      const parsed = JSON.parse(text);
      const message = parsed?.error ?? parsed?.message;
      if (typeof message === 'string' && message.trim()) return clamp(message.trim());
    } catch {
      // JSON emas — matnning o'zi ham javob.
      return clamp(text);
    }
  }

  return `Server rad etdi (${status})`;
}

/**
 * Rad etilgan amalga sabab, vaqt va holat kodini biriktiradi.
 *
 * Asl amal BUTUNLAY saqlanadi: bu pul va uni qayta tiklash kerak bo'lishi
 * mumkin, ya'ni tanasini qisqartirib bo'lmaydi.
 */
export function stampRejection(
  item: QueuedItem,
  status: number,
  reason: string,
  now: number,
): FailedAction {
  return { ...item, rejectedAt: now, rejectedStatus: status, rejectedReason: reason };
}

/**
 * Amalni kim navbatga qo'shgan.
 *
 * Eski versiyalarda yozilmagan — o'shanda `null`, chunki "noma'lum" deb
 * ko'rsatish yolg'on ism qo'yishdan afzal.
 */
export function actorOf(item: unknown): string | null {
  const actor = (item as { actor?: unknown } | null)?.actor;
  if (typeof actor !== 'string') return null;
  const clean = actor.trim();
  return clean ? clean : null;
}

/**
 * Xodim ko'rib "Tushunarli" dedi — yozuv belgilanadi, lekin O'CHIRILMAYDI.
 *
 * Ilgari u ro'yxatdan chiqarilardi. Rad etilgan buyurtma yaratish bo'lsa,
 * keyingi tarix yangilanishida mahalliy chek ham o'chib ketardi
 * (`orderMerge.ts` faqat navbatda yoki shu ro'yxatda turgan chekni
 * saqlaydi): pul olingan, chek bosilgan — va hech qayerda yozuv qolmasdi.
 *
 * Belgi va ro'yxat endi faqat ko'rilmaganlarni ko'rsatadi (`awaitingReview`),
 * yozuvning o'zi esa chekni kassada ushlab turadi.
 *
 * Faqat nomi bo'yicha: nomsiz eski yozuv tasodifan belgilanmasin.
 */
export function acknowledge(list: FailedAction[], qid: string, now: number = Date.now()): FailedAction[] {
  if (!Array.isArray(list)) return [];
  if (!qid) return [...list];
  return list.map((item) => (item?.qid === qid ? { ...item, acknowledgedAt: now } : item));
}

/** Xodim hali ko'rmagan rad etishlar — belgi soni va ro'yxat shundan. */
export function awaitingReview(list: FailedAction[]): FailedAction[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && !item.acknowledgedAt);
}

/**
 * Yozuvni butunlay olib tashlaydi — faqat amal qaytadan bajarilganda
 * ("savatga qaytarish"). Oddiy "Tushunarli" uchun `acknowledge`.
 */
export function discard(list: FailedAction[], qid: string): FailedAction[] {
  if (!Array.isArray(list)) return [];
  if (!qid) return [...list];
  return list.filter((item) => item?.qid !== qid);
}

/**
 * Rad etilgan amalni navbatga qaytaradi.
 *
 * Rad etish belgilari olib tashlanadi va yozuv navbat oxiriga qo'shiladi.
 */
export function retryFailedAction(
  queue: QueuedItem[],
  failed: FailedAction[],
  qid: string,
): { nextQueue: QueuedItem[]; nextFailed: FailedAction[] } {
  if (!Array.isArray(failed)) return { nextQueue: queue || [], nextFailed: [] };
  const target = failed.find((item) => item?.qid === qid);
  if (!target) return { nextQueue: queue || [], nextFailed: [...failed] };

  const { rejectedAt: _a, rejectedStatus: _s, rejectedReason: _r, acknowledgedAt: _k, ...cleanItem } = target;
  const nextQueue = [...(Array.isArray(queue) ? queue : []), { ...cleanItem, queuedAt: Date.now() }];
  const nextFailed = failed.filter((item) => item?.qid !== qid);
  return { nextQueue, nextFailed };
}

/**
 * Barcha rad etilgan amallarni navbatga qaytaradi.
 */
export function retryAllFailedActions(
  queue: QueuedItem[],
  failed: FailedAction[],
): { nextQueue: QueuedItem[]; nextFailed: FailedAction[] } {
  if (!Array.isArray(failed) || failed.length === 0) {
    return { nextQueue: queue || [], nextFailed: [] };
  }

  const restored: QueuedItem[] = failed.map((item) => {
    const { rejectedAt: _a, rejectedStatus: _s, rejectedReason: _r, acknowledgedAt: _k, ...cleanItem } = item;
    return { ...cleanItem, queuedAt: Date.now() };
  });

  return {
    nextQueue: [...(Array.isArray(queue) ? queue : []), ...restored],
    nextFailed: [],
  };
}

export interface ExtractedActionItem {
  productId?: string;
  name: string;
  quantity: number;
  price?: number;
  note?: string;
  variant?: string;
}

/**
 * Amal ichidagi taomlar ro'yxatini ajratib oladi (agar mavjud bo'lsa).
 */
export function extractActionItems(item: FailedAction): ExtractedActionItem[] {
  let raw: unknown = null;
  if (item.kind === 'create') {
    raw = item.order?.items;
  } else if (item.kind === 'patch') {
    // Taom qo'shish faqat yangi taomlarni `addItems` da yuboradi.
    raw = item.body?.addItems ?? item.body?.items;
  }
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((i) => i && typeof i === 'object' && typeof (i as any).name === 'string')
    .map((i: any) => ({
      productId: typeof i.productId === 'string' ? i.productId : undefined,
      name: String(i.name),
      quantity: Math.max(1, Number(i.quantity) || 1),
      price: Number(i.price) || 0,
      note: typeof i.note === 'string' ? i.note : undefined,
      variant: typeof i.selectedSize?.label === 'string' ? i.selectedSize.label : typeof i.variant === 'string' ? i.variant : undefined,
    }));
}

/**
 * Amal tegishli bo'lgan stol raqamini aniqlaydi.
 */
export function tableNumberOfAction(item: FailedAction): string | null {
  if (item.kind === 'create') {
    return item.order?.tableNumber ? String(item.order.tableNumber) : null;
  }
  if (item.kind === 'patch') {
    if (item.body?.tableNumber) return String(item.body.tableNumber);
    if (item.label && !item.label.includes('—') && item.label.length <= 15) {
      return item.label;
    }
  }
  return null;
}

/**
 * Rad etilgan amal ichidagi taomlarni savat qatorlariga aylantiradi.
 */
export function failedActionToCartItems(item: FailedAction, products: DBProduct[]): CartItem[] {
  const actionItems = extractActionItems(item);
  if (actionItems.length === 0) return [];

  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

  const cart: CartItem[] = [];
  actionItems.forEach((ai, idx) => {
    const product =
      (ai.productId ? byId.get(ai.productId) : undefined) ||
      byName.get(ai.name.trim().toLowerCase()) || {
        id: ai.productId || `custom_${Date.now()}_${idx}`,
        name: ai.name,
        price: ai.price || 0,
        category: 'Boshqa',
        isAvailable: true,
      };

    const variant = ai.variant ? product.variants?.find((v) => v.name === ai.variant) : undefined;
    const basePrice = variant ? variant.price : product.price;

    cart.push({
      lineId: `line_restored_${Date.now()}_${idx}`,
      product: {
        ...product,
        name: variant ? `${product.name} (${variant.name})` : product.name,
        price: basePrice,
      },
      quantity: ai.quantity,
      ...(ai.note ? { note: ai.note } : {}),
      ...(variant ? { selectedVariant: variant } : {}),
    });
  });

  return cart;
}
