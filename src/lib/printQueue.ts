/**
 * Chop etish navbati — telefon so'raydi, printer ulangan kassa bajaradi.
 *
 * Ofitsiantning telefonidagi PWA kassadagi termal printerga TEGA OLMAYDI:
 * brauzer na tizim printerini, na xom TCP ulanishini beradi, va sahifa HTTPS
 * bo'lgani uchun mahalliy tarmoqdagi printerga ham ulanolmaydi. Ilgari chop
 * etish telefonning o'z print oynasini ochardi — hech kimga kerak bo'lmagan
 * qog'oz.
 *
 * Shuning uchun telefon "shu chekni bos" deb serverga yozadi, desktop kassa
 * esa navbatni o'qib chop etadi.
 */

import { API_BASE_URL } from '../constants';

export type PrintJobKind = 'receipt' | 'kitchen';

export interface PrintJob {
  id: string;
  kind: PrintJobKind;
  orderId: string;
  requestedBy?: string | null;
  /** Oshxona kvitansiyasi uchun — o'sha safar qo'shilgan taomlar, JSON matn. */
  payload?: string | null;
  order: any | null;
}

const URL_PATH = '/api/print-jobs';

/**
 * Navbatga yozishning eng uzun kutish vaqti.
 *
 * Chek chop etish — kassir tugmani bosib turgan payt, ya'ni bu so'rov
 * interaktiv. Internet uzilganda `fetch` doim darhol yiqilmaydi: Wi-Fi
 * ulangan, lekin tashqariga chiqmaydigan tarmoqda (kafedagi eng ko'p
 * uchraydigan holat) so'rov o'ttiz soniyagacha osilib turishi mumkin.
 * Chaqiruvchi esa javobni KUTIB turadi va shu vaqt ichida printerga
 * o'tmaydi — chek chiqmaydi.
 */
const ENQUEUE_TIMEOUT_MS = 4000;

/**
 * Brauzer "tarmoq yo'q" desa, so'rov ham yubormaymiz.
 *
 * `navigator.onLine === false` xatolashmaydi: u faqat "aniq ulanish yo'q"
 * deganda `false` bo'ladi. Teskarisi (`true` bo'lib turib internet yo'q)
 * ko'p uchraydi — o'sha holatni yuqoridagi kutish vaqti hal qiladi.
 */
function offlineForSure(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Bir vaqtda bitta topshiriq ustida ishlanadi.
 *
 * Server topshiriqni "bosildi" deb belgilaganda navbatdan chiqadi, lekin
 * belgilash yetib borguncha keyingi so'rov o'sha topshiriqni yana berishi
 * mumkin — va oshxonaga ikkinchi qog'oz chiqardi.
 */
const inFlight = new Set<string>();

export function isInFlight(id: string): boolean {
  return inFlight.has(id);
}

/** Navbatga yozadi. `true` — server qabul qildi. */
export async function enqueuePrintJob(
  headers: Record<string, string>,
  orderId: string,
  kind: PrintJobKind,
  payload?: unknown,
): Promise<boolean> {
  if (!orderId) return false;
  if (offlineForSure()) return false;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ENQUEUE_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${URL_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId, kind, ...(payload === undefined ? {} : { payload }) }),
      signal: abort.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Kutayotgan topshiriqlarni oladi. Xato bo'lsa bo'sh ro'yxat. */
export async function fetchPrintJobs(
  headers: Record<string, string>,
): Promise<PrintJob[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${URL_PATH}`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((j) => !inFlight.has(j?.id)) : [];
  } catch {
    return [];
  }
}

/**
 * Topshiriqni yopadi.
 *
 * `claim` chop etishdan OLDIN chaqiriladi va topshiriqni mahalliy ravishda
 * band qiladi: aks holda 5 soniyalik keyingi so'rov o'sha topshiriqni yana
 * olib, ikkinchi qog'ozni chiqarardi.
 */
export function claimPrintJob(id: string): boolean {
  if (inFlight.has(id)) return false;
  inFlight.add(id);
  return true;
}

export async function closePrintJob(
  headers: Record<string, string>,
  id: string,
  ok: boolean,
  error?: string | null,
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}${URL_PATH}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ id, ok, error: error ?? null }),
    });
  } catch {
    // Yopib bo'lmadi. Server 15 daqiqadan keyin uni baribir bermaydi,
    // ya'ni eng yomon holat — bitta ortiqcha qog'oz, yo'qolgan chek emas.
  } finally {
    inFlight.delete(id);
  }
}

/** Testlar uchun. */
export function resetPrintQueue(): void {
  inFlight.clear();
}
