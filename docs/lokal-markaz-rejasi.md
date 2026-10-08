# Kassa — kafe ichidagi markaz: reja

> Holat: taklif (2026-10-08). Hali boshlanmagan.

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

### 3.2 Telefon kassani qanday topadi

- Kassa ekranida QR-kod: `http://192.168.1.25:7420`. Ofitsiant smena boshida bir marta skaner qiladi.
- Routerda kassa kompyuteriga **doimiy IP** (DHCP reservation) berish kerak, aks holda manzil o'zgarib turadi.
- `.local` nomlari (mDNS) Android'da ishonchsiz, unga tayanmaymiz.

### 3.3 Kim "haqiqat"

- **Ochiq buyurtmalar** (stollar, savat, oshxona) — kassada. Telefon faqat kassadan o'qiydi va kassaga yozadi.
- **Yopilgan cheklar, hisobot, menyu, xodimlar, tariflar** — bulutda, kassa ularni yuklab oladi.
- Telefon kassaga ulana olmasa (masalan, Wi-Fi'dan tashqarida): bulutga **faqat o'qish** uchun ulanadi va ogohlantirish chiqadi. Hozirgi "kassa uzilgan" banneri shu yerda qayta ishlatiladi. Stolni ochish bulutda emas, faqat markazda bo'ladi, aks holda muammo qaytadi.

### 3.4 Kassa ichida nima bo'ladi

- Tauri ichida kichik HTTP server (Rust, `axum`), faqat lokal tarmoqda.
- Ochiq buyurtmalar uchun lokal baza (SQLite). Hozirgi `localStorage` navbati u yerga ko'chadi.
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

## 8. Hali ochiq savollar

1. Ofitsiantlarda Android'mi, iPhone ham bormi?
2. Kafeda bir nechta kassa kompyuteri bo'ladimi?
3. A varianti (telefon brauzerida, ilovasiz) yetarlimi yoki alohida ilova kerakmi?
