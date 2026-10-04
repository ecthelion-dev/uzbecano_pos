/**
 * Kafe kuni (Toshkent) — `YYYY-MM-DD`.
 *
 * Kassa "kechagi savdo hisobidan" xarajatini sanani O'ZI hisoblab yuboradi:
 * oflayn navbat ertasiga yuborilsa, serverda "kecha" siljib ketardi.
 * Server ham shu mintaqada kunni sanaydi (CAFE_TIME_ZONE).
 */
const CAFE_TIME_ZONE = 'Asia/Tashkent';

export function cafeDay(at: Date = new Date()): string {
  // en-CA ataylab: bu til uchun Intl sanani aynan YYYY-MM-DD shaklida beradi.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAFE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function previousCafeDay(at: Date = new Date()): string {
  const d = new Date(`${cafeDay(at)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
