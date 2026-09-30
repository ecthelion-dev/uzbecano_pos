/**
 * Kassaning "yurak urishi" ritmi — qanchalik tez-tez yangilanish so'raladi.
 *
 * Bu qoida ilgari `App.tsx` ichidagi effektda yashar edi, ya'ni tekshirib
 * bo'lmaydigan joyda. Uchta holat uni o'zgartirgani uchun u yerda qoldirish
 * xavfli: intervalni bilmasdan o'zgartirish server yukini oshiradi yoki
 * oshxonani kechiktiradi.
 */

/** Zalda ish bor (yoki chaqiruv kutilyapti) — tez ritm. */
export const ACTIVE_POLL_MS = 5_000;

/** Zal bo'sh — sekin ritm. */
export const IDLE_POLL_MS = 20_000;

export interface PollIntervalOptions {
  /** Desktop kassa (Tauri): telefondan so'ralgan chek shu yerda bosiladi. */
  isDesktopApp: boolean;
  /** Ochiq buyurtma yoki javob kutayotgan chaqiruv bor. */
  hasLiveWork: boolean;
  /** QR buyurtmani oshxonaga chiqarish yoqilgan. */
  watchingQr: boolean;
}

/**
 * So'rovlar orasidagi vaqt.
 *
 * Bo'sh zalda ritm sekinlashadi — server yukini kamaytirish uchun. Lekin QR
 * buyurtma aynan o'sha paytda keladi: zal bo'sh, kassir band emas, hech kim
 * ekranga qaramaydi. 20 soniya kutish oshxonani shuncha kechiktiradi,
 * shuning uchun QR kuzatuvi yoqilgan bo'lsa ritm doim tez.
 *
 * Desktop kassa ham sekinlashtirmaydi: telefonda so'ralgan chek shu yerda
 * bosiladi va uni 20 soniya kutdirish mumkin emas.
 */
export function pollIntervalMs(options: PollIntervalOptions): number {
  if (options.isDesktopApp || options.hasLiveWork || options.watchingQr) return ACTIVE_POLL_MS;
  return IDLE_POLL_MS;
}

export interface HiddenPollOptions {
  isDesktopApp: boolean;
  watchingQr: boolean;
}

/**
 * Oyna ko'rinmayotganda ham so'ralsinmi.
 *
 * Odatda yo'q: ekranga hech kim qaramayotgan bo'lsa yangilashning ma'nosi
 * yo'q. Ikki istisno bor va ikkalasi ham "kassir kirmaydigan" ish haqida:
 *
 *   - QR buyurtma: uni mehmon kiritadi, ya'ni kvitansiya o'zi chiqishi
 *     kerak. Ilova yig'ib qo'yilgan bo'lsa ham buyurtma oshxonaga yetishi
 *     shart.
 *   - Desktop kassa: telefondan so'ralgan chek kassirning ekranga qarab
 *     turishini kutmasligi kerak.
 */
export function shouldPollWhileHidden(options: HiddenPollOptions): boolean {
  return options.isDesktopApp || options.watchingQr;
}
