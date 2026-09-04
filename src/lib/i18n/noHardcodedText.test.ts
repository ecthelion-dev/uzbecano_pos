import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
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
 *
 * Chop etiladigan qog'oz ham shu ro'yxatda. Ilgari uch fayl istisno edi —
 * "chek fizik hujjat, ekran tili unga tegmasin" degan mulohaza bilan. Amalda
 * kassir ruscha ishlab, mijozga o'zbekcha chek uzatardi; istisno esa buni
 * xato emas, qoida deb yozib qo'ygan edi.
 */

// `.pathname` Windows'da "/C:/..." beradi va `join` buni tushunmaydi.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

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
  // Faqat uskuna nomining o'zi. Ilgari bu `/^Bluetooth/` edi va shu so'z
  // bilan boshlangan HAR QANDAY jumlani o'tkazib yuborardi — "Bluetooth
  // printerga ulanib bo'lmadi" xato yozuvi shu teshikdan chiqib ketgan.
  /^Bluetooth$/,
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

/**
 * Ekranga yoki qog'ozga matn chiqaradigan `.ts` fayllar.
 *
 * Qolgan `.ts` lar skanerdan tashqarida: ular kalitlar, id'lar va ichki
 * qiymatlar bilan ishlaydi va tekshiruv u yerda faqat shovqin bo'lardi.
 * `printer.ts` esa chekni o'zi quradi — aynan shu yerda yorliq qotirib
 * qo'yilsa, kassa hech nima demaydi, faqat qog'oz noto'g'ri chiqadi.
 */
const SCANNED_TS = new Set(['printer.ts']);

/**
 * Bitta faylga tegishli istisnolar.
 *
 * `printer.ts` da eski standart sarlavha va pastki yozuv matnlari turadi:
 * ular ekranga chiqmaydi, diskda yotgan "hech kim yozmagan" qiymatni tanish
 * uchun kerak. Istisno ataylab shu faylga bog'langan — umumiy ro'yxatga
 * qo'yilsa, o'sha jumla komponentga qaytib yozilganda qo'riqchi jim qolardi.
 */
const ALLOWED_IN: Record<string, RegExp[]> = {
  'printer.ts': [/^Xush kelibsiz!$/, /^Tashrifingiz uchun rahmat!$/],
};

function textFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...textFiles(full));
    else if (name.endsWith('.tsx') || SCANNED_TS.has(name)) out.push(full);
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

function findHardcoded(source: string, fileName = ''): string[] {
  const text = strip(source);
  const allowed = [...ALLOWED, ...(ALLOWED_IN[fileName] ?? [])];
  const found: string[] = [];

  const push = (raw: string) => {
    const v = raw.trim();
    if (!v || allowed.some((re) => re.test(v))) return;
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
  const files = textFiles(join(ROOT, 'src'));

  it('tekshiriladigan komponentlar topildi', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  for (const file of files) {
    const short = file.slice(ROOT.length);
    it(`${short}: o‘zbekcha matn lug‘atdan keladi`, () => {
      expect(findHardcoded(readFileSync(file, 'utf-8'), basename(file))).toEqual([]);
    });
  }
});
