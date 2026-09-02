import { DBWaiter } from '../types';
import { cafeKey, readJson, writeJson, removeKey } from './storage';

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

/** Eski versiyalar diskda qoldirgan ochiq tokenlar va sessiyalar. */
const LEGACY_KEYS = ['_current_waiter', '_auth_token'];

/**
 * Yangilanishdan oldingi ilova localStorage ga yozib ketgan tokenni o'chiradi.
 * Bu bir martalik tozalash: aks holda tuzatilgan kamchilik eski qurilmalarda
 * diskda qolib ketaveradi.
 */
export function purgeLegacySession(cafeId: string): void {
  for (const suffix of LEGACY_KEYS) {
    removeKey(`orderplus_${cafeId}${suffix}`);
  }
}

export function readSession(cafeId: string): StoredSession | null {
  const parsed = readJson<any>(cafeKey(cafeId, 'session'), null, 'session');
  if (!parsed || !parsed.waiter) return null;
  return { waiter: parsed.waiter as DBWaiter, token: parsed.token ?? null };
}

export function writeSession(cafeId: string, waiter: DBWaiter, token: string | null): void {
  // sessionStorage yopiq bo'lsa sessiya faqat xotirada qoladi.
  writeJson(cafeKey(cafeId, 'session'), { waiter, token }, 'session');
}

export function clearSession(cafeId: string): void {
  removeKey(cafeKey(cafeId, 'session'), 'session');
  purgeLegacySession(cafeId);
}
