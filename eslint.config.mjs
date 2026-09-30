import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Lint qoidalari.
 *
 * Loyihada lint umuman yo'q edi va bir necha xato shu sababdan jimgina
 * o'tib ketgan: `py-0.2` (Tailwind'da bunday o'lchov yo'q), `scale-102`
 * (config'da faqat 98 bor), `sm:text-[11px]` — uchalasi ham hech narsa
 * qilmayotgan klass, ya'ni ekranda ko'zga tashlanmagan holda ishlamay
 * turgan edi. Ularni `tailwindcss/no-unknown-classes` ushlaydi.
 *
 * Qoidalar ataylab ikki guruhga bo'lingan: xato (CI yiqiladi) va ogohlantirish
 * (ko'rib chiqiladi, lekin buildni to'xtatmaydi). Ogohlantirishlar shovqin
 * bo'lib qolsa, ular ham xatoga aylanadi — aks holda hech kim qaramaydi.
 */
export default tseslint.config(
  {
    ignores: [
      'dist-react/**',
      'node_modules/**',
      'src-tauri/target/**',
      // Vite `public/` ni o'zgartirmasdan ko'chiradi: service worker oddiy
      // brauzer skripti, modul emas.
      'public/**',
      'scripts/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      /**
       * Ishlatilmagan o'zgaruvchi — xato.
       *
       * `tsconfig` da `noUnusedLocals` o'chiq, ya'ni buni faqat shu qoida
       * ushlaydi. `catch (e)` va `_` bilan boshlanadigan argumentlar
       * mustasno: ular ataylab qoldiriladi (masalan, e'tiborsiz qoldirilgan
       * xatoni nomlash uchun).
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
        },
      ],

      // `any` hali ko'p (asinxron javoblar, printer xom baytlari). Uni
      // taqiqlash o'rniga ko'rinadigan qilib turamiz.
      '@typescript-eslint/no-explicit-any': 'warn',

      /**
       * React Compiler qoidalari — hozircha ogohlantirish.
       *
       * Ular kodni kompilyator uchun tayyorlaydi (setState'ni effektda
       * chaqirmaslik, render paytida ref yozmaslik, `Date.now()` kabi
       * impure funksiyani renderda ishlatmaslik). Ro'yxat katta va uni bir
       * kunda tuzatish App.tsx ni butunlay qayta yozishni talab qiladi.
       * Xato qilib qo'yilsa, kassa jimgina buziladi — shuning uchun
       * bosqichma-bosqich: hozir ko'rinadi, keyin tuzatiladi.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Bular xato: hooklar tartibi buzilsa React butunlay yiqiladi.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // `catch {}` — ataylab: zaxira yo'l (masalan, localStorage to'lgan).
      // Izohi kodda turadi, lintni esa bu bilan shovqin qilmaymiz.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-duplicate-imports': 'error',
    },
  },

  // Sozlama fayllari — Node muhiti, CommonJS (`module.exports`).
  {
    files: ['*.config.js', '*.config.cjs', '*.config.mjs', '*.config.ts', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.commonjs },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },

  // Testlar: `describe/it/expect` global, `any` bilan mock qulay.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
);
