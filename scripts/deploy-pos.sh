#!/usr/bin/env bash
#
# Deploy the POS PWA on the VPS. Run it ON the server.
#
# nginx pos.orderplus.uz ni to'g'ridan-to'g'ri git checkout ichidagi
# dist-react papkasidan beradi. Shu sababli oddiy `npm run build` xavfli:
# vite.config.ts da `emptyOutDir: true`, ya'ni build birinchi navbatda
# dist-react ni O'CHIRADI va yig'ish tugagunicha sayt yo'q bo'lib turadi.
# Kassa aynan o'sha soniyada sahifani yangilasa, oq ekran ko'radi.
#
# Shuning uchun yangi build yonidagi papkaga yig'iladi va tayyor bo'lgach
# joyiga suriladi — saytsiz qolish vaqti ikkita `mv` orasidagi millisoniya.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/uzbecano_pos}"
NEW_DIR="$APP_DIR/dist-react.new"
OLD_DIR="$APP_DIR/dist-react.old"

cd "$APP_DIR"

echo "==> Kod tortilmoqda"
git pull

echo "==> Bog'liqliklar"
npm ci

echo "==> Yig'ilmoqda ($NEW_DIR)"
rm -rf "$NEW_DIR"
npm run build -- --outDir "$NEW_DIR" --emptyOutDir

# Yig'ilgani haqiqatan ishlaydigan build ekaniga ishonch: index.html yo'q
# bo'lsa, almashtirishdan oldin to'xtaymiz — buzuq build bilan tirik saytni
# almashtirgandan ko'ra eski versiya turgani ming marta yaxshi.
if [ ! -f "$NEW_DIR/index.html" ]; then
  echo "  XATO: $NEW_DIR/index.html yo'q — almashtirilmadi, sayt tegilmadi"
  exit 1
fi

echo "==> Almashtirilmoqda"
rm -rf "$OLD_DIR"
[ -d "$APP_DIR/dist-react" ] && mv "$APP_DIR/dist-react" "$OLD_DIR"
mv "$NEW_DIR" "$APP_DIR/dist-react"

echo "==> Tekshiruv"
for path in / /index.html /manifest.json; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://pos.orderplus.uz$path")
  printf "  %-16s %s\n" "$path" "$code"
  if [ "$code" != "200" ]; then
    echo "  XATO: $path $code — eski versiya qaytarilmoqda"
    rm -rf "$APP_DIR/dist-react"
    mv "$OLD_DIR" "$APP_DIR/dist-react"
    exit 1
  fi
done

rm -rf "$OLD_DIR"
echo "==> Tayyor: $(git log --oneline -1)"
