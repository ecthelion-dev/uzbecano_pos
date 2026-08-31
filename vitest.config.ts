import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node muhiti yetadi: sinaladigan kod DOM ga emas, WebCrypto va
    // localStorage ga tayanadi. WebCrypto Node da global bor, localStorage esa
    // har bir testda o'zi qo'yiladigan oddiy stub — jsdom keltirish uchun
    // sabab yo'q.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
