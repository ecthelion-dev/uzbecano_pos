/**
 * Kunlik tartib raqami.
 *
 * Oshxona kvitansiyasiga "Buyurtma № 7" deb yoziladi: oshpaz bilan ofitsiant
 * bir-birini shu raqam bilan tushunadi, va u har kuni birdan boshlanadi —
 * kun oxirida "bugun 84 ta buyurtma bo'libdi" degani ham shundan ko'rinadi.
 *
 * Raqam KASSANING O'ZIDA beriladi, serverdan emas. Kassa internetsiz ham
 * ishlashi shart, server esa buyurtmani ancha keyin ko'rishi mumkin. Buning
 * narxi shu: bitta kafeda ikkita kassa turgan bo'lsa, ikkalasi ham o'z
 * hisobini yuritadi va raqamlar takrorlanadi. Kvitansiya bir necha daqiqa
 * yashaydigan qog'oz bo'lgani uchun bu yo'l qo'yilgan; hisob-kitobda esa
 * chekning o'z raqami ishlatiladi, bu emas.
 */

import { readCafeJson, writeCafeJson } from './storage';

/** Kalendar kuni — soat mintaqasi kassanikidan olinadi. */
function today(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface DailyCount {
  day?: string;
  n?: number;
}

/**
 * Navbatdagi raqamni beradi va uni saqlaydi.
 *
 * Kun almashgan bo'lsa hisob 1 dan boshlanadi. Xotira ishlamasa (shaxsiy
 * rejim, to'lgan disk) raqam berilaveradi — buyurtma raqamsiz qolgandan
 * ko'ra takrorlangani yaxshi.
 */
export function nextDailyNumber(cafeId: string, now: Date = new Date()): number {
  const day = today(now);
  const last = readCafeJson<DailyCount>(cafeId, 'kitchen_seq', {});
  const n = last.day === day && Number.isFinite(Number(last.n)) ? Number(last.n) + 1 : 1;
  writeCafeJson(cafeId, 'kitchen_seq', { day, n });
  return n;
}

/** Hozirgi holat — raqam bermasdan. Hisobot va testlar uchun. */
export function peekDailyNumber(cafeId: string, now: Date = new Date()): number {
  const last = readCafeJson<DailyCount>(cafeId, 'kitchen_seq', {});
  return last.day === today(now) ? Number(last.n) || 0 : 0;
}
