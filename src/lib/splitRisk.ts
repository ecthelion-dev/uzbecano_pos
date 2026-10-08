/**
 * Bir stol ikki joyda ochilib qolish xavfi.
 *
 * Insident (2026-10-08): kafe interneti 1 soat 47 daqiqa uzildi. Kassa
 * oflayn ishladi, telefonlar mobil internet bilan serverda ishladi va ikkalasi
 * Terassa 1 ni ochdi. Tiklanganda server kassaning chekini "stolda ochiq
 * buyurtma bor" deb rad etdi va taomlar ikki joyda qoldi.
 *
 * Ikki tomon bir-birini ko'rmaydi, shuning uchun to'liq oldini olib
 * bo'lmaydi (buning yechimi — kassani kafe ichidagi markazga aylantirish).
 * Hozircha har bir qurilma xavf borligini BILADI va xodimga aytadi:
 *   - `selfOffline` — shu qurilmaning o'zi oflayn: boshqalar ochgan stollar
 *                     bu yerda ko'rinmaydi.
 *   - `tillOffline` — telefon onlayn, lekin server kassa jim qolganini
 *                     aytyapti: kassada ochilgan stollar telefonda ko'rinmaydi.
 */

export type TillStatus = 'online' | 'offline' | 'none';
export type SplitRisk = 'none' | 'selfOffline' | 'tillOffline';

/** Serverdan kelgan qiymat. Eski server yoki noma'lum qiymat — `none` (ogohlantirishsiz). */
export function parseTillStatus(value: unknown): TillStatus {
  return value === 'online' || value === 'offline' ? value : 'none';
}

export function splitTableRisk(input: {
  isDesktopApp: boolean;
  isOffline: boolean;
  tillStatus: TillStatus;
}): SplitRisk {
  if (input.isOffline) return 'selfOffline';
  // Desktop kassaning o'zi "kassa" — o'ziga o'zi "kassa uzilgan" demaydi.
  if (input.isDesktopApp) return 'none';
  return input.tillStatus === 'offline' ? 'tillOffline' : 'none';
}
