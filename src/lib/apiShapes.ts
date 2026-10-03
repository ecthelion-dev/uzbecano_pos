import type { DBCategory, DBProduct } from '../types';

/**
 * Serverdan kelgan javobni ishlatishdan oldin tekshirish.
 *
 * `await res.json()` — bu `any`. TypeScript uni qabul qilib turadi, ya'ni
 * serverda maydon nomi o'zgarsa yoki javob xato shaklda kelsa, xato
 * BURADA emas — chekni chop etadigan joyda chiqadi: `product.price` bu
 * `undefined` bo'lib, chekda "NaN so'm" chiqadi. Kassir esa nima
 * bo'lganini tushunmaydi.
 *
 * Shuning uchun har bir javob o'qiladi va tozalanadi: buzilgan yozuv
 * tashlab yuboriladi, lekin qolgan menyu ishlayveradi. Bu "hammasi
 * yoki hech nima" dan yaxshiroq: noto'g'ri yozuv bittasi bo'sa, butun
 * menyu yo'qolmasligi kerak.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  // Server ba'zan raqamni matn qilib yuboradi ("35000"). Bu holatda
  // yozuvni tashlab yuborish noto'g'ri bo'lardi — narx o'qiladi.
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * Bitta taom.
 *
 * Majburiy faqat to'rttasi: id, nom, kategoriya va narx. Narx ayniqsa:
 * usiz taom savatga 0 so'm bo'lib tushardi. Qolgan maydonlar ixtiyoriy va
 * xato bo'lsa olib tashlanadi (masalan, `variants` massiv emas).
 */
export function asProduct(raw: unknown): DBProduct | null {
  if (!isRecord(raw)) return null;

  const id = str(raw.id);
  const name = str(raw.name);
  const category = str(raw.category);
  const price = num(raw.price);
  if (!id || !name || !category || price === null) return null;

  const product: DBProduct = { id, name, category, price };

  const image = str(raw.image);
  if (image) product.image = image;
  const description = str(raw.description);
  if (description) product.description = description;

  if (typeof raw.isAvailable === 'boolean') product.isAvailable = raw.isAvailable;

  /*
   * O'lchamlar/narxlar ro'yxati ("0.5 kg", "1 kg") o'tkazilmasa ko'p narxli
   * taom kassada bir bosishda asosiy narxga qo'shilib ketaveradi va tanlash
   * oynasi umuman ochilmaydi: `buildVariants` narxlar ro'yxatini aynan shu
   * maydondan yig'adi.
   *
   * Server uni JSON MATNI qilib yuboradi (`sizes: '[{"label":...}]'`), lekin
   * diskdagi nusxada yoki eski javobda massiv bo'lib kelishi ham mumkin —
   * ikkalasi ham o'tadi. Qiymat bu yerda ataylab o'zgartirilmaydi: o'qish va
   * tozalash `lib/productVariants.ts` da bir joyda turadi.
   */
  if (typeof raw.sizes === 'string' || Array.isArray(raw.sizes)) {
    product.sizes = raw.sizes;
  }

  if (Array.isArray(raw.variants)) {
    const variants = raw.variants
      .map((v) => (isRecord(v) ? { name: str(v.name), price: num(v.price), isBase: v.isBase === true } : null))
      .filter((v): v is { name: string; price: number; isBase: boolean } => Boolean(v?.name) && v!.price !== null)
      .map((v) => ({ name: v.name, price: v.price, ...(v.isBase ? { isBase: true } : {}) }));
    if (variants.length > 0) product.variants = variants;
  }

  if (Array.isArray(raw.addons)) {
    const addons = raw.addons
      .map((a) => (isRecord(a) ? { name: str(a.name), price: num(a.price) } : null))
      .filter((a): a is { name: string; price: number } => Boolean(a?.name) && a!.price !== null)
      .map((a) => ({ name: a.name, price: a.price }));
    if (addons.length > 0) product.addons = addons;
  }

  return product;
}

/**
 * Taomlar ro'yxati.
 *
 * `null` — javob umuman ro'yxat emas: bu holda chaqiruvchi eski ro'yxatni
 * saqlab qoladi (bo'sh menyu ko'rsatishdan yaxshiroq). Bo'sh massiv esa
 * haqiqiy javob bo'lishi mumkin, ya'ni u o'sha holicha qaytadi.
 */
export function asProductArray(raw: unknown): DBProduct[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map(asProduct).filter((p): p is DBProduct => p !== null);
}

export function asCategory(raw: unknown): DBCategory | null {
  if (!isRecord(raw)) return null;

  const name = str(raw.name);
  if (!name) return null;

  const category: DBCategory = { id: str(raw.id) ?? name, name };
  const icon = str(raw.icon);
  if (icon) category.icon = icon;
  const image = str(raw.image);
  if (image) category.image = image;

  return category;
}

export function asCategoryArray(raw: unknown): DBCategory[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map(asCategory).filter((c): c is DBCategory => c !== null);
}

/**
 * Kafening umumiy sozlamalari.
 *
 * Faqat tekshirilgan maydonlar qaytadi: noto'g'ri qiymatni `undefined`
 * qilib berish, uni "to'g'ri" deb ishlatib qo'yishdan yaxshiroq.
 */
export interface CafeSettingsShape {
  serviceFeePercent?: number;
  name?: string;
  logo?: string;
  address?: string;
  phone?: string;
  receiptHeader?: string;
  isFrozen?: boolean;
  /** "active" | "frozen" | "expired" — kafe holati. */
  status?: string;
  /** Obuna tugash sanasi (ISO). Muddati o'tgan kafe savdo qilmaydi. */
  subscriptionEnd?: string;
}

export function asCafeSettings(raw: unknown): CafeSettingsShape | null {
  if (!isRecord(raw)) return null;

  const out: CafeSettingsShape = {};

  const fee = num(raw.serviceFeePercent);
  // Xizmat haqi foizda: manfiy yoki 100 dan katta qiymat chekni buzadi.
  if (fee !== null && fee >= 0 && fee <= 100) out.serviceFeePercent = fee;

  const name = str(raw.name);
  if (name) out.name = name;
  const logo = str(raw.logo);
  if (logo) out.logo = logo;
  const address = str(raw.address);
  if (address) out.address = address;
  const phone = str(raw.phone);
  if (phone) out.phone = phone;
  const receiptHeader = str(raw.receiptHeader);
  if (receiptHeader) out.receiptHeader = receiptHeader;
  if (typeof raw.isFrozen === 'boolean') out.isFrozen = raw.isFrozen;

  /*
   * Kafe holati va obuna sanasi `applyCafeStatus` uchun kerak: kafe
   * "frozen"/"expired" bo'lsa yoki obuna muddati o'tgan bo'lsa savdo
   * to'xtatiladi. Bu maydonlarsiz tekshiruv jimgina o'chib qolardi —
   * ya'ni muzlatilgan kafe ishlayverardi.
   */
  const status = str(raw.status);
  if (status) out.status = status;
  const subscriptionEnd = str(raw.subscriptionEnd);
  if (subscriptionEnd) out.subscriptionEnd = subscriptionEnd;

  return out;
}
