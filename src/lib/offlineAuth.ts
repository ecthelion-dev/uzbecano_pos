/**
 * Oflayn kirish uchun hisob ma'lumotlari keshi.
 *
 * Kassa internetsiz qolganda ham xodim tizimga kira olishi kerak — aks holda
 * smena o'rtasida aloqa uzilsa, kassa butunlay ishlamay qoladi. Lekin PIN
 * kodning o'zi hech qachon saqlanmaydi: faqat PBKDF2 orqali olingan hash.
 *
 * Serverdan olingan token ham shu yerda saqlanadi, lekin OCHIQ EMAS. Ilgari u
 * hash yonida oddiy matnda yotar edi — ya'ni PIN ni PBKDF2 bilan himoya qilish
 * ma'nosiz bo'lardi, chunki localStorage ni o'qigan odam PIN ni sindirmasdan
 * tayyor sessiyani olardi. Endi token AES-GCM bilan, aynan o'sha PIN dan
 * chiqarilgan kalit ostida shifrlanadi: uni faqat PIN ni biladigan odam
 * ocha oladi.
 */

import { readCafeJson, writeCafeJson, removeCafeKey } from './storage';

const ITERATIONS = 210_000;
/** 256 bit tekshiruv hashi + 256 bit AES kaliti, bitta PBKDF2 yurishida. */
const DERIVED_BITS = 512;
const VERIFIER_BYTES = 32;

/** Format raqami. Bundan eskisi o'qilmaydi — ularda token ochiq yotibdi. */
const SCHEMA_VERSION = 2;

/** Bir hafta ishlatilmagan qurilmada oflayn kirish o'chadi. */
export const OFFLINE_LOGIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Serverdagi siyosat bilan bir xil: 5 xato urinish -> 15 daqiqa blok. */
const MAX_OFFLINE_ATTEMPTS = 5;
const OFFLINE_LOCKOUT_MS = 15 * 60 * 1000;

const ELEVATED_ROLES = ['admin', 'cafe_admin', 'platform_admin', 'manager'];

export interface CachedCredential {
  waiterId: string;
  name: string;
  /** Serverdan kelgan xom rol — AdminPinModal shuni tekshiradi. */
  role: string;
  salt: string;
  iterations: number;
  hash: string;
  version: number;
  /** AES-GCM bilan shifrlangan sessiya tokeni (PIN dan olingan kalit ostida). */
  tokenCipher?: string;
  tokenIv?: string;
  cafeName?: string;
  cafeLogo?: string;
  cachedAt: string;
}

/** verifyCachedPin natijasi: token faqat shu yerda, ochilgan holda qaytadi. */
export type OfflineVerifyResult =
  | { status: 'ok'; credential: CachedCredential; token?: string }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'locked'; retryAfterSeconds: number };

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** WebCrypto faqat xavfsiz kontekstda (https/localhost) mavjud. */
function subtle(): SubtleCrypto | null {
  return typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null;
}

/**
 * PIN dan bir yurishda ikkita mustaqil qiymat chiqaradi: PIN to'g'riligini
 * tekshiradigan hash va tokenni shifrlaydigan kalit. Ular bir xil bitlardan
 * emas — birinchi yarmi tekshiruvga, ikkinchi yarmi kalitga ketadi, ya'ni
 * saqlangan hash kalit haqida hech nima aytmaydi.
 */
async function deriveMaterial(
  pin: string,
  salt: Uint8Array,
  iterations: number
): Promise<{ verifier: string; aesKey: CryptoKey } | null> {
  const sc = subtle();
  if (!sc) return null;

  const baseKey = await sc.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await sc.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    DERIVED_BITS
  );

  const all = new Uint8Array(bits);
  const verifier = toB64(all.slice(0, VERIFIER_BYTES));
  const aesKey = await sc.importKey(
    'raw',
    all.slice(VERIFIER_BYTES) as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  return { verifier, aesKey };
}

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readAll(cafeId: string): CachedCredential[] {
  const parsed = readCafeJson<unknown>(cafeId, 'offline_auth', []);
  if (!Array.isArray(parsed)) return [];
  // Eski formatdagi yozuvlar tashlab yuboriladi: ularda token ochiq matnda,
  // ya'ni ularni saqlab qolish tuzatilayotgan kamchilikni saqlab qolish
  // bo'lardi. Xodim bir marta onlayn kirsa, kesh qaytadan yoziladi.
  return parsed.filter((c: any) => c && c.version === SCHEMA_VERSION);
}

function writeAll(cafeId: string, list: CachedCredential[]): void {
  // Kvota to'lgan bo'lsa oflayn kirish shunchaki ishlamaydi.
  writeCafeJson(cafeId, 'offline_auth', list);
}

/* ------------------------------------------------------------------ *
 * Oflayn urinishlar cheklovi
 *
 * Serverda 5 urinishdan keyin 15 daqiqalik blok bor, oflayn yo'lda esa
 * umuman yo'q edi: tarmoq kabelini sug'urib olgan odam 4 xonali PIN ni
 * cheksiz taxmin qila olardi. Hisoblagichni localStorage ga yozgan odam
 * uni tozalab ham qo'yishi mumkin, lekin bu allaqachon qurilmani to'liq
 * egallagan hujumchi — bu cheklov kassa oldida turgan odamga qarshi.
 * ------------------------------------------------------------------ */

interface LockState {
  attempts: number;
  lockedUntil: number;
}

function readLock(cafeId: string): LockState {
  const parsed = readCafeJson<any>(cafeId, 'offline_lock', null);
  if (parsed && typeof parsed.attempts === 'number' && typeof parsed.lockedUntil === 'number') {
    return parsed;
  }
  // Buzilgan yoki yo'q yozuv — noldan boshlaymiz.
  return { attempts: 0, lockedUntil: 0 };
}

function writeLock(cafeId: string, state: LockState): void {
  writeCafeJson(cafeId, 'offline_lock', state);
}

/** Hozir oflayn urinishga ruxsat bormi. */
export function offlineLockStatus(cafeId: string): { locked: boolean; retryAfterSeconds: number } {
  const state = readLock(cafeId);
  const remaining = state.lockedUntil - Date.now();
  if (remaining > 0) {
    return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

function resetLock(cafeId: string): void {
  removeCafeKey(cafeId, 'offline_lock');
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
  const material = await deriveMaterial(input.pin, salt, ITERATIONS);
  if (!material) return;

  let tokenCipher: string | undefined;
  let tokenIv: string | undefined;
  if (input.token) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = await sc.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      material.aesKey,
      new TextEncoder().encode(input.token)
    );
    tokenCipher = toB64(sealed);
    tokenIv = toB64(iv);
  }

  const entry: CachedCredential = {
    waiterId: input.waiterId,
    name: input.name,
    role: String(input.role || '').toLowerCase(),
    salt: toB64(salt),
    iterations: ITERATIONS,
    hash: material.verifier,
    version: SCHEMA_VERSION,
    tokenCipher,
    tokenIv,
    cafeName: input.cafeName,
    cafeLogo: input.cafeLogo,
    cachedAt: new Date().toISOString(),
  };

  // Bitta xodim uchun bitta yozuv: PIN o'zgarsa eskisi qolib ketmaydi.
  const list = readAll(cafeId).filter((c) => c.waiterId !== entry.waiterId);
  list.push(entry);
  writeAll(cafeId, list);
  resetLock(cafeId);
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
): Promise<OfflineVerifyResult> {
  const lock = offlineLockStatus(cafeId);
  if (lock.locked) {
    return { status: 'locked', retryAfterSeconds: lock.retryAfterSeconds };
  }

  const now = Date.now();
  const sc = subtle();

  for (const entry of readAll(cafeId)) {
    if (now - new Date(entry.cachedAt).getTime() > OFFLINE_LOGIN_MAX_AGE_MS) continue;
    if (opts.requireElevated && !ELEVATED_ROLES.includes(entry.role)) continue;

    const material = await deriveMaterial(pin, fromB64(entry.salt), entry.iterations || ITERATIONS);
    if (!material) break;
    if (!equalConstantTime(material.verifier, entry.hash)) continue;

    let token: string | undefined;
    if (sc && entry.tokenCipher && entry.tokenIv) {
      try {
        const opened = await sc.decrypt(
          { name: 'AES-GCM', iv: fromB64(entry.tokenIv) as unknown as BufferSource },
          material.aesKey,
          fromB64(entry.tokenCipher) as unknown as BufferSource
        );
        token = new TextDecoder().decode(opened);
      } catch {
        // Kalit to'g'ri kelmadi yoki yozuv buzilgan — token yo'q, lekin PIN
        // o'zi to'g'ri, ya'ni xodim oflayn ishlay oladi (navbat keyin ketadi).
        token = undefined;
      }
    }

    resetLock(cafeId);
    return { status: 'ok', credential: entry, token };
  }

  // Xato urinish — hisoblagichni oshiramiz.
  const state = readLock(cafeId);
  const attempts = state.attempts + 1;
  if (attempts >= MAX_OFFLINE_ATTEMPTS) {
    writeLock(cafeId, { attempts: 0, lockedUntil: Date.now() + OFFLINE_LOCKOUT_MS });
    return { status: 'locked', retryAfterSeconds: Math.ceil(OFFLINE_LOCKOUT_MS / 1000) };
  }

  writeLock(cafeId, { attempts, lockedUntil: 0 });
  return { status: 'invalid', remainingAttempts: MAX_OFFLINE_ATTEMPTS - attempts };
}
