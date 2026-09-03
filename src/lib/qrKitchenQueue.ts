/**
 * QR menyudan kelgan buyurtmalardan qaysi biri oshxonaga chop etilishi.
 *
 * Qaror alohida turadi, chunki uni buzish jim kechadi: kassir hech narsa
 * ko'rmaydi, oshxona esa yo buyurtmani olmaydi, yo bitta buyurtmani ikki
 * marta oladi. Effekt ichida yozilsa buni faqat qog'ozdan bilib bo'lardi.
 */

/** Qarorga yetadigan minimal buyurtma. */
export interface QrQueueOrder {
  id: string;
  /** Serverdan: `'qr'` — mijoz telefonidan, `'pos'` — kassa yoki panel. */
  source?: string;
  status?: string;
}

export interface QrQueueDecision {
  /** Chop etilishi kerak buyurtma id si; yo'q bo'lsa `null`. */
  print: string | null;
  /** Xotiraga yoziladigan yangi ro'yxat; o'zgarish bo'lmasa `null`. */
  save: string[] | null;
}

/**
 * @param orders  kassa hozir ko'rib turgan buyurtmalar (faol + tarix).
 * @param printed xotiradagi ro'yxat; `null` — hali hech qachon yozilmagan.
 */
export function nextQrSlip(
  orders: QrQueueOrder[],
  printed: string[] | null,
): QrQueueDecision {
  const pending = orders.filter((o) => o.source === 'qr' && o.status !== 'served');

  // Birinchi ishga tushish: ro'yxat umuman yo'q. Hozirgi buyurtmalar chop
  // etilgan deb belgilanadi — aks holda yangilanish o'rnatilgan zahoti kassa
  // zaldagi hamma ochiq QR buyurtmani birdaniga qog'ozga tushirardi.
  if (printed === null) {
    return { print: null, save: pending.map((o) => o.id) };
  }

  const done = new Set(printed);
  const next = pending.find((o) => !done.has(o.id));
  if (!next) return { print: null, save: null };

  // Belgi chop etishdan OLDIN qo'yiladi. Printerda qog'oz tugagan bo'lsa
  // kvitansiya yo'qoladi — lekin belgi chop etilgandan keyin qo'yilsa,
  // nosoz printer bitta buyurtmani cheksiz qayta chiqaraverardi.
  done.add(next.id);

  // Ro'yxat cheksiz o'smasin: kassa endi ko'rmaydigan buyurtma tashlanadi.
  // Yopilgan buyurtma faol ro'yxatga qaytmaydi, ya'ni u qayta chop etilmaydi.
  const live = new Set(orders.map((o) => o.id));
  return { print: next.id, save: Array.from(done).filter((id) => live.has(id)) };
}
