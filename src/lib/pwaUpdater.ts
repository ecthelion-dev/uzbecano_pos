import { IS_DESKTOP_APP } from '../constants';

/**
 * Brauzerdagi PWA uchun yangilanishni aniqlab, ekranni qayta yuklaydi.
 *
 * `public/sw.js` yangi versiya sezilgach darhol faollashadi (`skipWaiting`
 * + `clients.claim()`), lekin bu ALLAQACHON OCHIQ sahifaning ishga tushgan
 * JS kodini almashtirmaydi — yangi worker faqat KEYINGI so'rovlarni ushlab
 * oladi. Kassir smenani tugatmasdan ilovani yopmaydi, brauzer esa
 * yangilanishni faqat navigatsiyada yoki ~24 soatlik fon tekshiruvida
 * qidiradi — shuning uchun serverga chiqargan tuzatish mobil kassa
 * ekranida kunlab ko'rinmay qolardi.
 *
 * Shu yerda ikkita narsa qo'shiladi: faol, tez-tez tekshiruv (interval va
 * sahifa qayta ko'ringanda) va yangi worker nazoratni olganda BIR MARTA
 * avtomatik qayta yuklash — kassir hech nima bosmaydi, xuddi desktop
 * ilovadagi avto-yangilash kabi (`autoUpdater.ts`). Savat va stol holati
 * diskda saqlangani uchun (`carts`) qayta yuklash ma'lumot yo'qotmaydi.
 */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function initPwaUpdater(): void {
  if (IS_DESKTOP_APP) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // Controller yo'qdan paydo bo'lishi — birinchi marta o'rnatilishi, yangilanish
  // emas. O'shanda qayta yuklashning hojati yo'q: ekranda almashtiradigan
  // eski kod hali yo'q.
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;
  let reloaded = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtLoad || reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready.then((registration) => {
    const check = () => {
      void registration.update();
    };

    setInterval(check, CHECK_INTERVAL_MS);

    // Fonga ketib, keyin qaytgan sahifa (mobilda eng ko'p uchraydigan holat)
    // navigatsiya qilmasdan tekshiruvni o'zi qo'zg'atadi.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  });
}
