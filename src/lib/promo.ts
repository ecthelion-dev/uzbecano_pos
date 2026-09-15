/**
 * Promo-kod chegirmasi.
 *
 * Formula serverdagi `uzbecano/src/lib/promo.ts` bilan AYNAN bir xil. To'lovda
 * naqd va karta yig'indisi server hisoblagan summaga teng bo'lishi shart —
 * bir so'm farq ham to'lovni rad ettiradi. Shuning uchun kassa chegirmani
 * taxmin qilmaydi: buyurtmada saqlangan shartlardan xuddi server kabi
 * hisoblaydi.
 */

export interface PromoTerms {
  code: string;
  type: string;
  value: number;
  minOrder: number;
}

export interface OrderTotals {
  serviceFee: number;
  discount: number;
  total: number;
}

const MAX_PROMO_CODE_LENGTH = 64;
/** QR ichidagi havolada kod shu parametrlardan biri bilan keladi. */
const URL_CODE_PARAMS = ['promo', 'promoCode', 'code'];
const PROMO_CODE_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export function promoDiscount(terms: PromoTerms | null | undefined, subtotal: number): number {
  if (!terms) return 0;
  const base = Math.max(0, Math.round(Number(subtotal) || 0));
  if (terms.minOrder > 0 && base < terms.minOrder) return 0;
  if (terms.type === 'percent') {
    return Math.round((base * Math.min(100, Math.max(0, terms.value))) / 100);
  }
  return Math.min(base, Math.max(0, terms.value));
}

/**
 * Chek summasi — server tartibida: xizmat haqi chegirmagacha bo'lgan
 * summadan olinadi, chegirma esa oxirida ayriladi.
 */
export function orderTotals(
  subtotal: number,
  serviceFeePercent: number,
  promo: PromoTerms | null | undefined,
): OrderTotals {
  const serviceFee = Math.round((subtotal * serviceFeePercent) / 100);
  const discount = promoDiscount(promo, subtotal);
  return { serviceFee, discount, total: Math.max(0, subtotal + serviceFee - discount) };
}

/** Serverdan kelgan qiymatni shartlarga aylantiradi. Buzilgan qiymat — promo yo'q. */
export function parsePromoTerms(value: unknown): PromoTerms | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const code = typeof raw.code === 'string' ? raw.code.trim().toUpperCase() : '';
  const amount = Number(raw.value);
  const minOrder = Number(raw.minOrder ?? 0);
  if (!code || typeof raw.type !== 'string') return null;
  if (!Number.isFinite(amount) || !Number.isFinite(minOrder)) return null;
  return { code, type: raw.type, value: amount, minOrder };
}

/**
 * Skanerlangan QR matnidan promo-kodni ajratadi.
 *
 * QR ichida kodning o'zi ("OSH20") yoki `?promo=OSH20` li havola bo'lishi
 * mumkin. Boshqa narsa — masalan stol QR menyusining havolasi — kod emas:
 * uni kod deb yuborish kassirga tushunarsiz "topilmadi" xatosini berardi.
 */
export function promoCodeFromScan(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;

  let candidate = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const fromParam = URL_CODE_PARAMS.map((key) => url.searchParams.get(key)).find(Boolean);
      if (!fromParam) return null;
      candidate = fromParam;
    } catch {
      return null;
    }
  }

  const code = candidate.trim().toUpperCase();
  if (code.length > MAX_PROMO_CODE_LENGTH) return null;
  return PROMO_CODE_PATTERN.test(code) ? code : null;
}
