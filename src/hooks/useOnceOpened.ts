import { useState } from 'react';

/**
 * Bayroq birinchi marta `true` bo'lgandan keyin doim `true` qaytaradi.
 *
 * Og'ir modallar `React.lazy` bilan yuklanadi, ya'ni ularning kodi faqat
 * render qilinganda tarmoqdan keladi. Yopiq modalni baribir render qilsak
 * kod ilova ochilishida yuklanib ketadi va bo'lishdan foyda qolmaydi.
 * Faqat `isOpen` bo'yicha render qilsak, yopilganda modal o'chib ketadi va
 * ichki holat (tanlangan davr, qidiruv, yozilayotgan forma) yo'qoladi —
 * ilgari esa u yopilgandan keyin ham holatini saqlardi.
 *
 * Shuning uchun modal birinchi ochilishda o'rnatiladi va undan keyin
 * o'rnatilgan holda qoladi; o'zini ko'rsatish-ko'rsatmaslikni `show` hal qiladi.
 */
export function useOnceOpened(isOpen: boolean): boolean {
  const [hasOpened, setHasOpened] = useState(isOpen);
  // Render paytida o'rnatiladi: `useEffect` bo'lganda modal birinchi ochilgan
  // kadrda bir lahza yo'q bo'lib turardi.
  if (isOpen && !hasOpened) setHasOpened(true);
  return hasOpened || isOpen;
}
