import { DBWaiter } from '../types';

/**
 * Kassaning tirik sessiyasi: kim kirgan va uning serverdagi tokeni.
 *
 * Ilgari ikkalasi ham localStorage da yotardi, ya'ni token diskda muddatsiz
 * qolar edi — kassa o'chirilgandan keyin ham, WebView2 ning Local Storage
 * faylini o'qigan har qanday odam uchun tayyor sessiya. Endi ular
 * sessionStorage da: sahifa yangilanishidan omon qoladi (kassir uchun hech
 * nima o'zgarmaydi), lekin ilova yopilishi bilan o'chadi.
 *
 * Bu 5 daqiqalik faolsizlik blokirovkasi bilan bir xil mantiq: kassa tark
 * etilgan bo'lsa, sessiya ham tugagan bo'lishi kerak. Ilova qayta ochilganda
 * xodim PIN kiritadi — aloqa bo'lmasa ham, oflayn kesh shu uchun bor.
 */

interface StoredSession {
  waiter: DBWaiter;
  token: string | null;
}

function key(cafeId: string) {
  return `orderplus_${cafeId}_session`;
}

/** Eski versiyalar diskda qoldirgan ochiq tokenlar va sessiyalar. */
const LEGACY_KEYS = ['_current_waiter', '_auth_token'];

/**
 * Yangilanishdan oldingi ilova localStorage ga yozib ketgan tokenni o'chiradi.
 * Bu bir martalik tozalash: aks holda tuzatilgan kamchilik eski qurilmalarda
 * diskda qolib ketaveradi.
 */
export function purgeLegacySession(cafeId: string): void {
  try {
    for (const suffix of LEGACY_KEYS) {
      localStorage.removeItem(`orderplus_${cafeId}${suffix}`);
    }
  } catch {
    /* ignore */
  }
}

export function readSession(cafeId: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(key(cafeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.waiter) return null;
    return { waiter: parsed.waiter as DBWaiter, token: parsed.token ?? null };
  } catch {
    return null;
  }
}

export function writeSession(cafeId: string, waiter: DBWaiter, token: string | null): void {
  try {
    sessionStorage.setItem(key(cafeId), JSON.stringify({ waiter, token }));
  } catch {
    /* sessionStorage yopiq bo'lsa sessiya faqat xotirada qoladi */
  }
}

export function clearSession(cafeId: string): void {
  try {
    sessionStorage.removeItem(key(cafeId));
  } catch {
    /* ignore */
  }
  purgeLegacySession(cafeId);
}
