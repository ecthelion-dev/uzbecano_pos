/**
 * Vaqt — har doim 24 soatlik.
 *
 * `toLocaleTimeString` brauzerning tiliga qaraydi. "uz-UZ" ni bilmagan
 * brauzer (yoki ingliz tiliga sozlangan telefon) uni "en-US" ga tushiradi
 * va soat "3:04 PM" bo'lib chiqadi. Kassada bu jiddiy: kassir 15:04 bilan
 * 03:04 ni ajratishga vaqt sarflamasligi kerak.
 *
 * Shu sababdan hisob `Intl` ga emas, soatning o'ziga tayanadi: qanday til
 * qo'yilgan bo'lsa ham natija bir xil.
 */

function asDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const two = (n: number) => String(n).padStart(2, '0');

/** "15:04" */
export function formatClock(value: Date | string | number | null | undefined, fallback = ''): string {
  const d = asDate(value);
  if (!d) return fallback;
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** "07.09.2026 15:04" */
export function formatDateClock(value: Date | string | number | null | undefined, fallback = '—'): string {
  const d = asDate(value);
  if (!d) return fallback;
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()} ${formatClock(d)}`;
}

/**
 * Kiritilayotgan paytdagi ko'rinish — raqam bo'lmagan belgini yozdirmaydi.
 *
 * `normalizeTimeText` faqat maydondan chiqilganda (`onBlur`) ishlaydi, ya'ni
 * yozish paytida ekranda harflar ham, ortiqcha belgilar ham ko'rinaverardi
 * ("s324242" kabi) — chunki controlled input o'zi qabul qilgan qiymatni
 * qaytadan chizadi. Bu funksiya har bosilgan tugmada chaqiriladi: faqat
 * raqam qoladi, to'rttadan oshgani kesiladi, ikkinchisidan keyin ":" o'zi
 * qo'yiladi. Diapazonga (23/59) qisqartirish shu yerda emas — u faqat
 * `normalizeTimeText` da, maydon tugagach.
 */
export function maskTimeText(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Qo'lda yozilgan vaqtni "HH:MM" ga keltiradi.
 *
 * Brauzerning o'z `type="time"` maydoni AM/PM ni qurilma tiliga qarab
 * ko'rsatadi va uni o'zgartirib bo'lmaydi. Shuning uchun hisobot oralig'i
 * oddiy maydonga yoziladi, bu funksiya esa yozilganini tartibga soladi:
 * "8" -> "08:00", "830" -> "08:30", "25:00" -> "23:00".
 *
 * Bo'sh qiymatga zaxira qaytariladi: oraliqsiz hisobot so'ralsa, server
 * butun bazani berib yuborardi.
 */
export function normalizeTimeText(raw: unknown, fallback = '00:00'): string {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return fallback;

  let hours: number;
  let minutes: number;
  if (digits.length <= 2) {
    hours = Number(digits);
    minutes = 0;
  } else {
    hours = Number(digits.slice(0, digits.length - 2));
    minutes = Number(digits.slice(-2));
  }

  hours = Math.min(23, Math.max(0, hours));
  minutes = Math.min(59, Math.max(0, minutes));
  return `${two(hours)}:${two(minutes)}`;
}
