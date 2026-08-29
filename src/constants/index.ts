
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
 * different server by hand.
 */
function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const manual = localStorage.getItem('uzbecano_api_url');
  if (manual && manual.trim()) return manual.trim().replace(/\/+$/, '');

  const fromBuild = (import.meta as any).env?.VITE_API_URL;
  if (fromBuild) {
    const servedLocally = ['localhost', '127.0.0.1', 'tauri.localhost'].includes(window.location.hostname);
    if (servedLocally) return String(fromBuild).replace(/\/+$/, '');
  }

  const isDesktop = ['localhost', '127.0.0.1', 'tauri.localhost', ''].includes(window.location.hostname) || !!(window as any).__TAURI_INTERNALS__;
  if (isDesktop) {
    return 'https://pos.orderplus.uz';
  }

  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

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
