
const LOCAL_HOSTS = ['localhost', '127.0.0.1', 'tauri.localhost', ''];

/** Ishlab chiqarishdagi yagona backend. */
const PRODUCTION_API_URL = 'https://pos.orderplus.uz';

/**
 * Kassani qo'lda boshqa serverga burish uchun sozlama kaliti.
 *
 * Nomi mijozning emas, loyihaning nomini olib yuradi. Eskisi hali ham
 * o'qiladi, aks holda allaqachon sozlab qo'yilgan kassalar yangilanishdan
 * keyin standart manzilga qaytib ketardi.
 */
const API_URL_KEY = 'orderplus_api_url';
const LEGACY_API_URL_KEY = 'uzbecano_api_url';

function readManualApiUrl(): string | null {
  try {
    const current = localStorage.getItem(API_URL_KEY);
    if (current && current.trim()) return current;

    const legacy = localStorage.getItem(LEGACY_API_URL_KEY);
    if (legacy && legacy.trim()) {
      localStorage.setItem(API_URL_KEY, legacy);
      localStorage.removeItem(LEGACY_API_URL_KEY);
      return legacy;
    }
  } catch {
    /* localStorage yopiq */
  }
  return null;
}

/**
 * Qo'lda kiritilgan manzil faqat shu shartlarga javob bersa qabul qilinadi.
 *
 * Ilgari bu sozlama istalgan qiymatni qabul qilar edi — ya'ni
 * localStorage ga yoza olgan odam kassani o'z serveriga burib, xodimlarning
 * PIN kodlarini yig'ib olishi mumkin edi. Endi faqat orderplus.uz domeni
 * (majburiy https) yoki ishlab chiquvchining local mashinasi o'tadi.
 */
function isAllowedApiUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (LOCAL_HOSTS.includes(url.hostname)) {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  if (url.protocol !== 'https:') return false;
  return url.hostname === 'orderplus.uz' || url.hostname.endsWith('.orderplus.uz');
}

/**
 * Where the till talks to the server.
 *
 * Empty means same-origin: every call becomes `/api/...`, which nginx on
 * pos.orderplus.uz proxies to the app. That is the right default because it
 * needs no CORS, survives a domain change, and cannot point at a machine that
 * is not the one serving the page.
 *
 * VITE_API_URL is baked into the bundle at build time, so a stale `.env` on a
 * developer's laptop once shipped `http://localhost:3000` to production: every
 * installed PWA then tried to reach its own device and found nothing. A build
 * value is therefore only honoured when the page is itself served from
 * localhost — on a real host it is ignored no matter what was compiled in.
 *
 * localStorage still wins over both, for a till that must be pointed at a
 * different server by hand — but only within the allowlist above.
 */
function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const manual = readManualApiUrl();
  if (manual) {
    const clean = manual.trim().replace(/\/+$/, '');
    if (isAllowedApiUrl(clean)) return clean;
    // Yaroqsiz qiymat jimgina ishlatilmaydi: uni qoldirsak kassa har safar
    // yuklanganda o'sha manzilga urinaveradi.
    try { localStorage.removeItem(API_URL_KEY); } catch { /* ignore */ }
  }

  const fromBuild = (import.meta as any).env?.VITE_API_URL;
  if (fromBuild) {
    const servedLocally = ['localhost', '127.0.0.1', 'tauri.localhost'].includes(window.location.hostname);
    const clean = String(fromBuild).replace(/\/+$/, '');
    if (servedLocally && isAllowedApiUrl(clean)) return clean;
  }

  const isDesktop = LOCAL_HOSTS.includes(window.location.hostname) || !!(window as any).__TAURI_INTERNALS__;
  if (isDesktop) {
    return PRODUCTION_API_URL;
  }

  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Tauri/Electron ichida ishlayotganini bildiradi (brauzer tab emas). */
export const IS_DESKTOP_APP =
  typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

export const DEFAULT_CAFE_ID = 'uzbecano';

/**
 * Kassa qaysi kafega ulanganini aniqlaydi.
 *
 * Bu blok ilgari App.tsx da yetti marta nusxalangan edi — har bir useState
 * boshlang'ich qiymati o'zining nusxasini saqlar, ya'ni qoidani bir joyda
 * o'zgartirish qolganlarini eskiligicha qoldirardi.
 */
export function resolveActiveCafeId(): string {
  if (typeof window === 'undefined') return DEFAULT_CAFE_ID;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('cafe') || params.get('cafeId');
    if (fromUrl && fromUrl.trim()) return fromUrl.trim().toLowerCase();
    const stored = localStorage.getItem('orderplus_cafe_id');
    if (stored && stored.trim()) return stored.trim().toLowerCase();
  } catch {
    /* localStorage yopiq bo'lsa standart kafe */
  }
  return DEFAULT_CAFE_ID;
}

/**
 * An order in a terminal state is finished business and no longer holds its
 * table. Checking for 'served' alone left a cancelled order counting as the
 * table's active ticket: the table stayed "band" and the cashier's next order
 * attached itself to a cancelled one.
 */
export const TERMINAL_ORDER_STATUSES = ['served', 'cancelled'];

export function isActiveOrder(status: string | null | undefined): boolean {
  if (!status) return false;
  return !TERMINAL_ORDER_STATUSES.includes(status);
}
