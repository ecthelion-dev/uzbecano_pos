# OrderPlus POS

OrderPlus restoran kassa tizimi — brauzerdan o'rnatiladigan PWA. React, Vite, TypeScript va TailwindCSS.

Manzil: https://pos.orderplus.uz

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
npm run dev
```

### Mahalliy yig'ish
```bash
npm run tauri build
```
Tayyor o'rnatuvchilar `src-tauri/target/release/bundle/` ichida shakllanadi
(`nsis/*.exe`, `msi/*.msi`; macOS'da `macos/*.app` va `dmg/*.dmg`).

### Reliz chiqarish (GitHub)

Reliz **faqat teg push qilinganda** yaratiladi. Shoxobchaga oddiy push
build'ni tekshiradi va artefakt qoldiradi, lekin reliz yaratmaydi — ilgari
har push bir xil `v1.0.0` relizini qayta yozib ketardi va kafe qaysi build
o'rnatganini aniqlashning imkoni yo'q edi.

```bash
npm version 1.0.1 --no-git-tag-version   # versiya faqat package.json da
git commit -am "release: v1.0.1"
git tag v1.0.1
git push && git push --tags
```

Versiya bitta joyda — `package.json` da. `src-tauri/tauri.conf.json` uni
o'sha yerdan o'qiydi, ya'ni teg, o'rnatuvchi fayl nomi va ilova ichidagi
versiya doim bir xil bo'ladi.

GitHub Actions Windows build'ini yig'ib, relizni **qoralama** holida
qo'yadi. Uni o'zingiz o'rnatib ko'ring, keyin Releases sahifasida "Publish"
bosing — tekshirilmagan build kassaga tushmasligi uchun shunday qilingan.
Har safar relizni avtomatik nashr qilishni istasangiz, ish oqimidagi
`releaseDraft: true` ni `false` ga o'zgartiring.

### Imzolash (SmartScreen ogohlantirishi)

Hozircha o'rnatuvchi **imzolanmagan**. Windows uni birinchi marta ochganda
"Windows protected your PC" ekranini ko'rsatadi va kafe "More info → Run
anyway" bosishga majbur bo'ladi. Bu ilovaning ishlashiga xalaqit bermaydi,
lekin ishonchni pasaytiradi va yangi o'rnatishlarni qiyinlashtiradi.

Buni yopish uchun Windows uchun **Authenticode kod imzolash sertifikati**
kerak (yiliga taxminan $200–400; Sectigo, DigiCert, SSL.com). 2023 yildan
beri sertifikat kaliti apparat tokenda yoki bulutli HSM da saqlanishi shart,
ya'ni uni oddiy fayl sifatida GitHub Actions ga qo'yib bo'lmaydi. Ikkita
amaliy yo'l bor:

1. **Azure Trusted Signing** — CI uchun eng qulayi, oyiga ~$10 dan
   boshlanadi. `tauri.conf.json` da `bundle > windows > signCommand` orqali
   ulanadi va sirlar GitHub secrets da qoladi.
2. **Apparat token** — arzonroq chiqishi mumkin, lekin build'ni token
   ulangan mashinada qilishga to'g'ri keladi, ya'ni GitHub Actions da
   ishlamaydi.

Sertifikat olinmagunicha ish oqimida imzolash bilan bog'liq hech qanday
sozlama yo'q — bo'sh plumbing qoldirilmadi.

macOS uchun alohida narsa kerak: Apple Developer ID sertifikati va
notarizatsiya (yiliga $99). Hozir `.app` va `.dmg` imzosiz chiqadi va
Gatekeeper ularni bloklaydi.
