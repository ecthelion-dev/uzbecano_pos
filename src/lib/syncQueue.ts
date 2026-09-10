/**
 * Oflayn navbatdagi amal bilan nima qilish kerak.
 *
 * 2026-09-10 da uzbecano kafesida Wi-Fi uzildi. Kassir buyurtmalarni urib
 * ketdi, ular navbatga tushdi — shu yerigacha hammasi to'g'ri ishladi.
 * Aloqa tiklanganda esa navbat 401 oldi va TO'RTTA buyurtma o'chirib
 * yuborildi: kassa ularni "server printsipial rad etdi" deb hisobladi.
 *
 * 401 — rad etish emas. U "hozir kim ekaningni bilmayapman" degani.
 * Kassa sessiyasi `sessionStorage` da yashaydi, ya'ni ilova yopilishi bilan
 * o'chadi; navbat esa `localStorage` da qoladi. Ilova qayta ochilib, PIN
 * hali kiritilmagan paytda navbat urinsa — aynan shu holat chiqadi.
 * Bir necha soniyadan keyin kassir PIN kiritadi va o'sha so'rov muvaffaqiyatli
 * ketardi. Lekin ketadigan narsa qolmagan edi.
 *
 * Shuning uchun bu yerdagi qaror uchta, ikkita emas:
 *   - `retry`  — vaqtinchalik: tarmoq, 5xx, 429, 408 va 401. Navbatda qoladi.
 *   - `park`   — server rostdan ham rad etdi (400, 404, 409). Navbatdan
 *                chiqadi, lekin O'CHIRILMAYDI: alohida ro'yxatga tushadi,
 *                chunki bu pul va uni jimgina yo'qotib bo'lmaydi.
 *   - `done`   — qabul qilindi.
 *
 * Mantiq komponent ichida emas, shu yerda: 2026-09-06 dagi kelishuv bo'yicha
 * pul va chekka tegishli har bir qoida test bilan qulflanadi.
 */

export type SyncDecision = 'done' | 'retry' | 'park';

/**
 * Vaqtinchalik nosozliklar — keyinroq o'zi o'tadi.
 *
 * 401 shu ro'yxatda: sessiya tiklanishi mumkin. 403 esa yo'q — u
 * "huquqing yetmaydi" degani va qayta urinish uni o'zgartirmaydi.
 */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 408 || status === 401;
}

/** Javob kelgan holat uchun qaror. */
export function decideFromStatus(status: number): SyncDecision {
  if (status >= 200 && status < 300) return 'done';
  return isRetryableStatus(status) ? 'retry' : 'park';
}

/**
 * Tarmoq umuman javob bermadi (uzilish, timeout).
 *
 * Bu har doim `retry`: so'rov serverga yetib bormagan bo'lishi ham mumkin,
 * yetib borib javobi yo'qolgan bo'lishi ham. Ikkinchi holat uchun har bir
 * amalda `idempotencyKey` bor, ya'ni takror yuborish nusxa yaratmaydi.
 */
export const NETWORK_FAILURE: SyncDecision = 'retry';

/**
 * Sessiyasiz navbatni umuman urintirmaslik kerakmi.
 *
 * Tokensiz yuborilgan so'rov faqat 401 oladi. Uni yubormaslik serverni ham,
 * jurnalni ham tozaroq qoldiradi — va eng muhimi, hech qanday qarorni
 * noto'g'ri asosda qabul qildirmaydi.
 */
export function canSync(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.length > 0;
}
