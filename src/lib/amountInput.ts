/**
 * Klaviaturadan teriladigan pul maydoni.
 *
 * Ilgari bu `<input type="number">` edi va ikkita muammosi bor edi.
 * Birinchisi — maydonda `90000` turardi: nol sanamasdan bu 9 mingmi, 90
 * mingmi yoki 900 mingmi ekanini bir qarashda aytib bo'lmasdi, ortiqcha
 * bosilgan nol esa ko'zga tashlanmasdi. Ikkinchisi — raqam maydonida
 * sichqoncha g'ildiragi qiymatni o'zgartiradi: kassir ro'yxatni aylantirmoqchi
 * bo'lib maydon ustidan o'tsa, summa jimgina boshqa bo'lib qolardi.
 *
 * Shuning uchun maydon endi oddiy matn, ichida esa faqat raqamlar saqlanadi.
 */

/** Maydonga sig'adigan raqamlar soni. */
export const MAX_AMOUNT_DIGITS = 9;

/**
 * Terilganidan faqat raqamlarni oladi.
 *
 * Boshidagi nollar tashlanadi: "007" — yetti, lekin ekranda "007" turgani
 * summa allaqachon terilgandek taassurot qoldiradi.
 */
export function digitsOnly(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return digits.slice(0, MAX_AMOUNT_DIGITS);
}

/** Ko'rsatish uchun uchlikka ajratilgan ko'rinish. Bo'sh maydon bo'sh qoladi. */
export function formatAmount(digits: string): string {
  const clean = digitsOnly(digits);
  return clean ? Number(clean).toLocaleString() : '';
}

/** Maydondagi summa. Bo'sh maydon — nol. */
export function amountValue(digits: string): number {
  const clean = digitsOnly(digits);
  return clean ? Number(clean) : 0;
}
