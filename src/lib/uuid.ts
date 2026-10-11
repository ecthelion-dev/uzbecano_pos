/**
 * Yangi UUID v4 — chek, to'lov, navbat yozuvi va qurilma nomlari uchun.
 *
 * `crypto.randomUUID` faqat xavfsiz kontekstda (https, localhost) mavjud.
 * Lokal markazda ofitsiant sahifasi kassadan `http://192.168.x.x` orqali
 * ochiladi va u yerda bu funksiya yo'q: to'g'ridan-to'g'ri chaqiruv chek
 * ochishni `TypeError` bilan yiqitardi. `getRandomValues` esa har qanday
 * kontekstda ishlaydi, shuning uchun zaxira yo'l unga tayanadi.
 *
 * Natija har doim haqiqiy UUID v4: server buyurtma id sini UUID sifatida
 * tekshiradi, ya'ni "noyob satr" yetmaydi.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versiya 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 varianti
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
