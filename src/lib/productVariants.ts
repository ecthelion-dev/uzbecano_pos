import type { ProductVariant } from '../types';

/**
 * Taomning o'lchamlari — bazadagi shakldan kassa ko'radigan ro'yxatga.
 *
 * Bazada ikkita maydon bor: `price` (asosiy narx) va `sizes` (qo'shimcha
 * o'lchamlar). Kassirga esa bitta ro'yxat kerak, chunki u asosiy narxni
 * ham tanlay olishi shart — shuning uchun ro'yxat boshiga "Standart"
 * qo'shiladi.
 *
 * `isBase` — o'sha qo'shilgan yozuvning belgisi. Bazada bunday o'lcham
 * yo'q, va uni serverga yuborsak, server buyurtmani rad etadi.
 */
export const BASE_VARIANT_NAME = 'Standart';

interface RawProduct {
  price?: unknown;
  sizes?: unknown;
  variants?: ProductVariant[];
}

function readSizes(raw: unknown): { name: string; price: unknown }[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((s: any) => ({ name: String(s?.label ?? s?.name ?? '').trim(), price: s?.price }))
    .filter((s) => s.name.length > 0);
}

export function buildVariants(product: RawProduct): ProductVariant[] | undefined {
  if (product?.variants && product.variants.length > 0) return product.variants;

  const basePrice = Number(product?.price) || 0;
  const sizes = readSizes(product?.sizes);
  if (sizes.length === 0) return undefined;

  const stored: ProductVariant[] = sizes.map((s) => ({
    name: s.name,
    price: Number(s.price) || basePrice,
  }));

  /*
   * "Standart" faqat u ALOHIDA taklif bo'lsa qo'shiladi.
   *
   * Adminkada narxlar endi bitta ro'yxat: tahrirlovchi "Standart" qatorini
   * o'chirib, birinchi o'lchamni asosiy narx qilib qo'yishi mumkin. O'shanda
   * bir xil narx kassirga ikki marta chiqardi — bir marta o'z nomi bilan
   * ("1 kg"), bir marta "Standart" bo'lib. Kassir ikkitasidan qaysinisini
   * bosishni bilmaydi, chekda esa ular boshqa-boshqa nomda chiqardi.
   */
  const baseIsOwnChoice = basePrice > 0 && !stored.some((v) => v.price === basePrice);

  const all: ProductVariant[] = [
    ...(baseIsOwnChoice ? [{ name: BASE_VARIANT_NAME, price: basePrice, isBase: true }] : []),
    ...stored,
  ];

  const seen = new Set<string>();
  return all.filter((v) => {
    const key = `${v.name.toLowerCase().trim()}-${v.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
