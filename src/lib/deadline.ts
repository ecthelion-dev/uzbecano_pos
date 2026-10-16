/**
 * Natijani ko'pi bilan `ms` kutadi; vaqt tugasa `fallback` qaytadi, ish esa
 * fonda davom etaveradi (bekor qilinmaydi).
 *
 * `flushNow` uchun (2026-10-16): yozuvlar navbat orqali ketadigan bo'lgach,
 * "yarim internet"da navbatdagi har bir chek o'z 8 soniyasini kutadi — beshta
 * chek bo'lsa kassir yarim daqiqa turardi. Avvalgi to'g'ridan-to'g'ri so'rov
 * ko'pi bilan 8 soniya kutardi; kassir uchun shu chegara saqlanadi.
 */
export function withDeadline<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
