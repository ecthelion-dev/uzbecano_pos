export type PaymentMethod = 'naqd' | 'karta' | 'aralash';

export interface PaymentSplit {
  cash: number;
  card: number;
  method: PaymentMethod;
}

/**
 * To'lovni naqd va kartaga bo'lish.
 *
 * Kassir faqat NAQD olingan summani kiritadi, qolgani o'zi kartaga tushadi.
 * "Aralash" alohida rejim emas — u shunchaki to'liq bo'lmagan naqd, va
 * shuning uchun to'lov oynasida bunday tugma yo'q.
 *
 * Ikki qoida buzilmasligi kerak:
 *
 *   1. `cash + card` chek summasiga ANIQ teng bo'lishi shart. Server buni
 *      tekshiradi va tenglashmasa to'lovni rad etadi — ya'ni yaxlitlash
 *      xatosi stolni yopilmay qoldiradi.
 *   2. Ikkalasi ham manfiy bo'lmasligi kerak. Kassir chekdan ko'p naqd
 *      kiritsa, ortiqchasi kartadan MINUS bo'lib ketardi.
 *
 * Shu sababli naqd avval [0, jami] oralig'iga siqiladi, karta esa undan
 * ayirma sifatida olinadi — hech qachon alohida kiritilmaydi.
 */
export function splitPayment(total: number, cashTaken: number): PaymentSplit {
  const safeTotal = Math.max(0, Math.round(Number(total) || 0));
  const raw = Number(cashTaken);
  const cash = Math.max(0, Math.min(safeTotal, Math.round(Number.isFinite(raw) ? raw : 0)));
  const card = safeTotal - cash;

  // Tur summadan kelib chiqadi, tanlanmaydi. Nol summali chekda ("hammasi
  // chegirma") naqd ham, karta ham nol — uni "naqd" deb yozamiz, chunki
  // "aralash" deyish noto'g'ri ma'no berardi.
  const method: PaymentMethod = card <= 0 ? 'naqd' : cash <= 0 ? 'karta' : 'aralash';

  return { cash, card, method };
}
