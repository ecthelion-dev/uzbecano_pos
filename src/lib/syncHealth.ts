/**
 * Navbatda nima qolganini bitta javobga aylantirish.
 *
 * 2026-09-10 dagi yo'qotishdan keyin navbat endi hech narsani o'chirmaydi.
 * Lekin bu yetarli emas: yuborilmagan buyurtma diskda yotsa ham, kun oxirida
 * pul sanalganda uni hech kim hisobga olmaydi. O'sha kuni ham xato kechqurun
 * emas, ertasiga sezildi.
 *
 * Shuning uchun smena hisoboti shu yerdagi javobga qaraydi: navbatda birorta
 * amal qolgan bo'lsa, hisobot TO'LIQ EMAS deb belgilanadi va bu qog'ozga ham
 * chiqadi. Kassir raqamni ishonib yozib qo'yishidan oldin ko'radi.
 */

export interface SyncBacklog {
  /** Yuborilishini kutayotgan amallar. */
  pending: number;
  /** Server rad etgan va chetga qo'yilgan amallar. */
  failed: number;
  /** Eng eski kutayotgan amal navbatga qachon tushgani (ms). */
  oldestQueuedAt?: number | null;
}

export interface SyncVerdict {
  /** Serverga yetib bormagan amallar soni. */
  total: number;
  /** Hisobot to'liq emas — raqamga ishonib bo'lmaydi. */
  incomplete: boolean;
  /**
   * Navbat shunchaki sekin emas, tiqilib qolgan.
   *
   * Bir-ikki daqiqa kutish odatiy hol: internet uzilib-ulanib turadi.
   * Yarim soat kutish esa boshqa narsa — kimdir aralashishi kerak.
   */
  stuck: boolean;
  /** Eng eski amal necha daqiqadan beri kutyapti. */
  waitingMinutes: number;
}

/** Shundan uzoq kutgan navbat o'zi tuzalishiga ishonib bo'lmaydi. */
export const STUCK_AFTER_MS = 15 * 60 * 1000;

export function summariseBacklog(backlog: SyncBacklog, now: number): SyncVerdict {
  const pending = Math.max(0, Math.trunc(Number(backlog?.pending) || 0));
  const failed = Math.max(0, Math.trunc(Number(backlog?.failed) || 0));
  const total = pending + failed;

  const queuedAt = Number(backlog?.oldestQueuedAt);
  const hasAge = pending > 0 && Number.isFinite(queuedAt) && queuedAt > 0 && queuedAt <= now;
  const waitedMs = hasAge ? now - queuedAt : 0;

  return {
    total,
    incomplete: total > 0,
    /*
     * Rad etilgan amal darhol "tiqilib qolgan" hisoblanadi: u o'zi
     * ketmaydi, kimdir sababini tuzatishi kerak. Kutayotgani esa vaqtga
     * qarab.
     */
    stuck: failed > 0 || waitedMs >= STUCK_AFTER_MS,
    waitingMinutes: Math.floor(waitedMs / 60000),
  };
}

/** Navbatdagi eng eski yozuvning vaqti. Vaqtsiz eski yozuvlar hisobga olinmaydi. */
export function oldestQueuedAt(queue: readonly { queuedAt?: number }[]): number | null {
  let oldest: number | null = null;
  for (const item of queue || []) {
    const at = Number(item?.queuedAt);
    if (!Number.isFinite(at) || at <= 0) continue;
    if (oldest === null || at < oldest) oldest = at;
  }
  return oldest;
}
