# Kassa — kafe ichidagi markaz: reja

> Holat: taklif (2026-10-08), savollarga javob olindi (2026-10-11). Kod hali boshlanmagan.

## 1. Muammo

2026-10-08 da Uzbecano'da kafe interneti 18:17 dan 20:04 gacha (1 soat 47 daqiqa)
uzildi. Kassa kompyuteri oflayn ishladi, ofitsiantlarning telefonlari esa mobil
internet orqali serverda ishlashda davom etdi. Ikkalasi bir stolni (Terassa 1)
ochdi. Internet qaytgach server kassaning chekini "stolda ochiq buyurtma bor"
deb rad etdi, taomlar ikki joyda qoldi va 5 ta chek tiqilib qoldi.

Sabab arxitekturada: **har bir qurilma to'g'ridan-to'g'ri internetdagi serverga
ulanadi, kafe ichida markaz yo'q.** Internet uzilsa, "haqiqat" ikkiga bo'linadi.

Poster, iiko, R-Keeper kabi tizimlarda markaz kafeda: ofitsiant qurilmalari
asosiy kassaga **kafe Wi-Fi'si (lokal tarmoq)** orqali ulanadi. Tashqi internet
uzilsa ham kafe ichi ishlaydi, haqiqat bitta joyda turadi.

## 2. Maqsad

```
Hozir:                              Maqsad:

 telefon ──┐                         telefon ──┐
 telefon ──┼──► internet ──► server  telefon ──┼──► kassa (markaz) ──► internet ──► server
 kassa  ───┘                                    └── kafe Wi-Fi ──┘
```

- Kafe ichidagi barcha qurilmalar ochiq buyurtmalarni **kassadan** oladi va kassaga yozadi.
- Bulut (server) faqat kassa bilan sinxronlanadi: hisobot, admin panel, zaxira.
- Internet uzilsa kafe ishlashda davom etadi va ziddiyat chiqmaydi.

## 3. Asosiy qarorlar

### 3.1 Telefon kassaga qanday ulanadi

Hozirgi PWA HTTPS sahifa. Brauzer HTTPS sahifadan lokal tarmoqdagi `http://192.168.x.x`
ga so'rov yuborishga ruxsat bermaydi (mixed content va Private Network Access).

| Variant | Qanday | Afzallik | Kamchilik |
|---|---|---|---|
| **A. Ofitsiant sahifasini kassa beradi** (tavsiya) | Kassa `http://<kassa-IP>:PORT` da ofitsiant sahifasini ochadi, telefon uni brauzerda ochadi | Telefonga hech narsa o'rnatilmaydi, mavjud React kodidan foydalaniladi | Oddiy `http`: service worker va "ilovani o'rnatish" bo'lmaydi; kassa IP o'zgarsa manzil o'zgaradi |
| B. Alohida Android ilova | Ilova Wi-Fi orqali kassaga to'g'ridan-to'g'ri ulanadi | Eng barqaror, kassani o'zi topadi | Ilova yozish, Play Market, iPhone uchun alohida |
| C. Lokal HTTPS | Kassada o'z sertifikati | PWA o'zgarishsiz | Har telefonga sertifikat o'rnatish kerak, amalda ishlamaydi |

**Tavsiya: A dan boshlash.** B keyinroq, agar A yetmasa.

Cheklov WebSocket'ga ham tegishli: HTTPS sahifa `ws://192.168.x.x` ga ham ulana olmaydi.
A variantida sahifaning o'zi `http` bo'lgani uchun bu muammo emas. Lekin `http` sahifada
service worker ishlamaydi, ya'ni sahifa kassadan har safar yangidan yuklanadi.

### 3.2 Telefon kassani qanday topadi

- Kassa ekranida QR-kod: `http://192.168.1.25:7420`. Ofitsiant smena boshida bir marta skaner qiladi.
- Routerda kassa kompyuteriga **doimiy IP** (DHCP reservation) berish kerak, aks holda manzil o'zgarib turadi.
- `.local` nomlari (mDNS) Android'da ishonchsiz, unga tayanmaymiz.

### 3.3 Kim "haqiqat"

- **Ochiq buyurtmalar** (stollar, savat, oshxona) — kassada. Telefon faqat kassadan o'qiydi va kassaga yozadi.
- **Yopilgan cheklar, hisobot, menyu, xodimlar, tariflar** — bulutda, kassa ularni yuklab oladi.
- Telefon kassaga ulana olmasa (masalan, Wi-Fi'dan tashqarida): bulutga **faqat o'qish** uchun ulanadi va ogohlantirish chiqadi. Hozirgi "kassa uzilgan" banneri shu yerda qayta ishlatiladi. Stolni ochish bulutda emas, faqat markazda bo'ladi, aks holda muammo qaytadi.
- **Telefon markazni ko'rmasa, yozuvni o'z navbatiga ham qo'ymaydi.** "Keyin yuboraman" deb
  saqlangan buyurtma — markazdan bexabar ikkinchi haqiqat, ya'ni 10-08 dagi xatoning o'zi.
  Telefondagi IndexedDB faqat o'qish keshi bo'lib qoladi. (Tashqi maslahatda telefonga
  navbat taklif qilingan edi — shu sababdan rad etildi.)

### 3.3a Bulut markaz rejimini biladi

Faqat telefonni cheklash yetmaydi: mobil internetdagi telefon markazni umuman ko'rmaydi va
bulutga to'g'ridan-to'g'ri yozishga urinadi. Shuning uchun:

- Kafe sozlamasida `hubMode` bayrog'i (`Cafe` jadvalida, standart — o'chiq).
- Bayroq yoqilgan kafeda bulut API ochiq buyurtmalarga yozishni (`POST /api/orders`,
  `PATCH .../addItems`, yopish) **faqat markaz qurilmasidan** qabul qiladi. Markaz o'zini
  juftlashda olgan qurilma tokeni bilan tanitadi. Boshqa qurilmaga aniq xato qaytadi va
  telefon "kafe Wi-Fi'siga ulaning" deb ko'rsatadi.
- Bayroq bulut tomonda birinchi chiqadi (CLAUDE.md: API o'zgarishi kassadan oldin), kassa
  esa uni keyin yoqadi — aks holda yangi kassa eski serverda jimgina ishlamay qoladi.

### 3.3b Oflayn pul hisobi

Hozir summani faqat server hisoblaydi va mijozning summasiga ishonmaydi. Markaz internet
yo'qligida ham chek yopishi kerak, demak summani u ham hisoblaydi:

- Bu hisob mantig'ining **uchinchi nusxasi** bo'ladi (API `apps/api/src/common/`, Next
  `src/lib/`, endi kassa). Nusxalar ajralib ketmasligi uchun bir xil kirish → bir xil
  natija testlari (umumiy test vektorlari JSON faylda) uchala joyda ham ishlaydi.
- Sinxron paytida bulut summani o'zi qayta hisoblaydi. Farq chiqsa chek rad etilmaydi
  (pul allaqachon olingan), lekin audit yozuvi va admin panelda ogohlantirish bo'ladi.

### 3.4 Kassa ichida nima bo'ladi

- Tauri ichida kichik HTTP server (Rust, `axum`), faqat lokal tarmoqda.
- Ochiq buyurtmalar uchun lokal baza (SQLite). Hozirgi `localStorage` navbati u yerga ko'chadi.
- Lokal API bulut API bilan **bir xil shaklda**: `POST /api/orders` (`idempotencyKey`),
  `PATCH { addItems, appendKey }`, `version` bilan optimistik qulf. Telefon kodida faqat
  manzil o'zgaradi. Yangi `/local/*` shakllari yoki `operationId` kiritilmaydi — bular
  bizda allaqachon bor.
- Rust tomonda `rusqlite` + `axum`: kassa bitta jarayon, `sqlx` ning asinxron puli shart emas.
  "Bir stolda bitta ochiq buyurtma" SQLite'da qisman unikal indeks bilan qulflanadi.
- `kvStore` dagi `localStorage` nusxasi ataylab saqlanadi (eski versiyaga qaytganda smena
  yo'qolmasin) — SQLite'ga ko'chishda ham bu qoida saqlanadi.
- Bulut bilan sinxron hozirgi `syncCycle` mantiqi asosida, lekin endi faqat kassadan.
- Chop etish soddalashadi: telefon chekni to'g'ridan-to'g'ri kassaga beradi, bulutdagi `PrintJob` navbati kerak bo'lmaydi.

### 3.5 Xavfsizlik

- Lokal server faqat xodim PIN sessiyasi bilan ishlaydi. Oflayn PIN tekshiruvi (`offlineAuth.ts`) allaqachon bor.
- Mehmonning QR menyusi bunga ulanmaydi.
- Port faqat lokal tarmoqqa ochiladi. Windows Firewall bir marta ruxsat so'raydi.
- Noto'g'ri PIN uchun urinishlar soni cheklanadi (serverdagidek).

## 4. Bosqichlar

| # | Ish | Taxminiy muddat |
|---|---|---|
| 0 | Tayyorgarlik: kafe Wi-Fi va router, kassaga doimiy IP, telefonlar Wi-Fi'da ishlashini tekshirish | 1–2 kun |
| 1 | Kassada lokal server: sog'liq tekshiruvi, PIN bilan kirish, firewall | 1 hafta |
| 2 | Ochiq buyurtmalar lokal bazada; telefon uchun API (stollar, yaratish, taom qo'shish, yopish, pulse) — bulut API bilan bir xil shakl | 1.5–2 hafta |
| 3 | Ofitsiant sahifasini kassa beradi (mavjud PWA build, manzil kassaga qaratilgan) va QR orqali ulanish | 1 hafta |
| 4 | Bulut bilan sinxron faqat kassadan; ziddiyat qoidalari; eski to'g'ridan-to'g'ri yo'l bayroq ostida | 1–2 hafta |
| 5 | Uzbecano'da sinov: internetni ataylab uzib ko'rish, o'lchash, qaytish yo'li tayyor | 1–2 hafta |

**Jami: taxminan 6–8 hafta.** Har bosqich alohida chiqadi va bayroq bilan o'chirib qo'yiladi,
ya'ni ish o'rtasida kafe to'xtamaydi.

## 5. Xavflar

- **Kassa kompyuteri o'chsa** — markaz yo'qoladi. Telefonlar bulutga faqat o'qish uchun o'tadi va ogohlantiradi. Ikkinchi kassa bo'lsa, u zaxira markaz bo'lishi mumkin (keyingi bosqich).
- **Kassa diski buzilsa** — bulutga sinxronlanmagan ochiq buyurtmalar yo'qolishi mumkin. Har bir o'zgarish internet bo'lsa darhol bulutga ketadi, xavf faqat uzilish paytidagi ma'lumotda.
- **Kassa IP o'zgarishi** — doimiy IP va QR orqali qayta ulanish.
- **Ikki yo'l (eski va yangi) bir vaqtda** — murakkablik oshadi. Sinovdan keyin eski yo'l olib tashlanadi.
- **Bir nechta filial** — har filialda o'z markazi, bulut ularni birlashtiradi (hozirgidek).

## 6. Hozircha qilingan himoya (2026-10-08)

1. "Stol band" 409 endi navbatda aylanmaydi, "Rad etilgan amallar"ga chiqadi; kassir "Savatga yuklash" bilan hal qiladi (kassa 1.4.113).
2. Telefonlar server orqali kassa uzilganini biladi va "kassa uzilgan, yangi stolni kassir bilan kelishib oching" banneri chiqadi (PWA, darhol).
3. Kassa oflayn bo'lsa o'zida ham shunday banner (kassa 1.4.114).
4. Tashkiliy: kafe uchun zaxira 4G router; internet uzilganda yangi stolni bitta qurilmadan ochish.

## 7. Javoblar (2026-10-08)

- **Ofitsiantlar telefoni:** har xil — kimdir kafe Wi-Fi'sida, kimdir mobil internetda.
  **Oqibati:** lokal markaz faqat Wi-Fi'dagi telefonga ishlaydi. Shuning uchun
  "ish paytida telefon kafe Wi-Fi'siga ulangan bo'lsin" — majburiy qoida bo'ladi.
  Mobil internetdagi telefon bulutga faqat o'qish uchun ulanadi va ogohlantiriladi
  (3.3), stol ocholmaydi — aks holda bugungi muammo qaytadi. Sinov bosqichida
  (6-bo'lim, 1-qadam) Wi-Fi'ga o'tkazish xodimlarga qanchalik qulayligini ham ko'ramiz.
- **Kassa kompyuteri kun bo'yi yoniq:** ha — markaz uchun asosiy shart bajarilgan.

## 8. Javoblar (2026-10-11)

- **Telefonlar:** aralash — Android ham, iPhone ham.
  **Oqibati:** A varianti ikkalasida ham ishlaydi (oddiy brauzer). B varianti iPhone
  uchun qimmat: Apple developer hisobi (yiliga $99), App Store/TestFlight tekshiruvi,
  har yangilanish yana tekshiruvdan o'tadi.
- **Kassa kompyuterlari:** hozircha bitta; boshqa restoranlarda qancha bo'lishi
  noma'lum.
  **Oqibati:** har kafeda BITTA markaz. Ikkinchi kassa kompyuteri qo'shilsa u
  markazning mijozi bo'ladi, ikkinchi markaz emas. Lokal API bulut API bilan bir xil
  shaklda bo'lgani uchun bu yo'l keyin ham ochiq — hozir qo'shimcha ish shart emas.
- **A yetarlimi:** egasi maslahat so'radi. **Qaror: A dan boshlaymiz** — bitta kafe,
  bitta kassa sinov uchun eng toza sharoit; A ishlasa B kerak emas, ishlamasa nima
  yetishmasligini aniq bilamiz.

### A varianti — `http` sahifadagi cheklovlar (kod tekshirildi, 2026-10-11)

Sahifa `http://192.168.x.x` dan ochilgani uchun brauzer ba'zi imkoniyatlarni beradi:

| Imkoniyat | Kassada qayerda | `http` da | Holat |
|---|---|---|---|
| `crypto.randomUUID` | chek, to'lov, xarajat id lari | yo'q — chek ochish yiqilardi | **tuzatildi** (`lib/uuid.ts`, kassa `778e158`) |
| `crypto.subtle` | oflayn PIN tekshiruvi | yo'q | muammo emas: markazda PIN ni kassa tekshiradi |
| Kamera (`getUserMedia`) | promo-kod QR skaneri | yo'q | kod qo'lda kiritiladi |
| Service worker | PWA keshi | yo'q | sahifa har safar kassadan yuklanadi — normal |

iPhone'ga xos: Safari fondagi tabni tez to'xtatadi — ofitsiant ilovaga qaytganda
sahifa qayta ulanishi kerak (nabz buni o'zi qiladi, sinovda kuzatiladi). Ekran
o'chsa ulanish uziladi — Android'da ham.

**B ga o'tish belgilari** (sinovda kuzatiladi): ofitsiantlar har smenada sahifani
qayta ochishdan charchaydi; kassa IP o'zgarib turadi; Safari uzilishlari ishga
xalaqit beradi. Unda Tauri 2 mobil bilan shu koddan ilova yig'iladi.

## 9. Keyingi qadam

0-bosqich (kafedagi ish): routerda kassa kompyuteriga doimiy IP (DHCP reservation)
va "ish paytida telefon kafe Wi-Fi'sida" qoidasi.
