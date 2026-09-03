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
  /** Serverdagi yaratilish vaqti, ISO. */
  createdAt?: string;
}

export interface QrQueueState {
  /**
   * Kassa QR buyurtmalarni kuzata boshlagan payt, ISO.
   *
   * Bundan oldin berilgan buyurtmalar chop etilmaydi. Ilgari bu ish faqat
   * id ro'yxati bilan qilinardi va ishlamasdi: kassa ishga tushganda
   * buyurtmalar ro'yxati hali BO'SH bo'ladi, ya'ni "hozirgilarni belgilab
   * qo'yish" bo'sh ro'yxatni saqlardi — keyin esa zaldagi hamma ochiq QR
   * buyurtma birma-bir qog'ozga chiqib ketardi. Vaqt belgisi ro'yxat
   * yuklanishini kutmaydi.
   */
  since: string;
  /** Chop etilgan buyurtmalar. */
  ids: string[];
}

export interface QrQueueDecision {
  /** Chop etilishi kerak buyurtma id si; yo'q bo'lsa `null`. */
  print: string | null;
  /** Xotiraga yoziladigan yangi holat; o'zgarish bo'lmasa `null`. */
  save: QrQueueState | null;
}

/**
 * Xotiradagi qiymatni holatga keltiradi.
 *
 * Eski nusxalarda bu yerda oddiy id massivi turardi. U vaqt belgisisiz,
 * shuning uchun kuzatuv shu daqiqadan boshlanadi.
 */
function toState(stored: unknown, now: Date): QrQueueState | null {
  if (Array.isArray(stored)) {
    return { since: now.toISOString(), ids: stored.filter((x): x is string => typeof x === 'string') };
  }
  if (stored && typeof stored === 'object') {
    const s = stored as Partial<QrQueueState>;
    if (typeof s.since === 'string') {
      return { since: s.since, ids: Array.isArray(s.ids) ? s.ids : [] };
    }
  }
  return null;
}

/**
 * Buyurtma kuzatuv boshlangandan keyin berilganmi.
 *
 * Sanani o'qib bo'lmasa — chop etiladi. Ikkinchi nusxa qog'ozda ko'rinadi va
 * uni yirtib tashlash mumkin; chop etilmagan buyurtma esa hech kimga
 * bilinmaydi va mijoz kutib o'tiraveradi.
 */
function isNewer(createdAt: string | undefined, since: string): boolean {
  if (!createdAt) return true;
  const at = Date.parse(createdAt);
  const from = Date.parse(since);
  if (Number.isNaN(at) || Number.isNaN(from)) return true;
  return at > from;
}

/**
 * @param orders kassa hozir ko'rib turgan buyurtmalar (faol + tarix).
 * @param stored xotiradagi holat; `null` — hali hech qachon yozilmagan.
 */
export function nextQrSlip(
  orders: QrQueueOrder[],
  stored: unknown,
  now: Date = new Date(),
): QrQueueDecision {
  const state = toState(stored, now);

  // Birinchi ishga tushish: kuzatuv shu daqiqadan boshlanadi. Bundan oldingi
  // buyurtmalar allaqachon berilgan — yangilanish o'rnatilgan zahoti oshxona
  // bir dasta eski buyurtma olmasligi kerak.
  if (!state) {
    return { print: null, save: { since: now.toISOString(), ids: [] } };
  }

  const done = new Set(state.ids);
  const next = orders.find((o) =>
    o.source === 'qr' &&
    o.status !== 'served' &&
    !done.has(o.id) &&
    isNewer(o.createdAt, state.since),
  );

  // Eski massiv yangi ko'rinishga o'tkazilgan bo'lsa, chop etadigan narsa
  // bo'lmasa ham saqlanadi — aks holda har safar qaytadan o'tkazilaverardi.
  const migrated = Array.isArray(stored);
  if (!next) return { print: null, save: migrated ? state : null };

  // Belgi chop etishdan OLDIN qo'yiladi. Printerda qog'oz tugagan bo'lsa
  // kvitansiya yo'qoladi — lekin belgi chop etilgandan keyin qo'yilsa,
  // nosoz printer bitta buyurtmani cheksiz qayta chiqaraverardi.
  done.add(next.id);

  // Ro'yxat cheksiz o'smasin: kassa endi ko'rmaydigan buyurtma tashlanadi.
  // Yopilgan buyurtma faol ro'yxatga qaytmaydi, ya'ni qayta chop etilmaydi.
  const live = new Set(orders.map((o) => o.id));
  return {
    print: next.id,
    save: { since: state.since, ids: Array.from(done).filter((id) => live.has(id)) },
  };
}
