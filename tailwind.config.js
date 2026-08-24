/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f1f5f9',
      },
      // Kod bo'ylab ishlatilgan, lekin Tailwind 3 da mavjud bo'lmagan o'lchovlar.
      // Ularsiz telefonda bosish animatsiyasi va soyalar umuman ishlamayapti edi.
      scale: {
        98: '.98',
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.06)',
        '2xs': '0 1px 1px 0 rgb(15 23 42 / 0.04)',
      },
      blur: {
        xs: '2px',
      },
      // Modallar animate-fadeIn / animate-scaleUp ishlatadi, lekin bu
      // animatsiyalar hech qayerda ta'riflanmagan edi.
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn .15s ease-out',
        scaleUp: 'scaleUp .18s ease-out',
        slideUp: 'slideUp .24s cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [],
}
