# Uzbecano POS Desktop Application

Uzbecano Restoran POS (Point of Sale) kassa va offitsiantlar desktop dasturi. Electron, React, TypeScript va TailwindCSS yordamida yaratilgan.

## 🚀 Asosiy Imkoniyatlar

- **PIN-kod orqali Avtorizatsiya**: Har bir offitsiant o'zining 4 xonali PIN-kodi yordamida dasturga kiradi.
- **Stollar Boshqaruvi**: Zallar kesimida (Asosiy Zal, 2-Qavat, VIP Kabinalar) stollar holatini (Bosh / Band) real-vaqtda ko'rish va boshqarish.
- **Klaviatura Tugmalari (Shortcuts)**:
  - `F1`: Stollar zali
  - `F2`: Kassa va menyu
  - `F3`: Arxiv cheklar
  - `F4`: Z-Hisobot (Kunlik kassa hisoboti)
  - `ESC`: Modal oynalarni yopish
- **Oshxona va Kassa Cheklari (Dual Print)**:
  - Buyurtma oshxonaga yuborilganda faqat oshxona taomlar kvitansiyasi.
  - Stol yopilganda mijoz uchun to'langanlik markirovkasi bo'lgan kassa cheki.
- **Qaytarish (Vozvrat) Tizimi**: Yopilgan cheklarni Admin PIN tasdig'i va sababi bilan qaytarish (Refund).
- **Z-Report (Kunlik hisobot)**: Kunlik sof tushum, qaytarishlar va offitsiantlar tushumini hisoblash.
- **Oflayn Ishlash & Auto-Sync**: Tarmoq uzilganda mahalliy `localStorage` da ishlash va aloqa tiklangach serverga sinxronlash.

## 🛠️ Ishga Tushirish va O'rnatish

### Rivojlantirish rejimi (Development):
```bash
npm install
npm run electron:dev
```

### Windows uchun .exe yig'ish (Build Production):
```bash
npm run dist
```
Tayyor Windows o'rnatuvchi va portable `.exe` fayllar `dist/` jildida shakllanadi.
