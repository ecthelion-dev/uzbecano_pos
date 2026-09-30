import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    /**
     * Ikki guruh, ikki muhit.
     *
     * `lib` — sof funksiyalar (narx, sinxronizatsiya, saqlash). Node yetadi:
     * sinaladigan kod DOM ga emas, WebCrypto va localStorage ga tayanadi.
     *
     * `ui` — komponentlar. DOM kerak, shuning uchun jsdom. Bu guruh ilgari
     * umuman yo'q edi: 500 dan ortiq test yashil bo'lsa ham kassir bosadigan
     * ekran hech qanday tekshiruvsiz qolgan edi.
     */
    projects: [
      {
        test: {
          name: 'lib',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.dom.test.tsx'],
          setupFiles: ['./src/lib/testDomSetup.ts'],
        },
      },
    ],
  },
});
