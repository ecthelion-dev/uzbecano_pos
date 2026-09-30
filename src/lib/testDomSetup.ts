/**
 * UI testlari uchun tayyorgarlik.
 *
 * `lib/` testlari Node muhitida yuradi (`localStorage` stub bilan), chunki
 * ular sof funksiyalarni sinaydi. Komponent esa DOM talab qiladi — shu
 * sababli ikki guruh alohida: `*.test.ts` (node) va `*.dom.test.tsx` (jsdom).
 *
 * Ilgari ikkinchi guruh umuman yo'q edi, ya'ni kassir har kuni bosadigan
 * ekran (App.tsx, modallar) test bilan qulflanmagan edi. `lib/` yashil
 * bo'lishi "hammasi joyida" degani emas edi.
 */

// `toBeInTheDocument` kabi matcherlar vitest'ning `expect` iga qo'shiladi.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Har testdan keyin DOM tozalanadi.
 *
 * Tozalanmasa keyingi test oldingi komponentning qoldiqlarini ko'radi va
 * `getByRole` "bir nechta element topildi" deb yiqiladi — ya'ni xato testda
 * emas, iflos DOMda bo'ladi.
 */
afterEach(() => {
  cleanup();
});
