/**
 * Kassaning diskdagi yozuvlari — sxemaning yagona egasi.
 *
 * Ilgari kalitlar 58 ta joyda qo'lda yig'ilardi: `orderplus_${cafeId}_orders`
 * kabi qator har bir chaqiruvda qaytadan yozilar edi. Buning ikkita narxi
 * bor edi. Birinchisi — kalitni o'zgartirmoqchi bo'lsangiz qolgan 57 tasini
 * qidirishga to'g'ri kelardi. Ikkinchisi og'irroq: kalitdagi xato hech qanday
 * xato bermaydi, `getItem` shunchaki `null` qaytaradi va kassa "ma'lumot
 * yo'q" deb o'ylaydi — buyurtmalar ro'yxati bo'shab qolgani xuddi yangi kun
 * boshlangandek ko'rinadi.
 *
 * Endi kalit nomlari yopiq ro'yxat: xato yozsangiz TypeScript aytadi.
 *
 * Yana ikkita qoida shu yerda bir marta bajariladi:
 *
 *   - O'qish hech qachon xato tashlamaydi. Buzuq JSON — diskda saqlangan
 *     narsa, kassir uni tuzata olmaydi; shuning uchun zaxira qiymat
 *     qaytariladi va kassa ishlayveradi.
 *   - Yozish ham xato tashlamaydi. Shaxsiy rejim yoki to'lgan disk chek
 *     chiqarishni to'xtatmasligi kerak.
 */

/**
 * Kafega tegishli yozuvlar. To'liq kalit — `orderplus_<cafeId>_<nom>`.
 *
 * Kafe bo'yicha ajratilgani muhim: bitta qurilmada bir nechta kafe ochilishi
 * mumkin, va biri ikkinchisining buyurtmalarini ko'rmasligi kerak.
 */
export const CAFE_KEYS = [
  'address',
  'cash_transactions',
  'categories',
  'is_frozen',
  'kitchen_seq',
  'logo',
  'name',
  'offline_auth',
  'offline_lock',
  'orders',
  'phone',
  'products',
  'session',
  'sub_end',
  'sync_queue',
  'tables',
  'waiters',
] as const;

export type CafeKey = (typeof CAFE_KEYS)[number];

/** Kafedan qat'i nazar bitta bo'lgan yozuvlar. */
export const GLOBAL_KEYS = {
  /** Qo'lda kiritilgan backend manzili. */
  apiUrl: 'orderplus_api_url',
  /** Kassa qaysi kafega ulangani. */
  cafeId: 'orderplus_cafe_id',
  /** Printer sozlamalari — qurilmaniki, kafeniki emas. */
  printerSettings: 'orderplus_printer_settings',
  /**
   * Xizmat haqi foizi.
   *
   * Prefikssiz nom — eski versiyalardan qolgan. Nomini o'zgartirish
   * yangilangan kassada foizni nolga tushiradi (server javobi kelgunga
   * qadar), shuning uchun u shu holida qoldirilgan va bu yerda hujjatlangan.
   */
  serviceFeePercent: 'serviceFeePercent',
} as const;

export type GlobalKey = keyof typeof GLOBAL_KEYS;

/** Kafega tegishli yozuvning to'liq kaliti. */
export function cafeKey(cafeId: string, key: CafeKey): string {
  return `orderplus_${cafeId}_${key}`;
}

/**
 * Brauzer xotirasi — yo'q bo'lsa `null`.
 *
 * Tauri WebView2 da ham, testlarda ham `localStorage` bo'lmasligi mumkin;
 * o'shanda kassa yiqilmasligi kerak.
 */
function store(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export function readText(key: string, kind: 'local' | 'session' = 'local'): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Yozib bo'lganini qaytaradi — chaqiruvchi buni bilishi kerak bo'lsa. */
export function writeText(key: string, value: string, kind: 'local' | 'session' = 'local'): boolean {
  try {
    store(kind)?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string, kind: 'local' | 'session' = 'local'): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Buzuq yoki yo'q yozuvda zaxira qiymat qaytadi — hech qachon xato emas. */
export function readJson<T>(key: string, fallback: T, kind: 'local' | 'session' = 'local'): T {
  const raw = readText(key, kind);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, kind: 'local' | 'session' = 'local'): boolean {
  try {
    return writeText(key, JSON.stringify(value), kind);
  } catch {
    // Aylanma havolali obyekt — JSON.stringify xato tashlaydi.
    return false;
  }
}

// Kafega tegishli yozuvlar uchun qisqartmalar. Chaqiruvchi kalitni emas,
// nomini yozadi.

export function readCafeText(cafeId: string, key: CafeKey): string | null {
  return readText(cafeKey(cafeId, key));
}

export function writeCafeText(cafeId: string, key: CafeKey, value: string): boolean {
  return writeText(cafeKey(cafeId, key), value);
}

export function readCafeJson<T>(cafeId: string, key: CafeKey, fallback: T): T {
  return readJson(cafeKey(cafeId, key), fallback);
}

export function writeCafeJson(cafeId: string, key: CafeKey, value: unknown): boolean {
  return writeJson(cafeKey(cafeId, key), value);
}

export function removeCafeKey(cafeId: string, key: CafeKey, kind: 'local' | 'session' = 'local'): void {
  removeKey(cafeKey(cafeId, key), kind);
}

export function readGlobalText(key: GlobalKey): string | null {
  return readText(GLOBAL_KEYS[key]);
}

export function writeGlobalText(key: GlobalKey, value: string): boolean {
  return writeText(GLOBAL_KEYS[key], value);
}

export function removeGlobalKey(key: GlobalKey): void {
  removeKey(GLOBAL_KEYS[key]);
}

/**
 * Kafeni ajratishdan oldingi versiyalar qoldirgan yozuvlarni o'chiradi.
 *
 * O'sha versiyalar kafe nomi, logotipi, manzili va telefonini kafega
 * bog'lanmagan kalitlarda ham saqlar edi. Ular endi hech kim tomonidan
 * o'qilmaydi, lekin diskda qolib ketmasin: bitta qurilmada bir nechta kafe
 * ochilgan bo'lsa, u yerda oxirgi ulangan kafening ma'lumoti yotadi.
 */
export function purgeLegacyCafeKeys(): void {
  for (const key of ['orderplus_cafe_name', 'orderplus_cafe_logo', 'orderplus_cafe_address', 'orderplus_cafe_phone']) {
    removeKey(key);
  }
}
