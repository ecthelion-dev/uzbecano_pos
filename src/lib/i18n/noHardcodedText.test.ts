import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

const ROOT = new URL('../../../', import.meta.url).pathname;

/** Chop etiladigan qog'oz — ataylab o'zbekcha, kassirning ekran tili uni o'zgartirmaydi. */
const PRINT_FILES = new Set([
  'KitchenPrintArea.tsx',
  'ArchivePeriodPrintArea.tsx',
  'ReceiptPreviewModal.tsx',
]);

/** Tarjima qilinmaydigan atamalar: brend va uskuna nomlari. */
const ALLOWED = [/^OrderPlus/, /^PLUS$/, /^Bluetooth/, /^XP-58/, /^USB/];

/** Faqat o'zbekchada uchraydigan so'zlar — kod bilan chalkashmaydi. */
const UZ_WORDS =
  /\b(uchun|kerak|yoki|bilan|mumkin|shart|tanlang|kiriting|qilish|qilib|stol|stollar|taom|taomlar|chek|buyurtma|buyurtmalar|kassa|ofitsiant|tushum|savat|yopilgan|ochiq|barcha|hozir|bo'sh|yo'q|haqi|summa|sababi|nomi|soni)\b/i;

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
    .replace(/class(Name)?=\{?[`"'][^`"']*[`"']\}?/g, '');
}

function findHardcoded(source: string): string[] {
  const text = strip(source);
  const found: string[] = [];

  const push = (raw: string) => {
    const v = raw.trim();
    if (!v || ALLOWED.some((re) => re.test(v))) return;
    if (!UZ_WORDS.test(v)) return;
    found.push(v);
  };

  // JSX matn tugunlari: >Matn<
  for (const m of text.matchAll(/>\s*([^<>{}\n][^<>{}\n]{2,90})\s*</g)) push(m[1]);
  // label: "Matn" / title="Matn" / placeholder="Matn"
  for (const m of text.matchAll(
    /(?:label|title|placeholder|aria-label)\s*[:=]\s*["']([^"']{3,90})["']/g,
  )) {
    push(m[1]);
  }
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
