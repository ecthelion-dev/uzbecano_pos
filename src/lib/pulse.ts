import { API_BASE_URL } from '../constants';
import { fetchWithTimeout } from './net';
import type { PrintJob } from './printQueue';

/**
 * Kassa nima bo'lganini bitta so'rov bilan biladi.
 *
 * Ilgari har 5 soniyada uchta alohida so'rov ketardi: ochiq cheklar,
 * ofitsiant chaqiruvlari va chop etish navbati. Yuk zaldagi ishga emas,
 * ULANGAN QURILMALAR SONIGA bog'liq edi — bo'sh kafeda ham o'sha uchtasi
 * aylanib turardi.
 *
 * Endi bitta so'rov, va server javobga barmoq izini (`ETag`) qo'shadi.
 * Keyingi safar o'sha iz qaytariladi: hech nima o'zgarmagan bo'lsa server
 * 304 beradi — bo'sh tana, ma'lumot ham, uni yig'ish ishi ham yo'q.
 *
 * Iz shu modulda saqlanadi: chaqiruvchi uni yuritishi shart emas, va shu
 * bilan "izni yuborishni unutish" degan xato imkoni yo'q bo'ladi.
 */

export interface PulseData {
  orders: any[];
  waiterCalls: { id: string; tableNumber: string; createdAt: string }[];
  printJobs: PrintJob[];
}

export type PulseResult =
  /** Yangi ma'lumot keldi. */
  | { kind: 'fresh'; data: PulseData }
  /** Hech nima o'zgarmagan — kassadagi ma'lumot to'g'ri. */
  | { kind: 'same' }
  /** Serverga yetib bo'lmadi yoki u xato qaytardi. */
  | { kind: 'failed' }
  /**
   * Serverda bunday manzil yo'q — u hali eskisi.
   *
   * Kassa serverdan keyin yangilanadi, ya'ni oralig'ida yangi kassa eski
   * serverga uriladi. Buni oddiy xato deb hisoblasak, kassa o'sha vaqt
   * ichida buyurtmalarni umuman ko'rmay qolardi.
   */
  | { kind: 'unsupported' };

let lastEtag: string | null = null;

/** Kassa qayta ulanganda yoki kafe almashganda izni tashlaydi. */
export function resetPulse(): void {
  lastEtag = null;
}

/**
 * @param isConsumer Printer ulangan qurilmami. Faqat shunga chop etish
 * navbati beriladi va faqat shu qurilma "men ochiqman" deb belgilanadi —
 * telefon chekni baribir bosa olmaydi.
 */
export async function fetchPulse(
  headers: Record<string, string>,
  isConsumer: boolean,
): Promise<PulseResult> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/pulse${isConsumer ? '?consumer=1' : ''}`,
      {
        cache: 'no-store',
        headers: { ...headers, ...(lastEtag ? { 'If-None-Match': lastEtag } : {}) },
      },
    );

    if (res.status === 304) return { kind: 'same' };
    if (res.status === 404) return { kind: 'unsupported' };
    if (!res.ok) return { kind: 'failed' };

    const data = await res.json();
    if (!data || !Array.isArray(data.orders)) return { kind: 'failed' };

    // Iz FAQAT ma'lumot muvaffaqiyatli o'qilgandan keyin saqlanadi. Aks
    // holda yarim o'qilgan javobdan keyin kassa o'zini yangilangan deb
    // hisoblar va keyingi so'rovda 304 olib, ma'lumotsiz qolardi.
    lastEtag = res.headers.get('etag');

    return {
      kind: 'fresh',
      data: {
        orders: data.orders,
        waiterCalls: Array.isArray(data.waiterCalls) ? data.waiterCalls : [],
        printJobs: Array.isArray(data.printJobs) ? data.printJobs : [],
      },
    };
  } catch {
    return { kind: 'failed' };
  }
}
