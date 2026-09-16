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

import { createKvStore } from './kvStore';
import { createIdbBackend } from './idbBackend';

/**
 * Kafega tegishli yozuvlar. To'liq kalit — `orderplus_<cafeId>_<nom>`.
 *
 * Kafe bo'yicha ajratilgani muhim: bitta qurilmada bir nechta kafe ochilishi
 * mumkin, va biri ikkinchisining buyurtmalarini ko'rmasligi kerak.
 */
export const CAFE_KEYS = [
  'address',
  /** Yozilayotgan, hali yuborilmagan savatlar — stol raqami bo'yicha. */
  'carts',
  'cash_transactions',
  'categories',
  'is_frozen',
  'kitchen_printed',
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
  /** Server rad etgan amallar — o'chirilmaydi, ko'rib chiqiladi. */
  'sync_failed',
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
 * Doimiy yozuvlar `kvStore` da: IndexedDB, `localStorage` esa zaxira nusxa.
 *
 * `localStorage` pul saqlanadigan joy uchun noto'g'ri idish edi — tranzaksiya
 * yo'q, joy ~5MB va o'qish-o'zgartirish-yozish poygasi ochiq. Sabablar to'liq
 * holda `kvStore.ts` da yozilgan.
 *
 * SESSIYA bu ko'chishga KIRMAYDI. U ilova yopilishi bilan o'chishi SHART:
 * kassa sessiyasining qisqa umri himoya vositasi, kamchilik emas.
 */
const kv = createKvStore(createIdbBackend());

/**
 * Chidamli bazani ochadi va yozuvlarni xotiraga oladi.
 *
 * Ilova chizilishidan OLDIN chaqiriladi. Kutmasdan ham ishlaydi — xotira
 * `localStorage` dan darhol urug'lanadi — lekin o'shanda bazadagi, ya'ni
 * `localStorage` ga sig'magan yozuvlar ko'rinmay turadi.
 */
export function hydrateStorage(): Promise<void> {
  /*
   * Kutish CHEKLANGAN. IndexedDB ochilishi osilib qolishi mumkin — boshqa
   * oyna eski versiyani ushlab tursa yoki profil buzilgan bo'lsa. Kutishni
   * cheksiz qoldirish kassani oq ekranda qoldirardi, ya'ni savdo umuman
   * boshlanmasdi.
   *
   * Vaqt tugasa ilova baribir ochiladi: xotira `localStorage` dan
   * urug'langan, ya'ni kassa hech bo'lmasa bugungi holatida ishlaydi.
   * Hidratatsiya esa fonda tugaydi va tugagach yozuvlar bazaga ketadi.
   */
  return Promise.race([
    kv.hydrate(),
    new Promise<void>((resolve) => setTimeout(resolve, HYDRATE_TIMEOUT_MS)),
  ]);
}

/** Shundan uzoq kutilgan bazaga ishonib o'tirilmaydi. */
const HYDRATE_TIMEOUT_MS = 3000;

/** Kutayotgan yozuvlar diskka tushguncha kutadi. */
export function flushStorage(): Promise<void> {
  return kv.flush();
}

/** Chidamli baza ochildimi. `false` — kassa `localStorage` bilan ishlayapti. */
export function isStorageDurable(): boolean {
  return kv.isDurable();
}

/** Xotiradagi nusxani diskdan qaytadan o'qiydi. */
export function reloadStorage(): void {
  kv.reload();
}

/** Sessiya xotirasi — yo'q bo'lsa `null`. */
function sessionStore(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function readText(key: string, kind: 'local' | 'session' = 'local'): string | null {
  if (kind === 'session') {
    try {
      return sessionStore()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return kv.get(key);
}

/**
 * Yozib bo'lmagan har bir urinish shu yerda qayd etiladi.
 *
 * Ilgari `writeJson`/`writeText` xato bo'lsa `false` qaytarardi, lekin
 * chaqiruvchilarning aksariyati bu qiymatni tekshirmasdi — disk to'lgan yoki
 * shaxsiy rejimda savdo "saqlandi" deb ko'rinar, aslida hech qayerga
 * yozilmagan bo'lardi. Konsolga yozish bu holatni hech bo'lmasa iz
 * qoldiradigan qiladi, chaqiruvchi kodni o'zgartirmasdan.
 */
function logWriteFailure(key: string): void {
  console.error(`[storage] yozib bo'lmadi: ${key}`);
}

/** Yozib bo'lganini qaytaradi — chaqiruvchi buni bilishi kerak bo'lsa. */
export function writeText(key: string, value: string, kind: 'local' | 'session' = 'local'): boolean {
  if (kind === 'session') {
    try {
      sessionStore()?.setItem(key, value);
      return true;
    } catch {
      logWriteFailure(key);
      return false;
    }
  }
  return kv.set(key, value);
}

export function removeKey(key: string, kind: 'local' | 'session' = 'local'): void {
  if (kind === 'session') {
    try {
      sessionStore()?.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  kv.remove(key);
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
    // `writeText` bu yerga yetib kelmagani uchun o'zi qayd etolmaydi.
    logWriteFailure(key);
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

/**
 * Bir nechta kafe yozuvini BITTA tranzaksiyada yozadi.
 *
 * `sync_queue` dan `sync_failed` ga ko'chirish aynan shuni talab qiladi:
 * ikkita alohida yozuv orasida ilova yiqilsa, pul ikkala ro'yxatdan ham
 * tushib qolardi. Ilgari bu yerda himoya emas, yozuvlar TARTIBIGA
 * tayangan ehtiyotkorlik turardi.
 */
export function writeCafeJsonMany(
  cafeId: string,
  entries: { key: CafeKey; value: unknown }[],
): boolean {
  const rows: { key: string; value: string | null }[] = [];
  for (const entry of entries) {
    try {
      rows.push({ key: cafeKey(cafeId, entry.key), value: JSON.stringify(entry.value) });
    } catch {
      // Aylanma havolali obyekt — butun to'plam yozilmaydi, chunki
      // yarmini yozish aynan qochmoqchi bo'lgan holatimiz.
      logWriteFailure(cafeKey(cafeId, entry.key));
      return false;
    }
  }
  return kv.setMany(rows);
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
 * Kunlik ish yozuvlari — "yangi ishni boshlash" ularni tozalaydi.
 *
 * Kassa sinovdan haqiqiy ishga o'tganda serverdagi test cheklari o'chiriladi,
 * lekin kassaning O'ZIDAGI yozuvlar server bilan birga tozalanmaydi. Ularning
 * uchtasi haqiqiy zarar keltiradi:
 *
 *   - `cash_transactions` — eski versiyadagi kassa xarajatlari oynasining
 *     diskdagi nusxasi. Oyna olib tashlangan (xarajat endi admin panelda
 *     kiritiladi), lekin yangilangan kassaning diskida u qolib ketadi —
 *     kalit shu nusxani ham tozalash uchun ro'yxatda turadi;
 *   - `sync_queue` da qolgan sinov buyurtmasi aloqa tiklanganda serverga
 *     ketadi va endigina tozalangan bazani yana to'ldiradi;
 *   - `carts` da yozilib qolgan sinov savati stolda ochiq turadi.
 */
export const OPERATIONAL_KEYS = [
  'carts',
  'cash_transactions',
  'kitchen_printed',
  'orders',
  'sync_queue',
  'sync_failed',
] as const satisfies readonly CafeKey[];

/**
 * Tozalashdan keyin ham joyida qoladiganlar.
 *
 * Ro'yxat ataylab to'liq: `CAFE_KEYS` ga yangi kalit qo'shilsa, u ikkisining
 * birida bo'lishi shart va buni test tekshiradi. Aks holda yangi kalit jimgina
 * "tozalanmaydiganlar" tomonida qolib ketardi — va aynan shunday qolib
 * ketgan yozuv keyin hech kim tushunolmaydigan xatoga aylanadi.
 *
 * Menyu, stollar va xodimlar — kafening haqiqiy ma'lumoti. Sessiya va oflayn
 * kalitlar esa kassirni tizimdan chiqarib yubormaslik uchun: yangi ishni
 * boshlash PIN ni qaytadan so'rashi kerak emas.
 */
export const PRESERVED_KEYS = [
  'address',
  'categories',
  'is_frozen',
  'logo',
  'name',
  'offline_auth',
  'offline_lock',
  'phone',
  'products',
  'session',
  'sub_end',
  'tables',
  'waiters',
] as const satisfies readonly CafeKey[];

const HEALTH_CHECK_KEY = 'orderplus_storage_health_check';

/**
 * Disk haqiqatan ham yozib-o'qiy olayotganini tekshiradi: yozadi, o'qiydi,
 * o'chiradi. Kassa ishga tushganda bir marta chaqiriladi — shaxsiy rejim
 * yoki to'lgan disk kabi holatlarni birinchi savdogacha, kassir hali hech
 * narsa yo'qotmagan paytda ko'rsatish uchun.
 */
export function checkStorageHealth(): boolean {
  // Chidamli baza ochilgan bo'lsa savol yopiq: u `localStorage` ning
  // kvotasiga ham, shaxsiy rejimiga ham bog'liq emas.
  if (kv.isDurable()) return true;

  // Aks holda yagona umid `localStorage` — va u haqiqatan sinaladi.
  // `writeText` bu yerda yaramaydi: u xotiradagi nusxaga yozib, diskka
  // yetib bormagan taqdirda ham "muvaffaqiyat" qaytarardi.
  try {
    const probe = String(Date.now());
    localStorage.setItem(HEALTH_CHECK_KEY, probe);
    const read = localStorage.getItem(HEALTH_CHECK_KEY);
    localStorage.removeItem(HEALTH_CHECK_KEY);
    return read === probe;
  } catch {
    return false;
  }
}

/**
 * Kunlik ish yozuvlarini o'chiradi. Menyuga, stollarga, xodimlarga va printer
 * sozlamasiga tegmaydi.
 */
export function clearOperationalData(cafeId: string): void {
  for (const key of OPERATIONAL_KEYS) {
    removeCafeKey(cafeId, key);
  }
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
