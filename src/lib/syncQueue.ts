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
 *   - `retry`  — vaqtinchalik: tarmoq, 5xx, 429, 408, 401 va 409. Navbatda
 *                qoladi.
 *   - `park`   — server rostdan ham rad etdi (400, 404). Navbatdan chiqadi,
 *                lekin O'CHIRILMAYDI: alohida ro'yxatga tushadi, chunki bu
 *                pul va uni jimgina yo'qotib bo'lmaydi.
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
 *
 * 409 ham shu yerda. Server uni chekni biz o'qigandan keyin boshqa qurilma
 * o'zgartirganda qaytaradi (optimistik qulf). Keyingi urinish chekni
 * QAYTADAN o'qiydi, ya'ni o'sha urinish o'tadi — bu rad etish emas,
 * "ma'lumoting eskirgan". Chetga qo'yish uni bekorga qo'lda ko'rib
 * chiqishga yuborardi.
 *
 * Eskirgan tanani qabul qilib bo'lmaydigan holat baribir e'tibordan
 * chetda qolmaydi: masalan to'lov summasi o'zgargan chekka mos kelmasa,
 * server 400 beradi va yozuv o'sha yerda chetga qo'yiladi.
 */
export function isRetryableStatus(status: number): boolean {
  return (
    status >= 500 || status === 429 || status === 408 || status === 401 || status === 409
  );
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

/**
 * Navbatdagi yozuvning o'z nomi.
 *
 * Usiz navbatni faqat butunlay almashtirish yo'li bilan yangilash mumkin
 * edi, va aynan shu yo'l 2026-09-16 da topilgan poygani tug'dirardi:
 * drenaj navbatni boshida o'qir, har bir yozuv uchun tarmoqni 8 soniyagacha
 * kutar, so'ng OXIRIDA eski nusxadan hisoblangan ro'yxatni diskka yozardi.
 * Wi-Fi o'lgan paytda drenaj 40 soniya ishlardi — va o'sha oraliqda urilgan
 * buyurtma yakuniy yozuv ostida qolib ketardi.
 *
 * Nom bo'lgach, yakunda butun navbat emas, faqat ISHLANGAN yozuvlar olib
 * tashlanadi. Oradagi yangi yozuv o'z joyida qoladi.
 */
export function newQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Nomi bor navbat yozuvi. */
export type Identified<T> = T & { qid: string };

/**
 * Navbatdagi har bir yozuvga nom qo'yadi.
 *
 * `changed` — diskka qaytarib yozish kerakmi. Eski versiyalardan qolgan
 * yozuvlar nomsiz keladi va ular AVVAL diskka nomi bilan yozilishi shart:
 * aks holda drenaj xotiradagi nomlar bo'yicha ishlab, diskdagi nomsiz
 * nusxadan hech narsani olib tashlay olmasdi va yozuvlar abadiy qayta
 * yuborilaverardi.
 *
 * Massiv bo'lmagan narsa `[]` ga aylantirilmaydi va `changed` `false`
 * qoladi: o'qib bo'lmagan narsani bo'sh ro'yxat bilan almashtirish —
 * yo'qotish.
 */
export function withQueueIds<T extends object>(
  raw: unknown,
): { queue: Identified<T>[]; changed: boolean } {
  if (!Array.isArray(raw)) return { queue: [], changed: false };

  let changed = false;
  const queue: Identified<T>[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      changed = true;
      continue;
    }
    const qid = (entry as { qid?: unknown }).qid;
    if (typeof qid === 'string' && qid) {
      queue.push(entry as Identified<T>);
      continue;
    }
    queue.push({ ...(entry as T), qid: newQueueId() });
    changed = true;
  }

  return { queue, changed };
}

/**
 * Faqat ishlangan yozuvlarni navbatdan chiqaradi.
 *
 * Nomsiz yozuv HECH QACHON o'chirilmaydi: uni ishlanganiga ishonch yo'q,
 * va bu yerda ikki marta yuborish (idempotencyKey buni zararsiz qiladi)
 * yo'qotishdan afzal.
 */
export function removeProcessed<T extends { qid?: string }>(
  current: T[],
  processedIds: Set<string>,
): T[] {
  if (!Array.isArray(current)) return [];
  return current.filter((item) => {
    const qid = item?.qid;
    return !(typeof qid === 'string' && processedIds.has(qid));
  });
}
