import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Ekranga chiqadigan matn lug'atdan kelishi kerak.
 *
 * Bu tekshiruv ikki marta qo'ldan chiqib ketgani uchun yozildi. Ikkalasida
 * ham lug'atda kalit BOR edi — `table.busy`, `common.cash` — shunchaki
 * komponent uni ishlatmagan, ya'ni "tarjima qilindi" degan xulosa kalitlar
 * soniga qarab chiqarilgan, ekranga qarab emas. Kassir esa ruscha tanlab,
 * o'zbekcha yozuvlarni ko'rib turgan.
 *
 * Shuning uchun bu yerda lug'at emas, KOMPONENTLAR o'qiladi: JSX matni va
 * `label`/`title`/`placeholder` qiymatlarida o'zbekcha so'z qolgan bo'lsa,
 * test yiqiladi.
 */

// `.pathname` Windows'da "/C:/..." beradi va `join` buni tushunmaydi.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Chop etiladigan qog'oz — ataylab o'zbekcha, kassirning ekran tili uni o'zgartirmaydi. */
const PRINT_FILES = new Set([
  'KitchenPrintArea.tsx',
  'ArchivePeriodPrintArea.tsx',
  'ReceiptPreviewModal.tsx',
]);

/**
 * Tarjima qilinmaydiganlar.
 *
 * Brend va uskuna nomlaridan tashqari ikki tur bor va ikkalasi ham ataylab:
 *
 *   - Ma'lumot: standart stol nomi va chekdagi zaxira zal nomi. Bular
 *     yozuv emas, qiymat — biri holatda saqlanadi, ikkinchisi qog'ozga
 *     bosiladi.
 *   - Qaytarish sabablari: tanlangani buyurtma bilan birga saqlanadi va
 *     hisobotga tushadi. Tarjima qilinsa, bazada kassirning o'sha kungi
 *     ekran tiliga qarab har xil matn yotardi. To'g'ri yechim — sababni
 *     id bilan saqlab, ekranda tarjima qilish; u alohida ish.
 */
const ALLOWED = [
  /^OrderPlus/,
  /^PLUS$/,
  /^Bluetooth/,
  /^XP-58/,
  /^USB/,
  /^Stol \d+$/,
  /^Zal$/,
  /^Mijoz rad etdi$/,
  /^Sifat yetarsiz$/,
  /^Xato to'lov$/,
];

/**
 * Faqat o'zbekchada uchraydigan so'zlar.
 *
 * Ro'yxat bir marta kengaytirilgan: birinchi variantida "naqd", "karta" va
 * "so'm" yo'q edi va aralash to'lov oynasi ruscha sarlavha ostida
 * "Naqd: 0" deb turganini test sezmadi.
 */
const UZ_WORDS =
  /\b(uchun|kerak|yoki|bilan|mumkin|shart|tanlang|kiriting|qilish|qilib|stol|stollar|taom|taomlar|chek|buyurtma|buyurtmalar|kassa|kassir|ofitsiant|tushum|savat|yopilgan|ochiq|barcha|hozir|bo'sh|yo'q|haqi|summa|sababi|nomi|soni|naqd|karta|aralash|pul|miqdori|jami|to'lov|qaytarish|smena|hisobot|printer(i|ga|dan)|oshxona|zal|mijoz|xarajat|kirim|chiqim)\b/i;

/** Kod bo'lagining belgilari — ekrandagi yozuvda bunday narsalar bo'lmaydi. */
const LOOKS_LIKE_CODE =
  /[;={}]|=>|\b(const|let|return|useState|useMemo|function|import)\b|\.\w+\(/;

/** Valyuta har doim lug'atdan: u qisqa va kichik harfli, umumiy qoidaga tushmaydi. */
const CURRENCY = /\bso['’‘]m\b/;

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full));
    else if (name.endsWith('.tsx') && !PRINT_FILES.has(name)) out.push(full);
  }
  return out;
}

/** Izohlar va `className` qiymatlari matn emas — ular olib tashlanadi. */
function strip(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/class(Name)?=\{?[`"'][^`"']*[`"']\}?/g, '')
    // `console.warn(...)` — dasturchi uchun, kassir ekranida ko'rinmaydi.
    .replace(/console\.\w+\([^)]*\)/g, '');
}

function findHardcoded(source: string): string[] {
  const text = strip(source);
  const found: string[] = [];

  const push = (raw: string) => {
    const v = raw.trim();
    if (!v || ALLOWED.some((re) => re.test(v))) return;
    // `>` va `<` TSX'da taqqoslash va generiklarda ham uchraydi, ya'ni
    // "matn" deb kod bo'lagi tutilishi mumkin. Kodga o'xshaganini tashlaymiz.
    if (LOOKS_LIKE_CODE.test(v)) return;
    if (CURRENCY.test(v)) return found.push(v) && undefined;
    // Ichki id'lar ("naqd", "karta") kichik harfli va bo'shliqsiz bo'ladi;
    // ekrandagi yozuv esa yo bosh harfdan boshlanadi, yo bir necha so'zli.
    const looksLikeLabel = /^[A-ZА-Я\u00C0-\u024F]/.test(v) || v.includes(' ');
    if (looksLikeLabel && UZ_WORDS.test(v)) found.push(v);
  };

  // JSX matni. Ifodalar olib tashlanadi, chunki matn ular bilan aralash
  // keladi: `{summa.toLocaleString()} so'm` — bu ham ekrandagi yozuv.
  for (const m of text.matchAll(/>([^<]{1,400})</g)) {
    const withoutExpr = m[1].replace(/\{[^{}]*\}/g, ' ');
    push(withoutExpr.replace(/\s+/g, ' '));
  }
  // Qatorli qiymatlar. Har bir tirnoq turi alohida: o'zbekcha matnda `'`
  // harf sifatida keladi ("bo'sh") va aralash naqsh qatorni o'rtasidan
  // kesib, "ljallangan..." kabi soxta topilmalar yasardi.
  for (const m of text.matchAll(/"([^"\n]{3,120})"/g)) push(m[1]);
  for (const m of text.matchAll(/'([^'\n]{3,120})'/g)) push(m[1]);
  for (const m of text.matchAll(/`([^`\n]{3,120})`/g)) push(m[1].replace(/\$\{[^}]*\}/g, ' '));

  return found;
}

describe('ekranda qotirilgan matn', () => {
  const files = tsxFiles(join(ROOT, 'src'));

  it('tekshiriladigan komponentlar topildi', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  for (const file of files) {
    const short = file.slice(ROOT.length);
    it(`${short}: o‘zbekcha matn lug‘atdan keladi`, () => {
      expect(findHardcoded(readFileSync(file, 'utf-8'))).toEqual([]);
    });
  }
});
