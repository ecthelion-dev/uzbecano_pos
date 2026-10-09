import { defineConfig } from 'vitest/config';

/*
 * Oflayn ssenariylar: haqiqiy Postgres va haqiqiy API (../uzbecano) bilan.
 * Sekin va tashqi muhit talab qiladi, shuning uchun oddiy `npm test` ga
 * kirmaydi: `npm run test:offline`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/offline/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
