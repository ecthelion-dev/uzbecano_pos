import type { DBProduct } from '../types';

/**
 * Kodni solishtirish uchun yagona shaklga keltiradi.
 *
 * - Skaner oxiriga Enter yoki bo'shliq qo'shishi mumkin: chetlari kesiladi.
 * - Harf-raqamli kodlarda (Code 128) katta-kichik harf farq qilmaydi: admin
 *   kodni qo'lda yozganda ham mahsulot topiladi.
 * - UPC-A (12 raqam) — boshiga 0 qo'yilgan EAN-13. Telefon kamerasi uni 12,
 *   USB skaner 13 raqam qilib berishi mumkin, bitta mahsulot ikkalasida
 *   topilishi kerak. Faqat 12 raqamli kod kengaytiriladi: qisqa ichki
 *   kodlarda ("123" va "0123") nolni tashlash boshqa mahsulotni topib berardi,
 *   ya'ni noto'g'ri narxda sotilardi.
 */
function canonicalBarcode(raw: string): string {
  const code = raw.trim().toUpperCase();
  return /^\d{12}$/.test(code) ? `0${code}` : code;
}

/** Skanerlash kassada nima qilishni talab qiladi. */
export type BarcodeScanOutcome =
  | { kind: 'unknown' }
  /** Mahsulot bor, lekin stop-listda. */
  | { kind: 'unavailable'; product: DBProduct }
  /** `needsChoice` — o'lcham/qo'shimcha tanlanishi kerak, savatga bevosita qo'shilmaydi. */
  | { kind: 'add'; product: DBProduct; needsChoice: boolean };

/**
 * Skanerlangan kod bilan nima qilish kerak.
 *
 * Qaror komponentda emas, shu yerda: u testlanadi, telefon kamerasi bilan
 * USB skaner esa bir xil yo'ldan o'tadi.
 */
export function resolveBarcodeScan(products: readonly DBProduct[], scanned: string): BarcodeScanOutcome {
  const product = findProductByBarcode(products, scanned);
  if (!product) return { kind: 'unknown' };
  if (product.isAvailable === false) return { kind: 'unavailable', product };

  // Ko'p o'lchamli yoki qo'shimchali mahsulotni bevosita savatga qo'shish
  // noto'g'ri narxda sotardi: avval tanlash oynasi ochilishi kerak.
  const needsChoice = Boolean(product.variants?.length || product.addons?.length);
  return { kind: 'add', product, needsChoice };
}

/** Skanerlangan kod bo'yicha mahsulotni topadi; topilmasa `null`. */
export function findProductByBarcode(
  products: readonly DBProduct[],
  scanned: string,
): DBProduct | null {
  const wanted = canonicalBarcode(scanned);
  if (wanted === '') return null;

  return products.find((p) => p.barcode !== undefined && canonicalBarcode(p.barcode) === wanted) ?? null;
}
