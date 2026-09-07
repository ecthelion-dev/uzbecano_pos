import type { CartItem, DBProduct } from '../types';

/**
 * Savatni qurilmalar orasida ko'chirish.
 *
 * Savat "Tasdiqlash" bosilgunga qadar buyurtma emas va shu paytgacha faqat
 * o'sha qurilmaning diskida turardi: buyurtmani boshlagan xodim boshqa
 * qurilmadan kirsa, stol band ko'rinar, savat esa bo'sh bo'lardi.
 *
 * Serverga faqat qayta yig'ish uchun kerak bo'lgani yuboriladi. Taom nomi,
 * narxi va rasmi yuborilmaydi: rasm base64 bo'lishi mumkin, narx esa
 * "Tasdiqlash" paytida bazadan qaytadan olinadi va bu yerdagi nusxa
 * eskirgan narxni haqiqiydek ko'rsatib turardi.
 */

export interface HoldLine {
  lineId: string;
  productId: string;
  quantity: number;
  note?: string;
  variant?: string;
  addons?: string[];
  /** Saboy qator — boshqa qurilmada ham shunday qolishi kerak. */
  takeaway?: boolean;
}

/** Savatni serverga yuboriladigan shaklga o'tkazadi. */
export function cartToHoldLines(cart: CartItem[]): HoldLine[] {
  return (cart || []).map((item) => ({
    lineId: item.lineId,
    productId: item.product.id,
    quantity: item.quantity,
    ...(item.note ? { note: item.note } : {}),
    ...(item.selectedVariant?.name ? { variant: item.selectedVariant.name } : {}),
    ...(item.selectedAddons?.length
      ? { addons: item.selectedAddons.map((a) => a.name) }
      : {}),
    ...(item.takeaway ? { takeaway: true } : {}),
  }));
}

/**
 * Serverdagi savatni shu qurilmaning menyusi bilan qayta yig'adi.
 *
 * Menyuda yo'q taom TASHLAB YUBORILADI. Uni nomsiz va narxsiz qatordek
 * ko'rsatish yomonroq bo'lardi: kassir uni chekka qo'shib yuborar, server
 * esa "bunday taom yo'q" deb butun buyurtmani rad etardi.
 */
export function holdLinesToCart(lines: HoldLine[], products: DBProduct[]): CartItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const cart: CartItem[] = [];

  for (const line of lines || []) {
    const product = byId.get(line.productId);
    if (!product) continue;

    const quantity = Math.max(1, Math.round(Number(line.quantity) || 1));

    // O'lcham nomi bo'yicha topiladi. Topilmasa — taom asosiy narxda
    // qo'shiladi; narxni bu yerda o'ylab topib bo'lmaydi.
    const variant = line.variant
      ? product.variants?.find((v) => v.name === line.variant)
      : undefined;

    const addons = line.addons?.length
      ? (product.addons || []).filter((a) => line.addons!.includes(a.name))
      : undefined;

    const basePrice = variant ? variant.price : product.price;
    const addonsTotal = (addons || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);

    cart.push({
      lineId: line.lineId,
      // Nom va narx menyudan yig'iladi — savat bilan birga kelmaydi.
      product: {
        ...product,
        name: variant ? `${product.name} (${variant.name})` : product.name,
        price: basePrice + addonsTotal,
      },
      quantity,
      ...(line.note ? { note: line.note } : {}),
      ...(variant ? { selectedVariant: variant } : {}),
      ...(addons?.length ? { selectedAddons: addons } : {}),
      ...(line.takeaway === true ? { takeaway: true } : {}),
    });
  }

  return cart;
}

/** Belgidagi savatni o'qiydi. Buzuq JSON butun zalni yiqitmasligi kerak. */
export function parseHoldItems(raw: unknown): HoldLine[] {
  if (Array.isArray(raw)) return raw as HoldLine[];
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
