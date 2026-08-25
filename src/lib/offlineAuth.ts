/**
 * Oflayn kirish uchun hisob ma'lumotlari keshi.
 *
 * Kassa internetsiz qolganda ham xodim tizimga kira olishi kerak — aks holda
 * smena o'rtasida aloqa uzilsa, kassa butunlay ishlamay qoladi. Lekin PIN
 * kodning o'zi hech qachon saqlanmaydi: faqat PBKDF2 orqali olingan hash.
 * Bu bilan localStorage ni ochgan odam PIN ni o'qiy olmaydi, uni faqat
 * taxmin qilib topishi mumkin — har bir taxmin esa ~0.2 soniya turadi.
 *
 * Serverdan olingan token ham shu yerda saqlanadi: oflayn kirgan xodim
 * aloqa tiklanganda navbatdagi buyurtmalarni o'z nomidan yubora olishi uchun.
 */

const ITERATIONS = 210_000;
const KEY_LEN_BITS = 256;

/** Bir hafta ishlatilmagan qurilmada oflayn kirish o'chadi. */
export const OFFLINE_LOGIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const ELEVATED_ROLES = ['admin', 'cafe_admin', 'platform_admin', 'manager'];

export interface CachedCredential {
  waiterId: string;
  name: string;
  /** Serverdan kelgan xom rol — AdminPinModal shuni tekshiradi. */
  role: string;
  salt: string;
  iterations: number;
  hash: string;
  token?: string;
  cafeName?: string;
  cafeLogo?: string;
  cachedAt: string;
}

function storageKey(cafeId: string) {
  return `orderplus_${cafeId}_offline_auth`;
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** WebCrypto faqat xavfsiz kontekstda (https/localhost) mavjud. */
function subtle(): SubtleCrypto | null {
  return typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string | null> {
  const sc = subtle();
  if (!sc) return null;
  const key = await sc.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await sc.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_LEN_BITS
  );
  return toB64(bits);
}

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readAll(cafeId: string): CachedCredential[] {
  try {
    const raw = localStorage.getItem(storageKey(cafeId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(cafeId: string, list: CachedCredential[]): void {
  try {
    localStorage.setItem(storageKey(cafeId), JSON.stringify(list));
  } catch {
    /* kvota to'lgan bo'lsa oflayn kirish shunchaki ishlamaydi */
  }
}

/** Onlayn kirish muvaffaqiyatli bo'lganda chaqiriladi. */
export async function rememberCredential(
  cafeId: string,
  input: {
    pin: string;
    waiterId: string;
    name: string;
    role: string;
    token?: string;
    cafeName?: string;
    cafeLogo?: string;
  }
): Promise<void> {
  const sc = subtle();
  if (!sc) return;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(input.pin, salt, ITERATIONS);
  if (!hash) return;

  const entry: CachedCredential = {
    waiterId: input.waiterId,
    name: input.name,
    role: String(input.role || '').toLowerCase(),
    salt: toB64(salt.buffer as ArrayBuffer),
    iterations: ITERATIONS,
    hash,
    token: input.token,
    cafeName: input.cafeName,
    cafeLogo: input.cafeLogo,
    cachedAt: new Date().toISOString(),
  };

  // Bitta xodim uchun bitta yozuv: PIN o'zgarsa eskisi qolib ketmaydi.
  const list = readAll(cafeId).filter((c) => c.waiterId !== entry.waiterId);
  list.push(entry);
  writeAll(cafeId, list);
}

export function hasCachedCredentials(cafeId: string): boolean {
  return readAll(cafeId).length > 0;
}

/**
 * Kiritilgan PIN keshdagi yozuvlardan biriga to'g'ri kelsa, o'shani qaytaradi.
 * `requireElevated` bilan chaqirilganda oddiy ofitsiantning PIN kodi qabul
 * qilinmaydi — vozvrat va taomni bekor qilish uni o'zi tasdiqlay olmaydi.
 */
export async function verifyCachedPin(
  cafeId: string,
  pin: string,
  opts: { requireElevated?: boolean } = {}
): Promise<CachedCredential | null> {
  const now = Date.now();

  for (const entry of readAll(cafeId)) {
    if (now - new Date(entry.cachedAt).getTime() > OFFLINE_LOGIN_MAX_AGE_MS) continue;
    if (opts.requireElevated && !ELEVATED_ROLES.includes(entry.role)) continue;

    const candidate = await derive(pin, fromB64(entry.salt), entry.iterations || ITERATIONS);
    if (candidate && equalConstantTime(candidate, entry.hash)) return entry;
  }

  return null;
}
