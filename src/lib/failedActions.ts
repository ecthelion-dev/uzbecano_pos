import type { QueuedItem } from './syncCycle';

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
 * Xodim ko'rib "tushunarli" degan yozuvni ro'yxatdan chiqaradi.
 *
 * Faqat nomi bo'yicha: nomsiz eski yozuvni tasodifan o'chirib yubormaslik
 * uchun. Ularni ro'yxatdagi "hammasini tozalash" olib tashlaydi.
 */
export function acknowledge(list: FailedAction[], qid: string): FailedAction[] {
  if (!Array.isArray(list)) return [];
  if (!qid) return [...list];
  return list.filter((item) => item?.qid !== qid);
}
