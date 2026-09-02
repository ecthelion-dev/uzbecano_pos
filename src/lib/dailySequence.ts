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

/** Kalendar kuni — soat mintaqasi kassanikidan olinadi. */
function today(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function storageKey(cafeId: string): string {
  return `orderplus_${cafeId}_kitchen_seq`;
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
  const key = storageKey(cafeId);

  let last: { day?: string; n?: number } = {};
  try {
    const raw = localStorage.getItem(key);
    if (raw) last = JSON.parse(raw) || {};
  } catch {
    last = {};
  }

  const n = last.day === day && Number.isFinite(Number(last.n)) ? Number(last.n) + 1 : 1;
  try {
    localStorage.setItem(key, JSON.stringify({ day, n }));
  } catch {}
  return n;
}

/** Hozirgi holat — raqam bermasdan. Hisobot va testlar uchun. */
export function peekDailyNumber(cafeId: string, now: Date = new Date()): number {
  try {
    const raw = localStorage.getItem(storageKey(cafeId));
    if (!raw) return 0;
    const last = JSON.parse(raw);
    return last?.day === today(now) ? Number(last.n) || 0 : 0;
  } catch {
    return 0;
  }
}
