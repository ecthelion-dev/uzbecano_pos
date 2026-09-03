#!/usr/bin/env bash
#
# Kassa PWA'sini serverda yig'adi va o'rniga qo'yadi.
#
# Kassa IKKI yo'l bilan yetkaziladi va ular mustaqil:
#   Windows ilovasi — `v*` tegi qo'yilganda GitHub Actions yig'adi va
#                     avtomatik yangilanish orqali kassaga tushadi.
#   PWA            — pos.orderplus.uz shu papkani statik tarqatadi, ya'ni
#                     uni ANIQ shu skript yig'masa, hech kim yig'maydi.
#
# Ikkinchisi yozilmagani uchun bir kunda PWA o'n to'rt commit orqada qolib
# ketdi: Windows ilovasida chek tuzatilgan, oshxona buyurtmasi chiqadigan
# bo'lgan, PWA esa eski versiyani ko'rsatib turgan. Repo ildizidagi
# `vercel.json` bu chalkashlikni kuchaytiradi — jonli manzil Vercel emas.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/uzbecano_pos}"
LIVE="$APP_DIR/dist-react"
NEW="$APP_DIR/dist-react-new"
OLD="$APP_DIR/dist-react-old"

cd "$APP_DIR"

echo "==> Kod tortilmoqda"
git pull

echo "==> Paketlar"
npm ci --silent

# Kassa moliyaviy hisob yuritadi. Yig'ilgan, lekin testdan o'tmagan kod
# qog'ozga noto'g'ri summa bosishi mumkin — shuning uchun tekshiruv shart.
echo "==> Tekshiruv"
npx tsc --noEmit
npx vitest run --reporter=dot

# Vite `outDir` ni TOZALAYDI. To'g'ridan-to'g'ri jonli papkaga yig'ilsa,
# nginx bir necha o'n soniya davomida hech nima topmaydi va o'sha paytda
# ochilgan kassa bo'sh sahifa ko'radi. Shuning uchun yon papkaga yig'iladi.
echo "==> Yig'ilmoqda"
rm -rf "$NEW" "$OLD"
npx vite build --outDir "$NEW" --emptyOutDir

if [ ! -f "$NEW/index.html" ]; then
  echo "  XATO: yig'ilgan papkada index.html yo'q — o'rniga qo'yilmadi"
  exit 1
fi

# Ochiq turgan kassa eski index.html ni ushlab turgan bo'lishi mumkin va u
# nomida hash bo'lgan fayllarni so'raydi. Ular o'chib ketsa, so'rov 404
# qaytaradi va kassir "tugma bosilmayapti" degan holatga tushadi — xatosiz,
# tushuntirishsiz. Eski fayllar shuning uchun olib qo'yiladi.
if [ -d "$LIVE/assets" ]; then
  echo "==> Ochiq kassalar uchun eski fayllar saqlanmoqda"
  mkdir -p "$NEW/assets"
  cp -rn "$LIVE/assets/." "$NEW/assets/" 2>/dev/null || true
fi

echo "==> O'rniga qo'yilmoqda"
if [ -d "$LIVE" ]; then mv "$LIVE" "$OLD"; fi
mv "$NEW" "$LIVE"
rm -rf "$OLD"

# Tekshiruv jonli manzil orqali. 127.0.0.1 ga urinish 301 qaytaradi —
# nginx HTTP'ni HTTPS'ga yo'naltiradi, ya'ni o'sha tekshiruv hech nima
# tasdiqlamaydi va birinchi yurgizishda shunday bo'ldi ham.
echo "==> Tekshiruv"
BASE="https://pos.orderplus.uz"
# Vite yo'lni `./assets/...` deb yozadi, boshida `/` bilan emas.
ASSET=$(grep -o 'assets/[^"]*\.js' "$LIVE/index.html" | head -1)
FAILED=0
for path in / /manifest.json /sw.js "/$ASSET"; do
  [ "$path" = "/" ] || [ -n "${path#/}" ] || continue
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$path")
  printf "  %-40s %s\n" "$path" "$CODE"
  [ "$CODE" = "200" ] || FAILED=1
done
if [ "$FAILED" != "0" ]; then
  echo "  XATO: yuqoridagi manzillardan biri 200 qaytarmadi"
  exit 1
fi

echo "==> Versiya"
node -e 'console.log("  package.json:", require("./package.json").version)'
git log --oneline -1
