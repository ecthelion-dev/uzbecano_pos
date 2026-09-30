import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ikonka-only tugmalar ekran o'quvchi uchun nomsiz qolmasin.
 *
 * Ilovada 150 dan ortiq tugma bor va ularning ko'pi faqat ikonka: yopish,
 * o'chirish, orqaga, qidiruv. Ko'z bilan qaragan odam ikonkani taniydi,
 * ekran o'quvchi esa "button" deb o'qiydi — nom bo'lmasa kassir qaysi
 * tugmani bosayotganini bilib bo'lmaydi. Telefonda `title` ham
 * ko'rinmaydi (hover yo'q), ya'ni u yagona izoh edi.
 *
 * Tekshiruv shu sababli matn sifatida emas, QOIDANI o'qiydi: tugma ichida
 * matn ham, ifoda ham bo'lmasa, uning `aria-label` i bo'lishi shart.
 */
function componentFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...componentFiles(full));
    else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

/** Faqat ikonka qolgan tugmalar: matn ham, `{ifoda}` ham yo'q. */
function unnamedIconButtons(source: string): string[] {
  const found: string[] = [];
  for (const m of source.matchAll(/<button\b([^>]*?)>([\s\S]*?)<\/button>/g)) {
    const attrs = m[1];
    const inner = m[2];
    if (attrs.includes('aria-label')) continue;
    if (/\{[^{}]*\}/.test(inner)) continue;
    if (inner.replace(/<[^>]+>/g, '').trim()) continue;
    if (!/<[A-Z]/.test(inner)) continue;
    found.push(inner.replace(/\s+/g, ' ').trim().slice(0, 40));
  }
  return found;
}

describe('ikonka-only tugmalar', () => {
  const files = componentFiles(join(process.cwd(), 'src'));

  it('tekshiriladigan komponentlar topildi', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  for (const file of files) {
    const short = file.slice(file.indexOf('/src/') + 1);
    it(`${short}: har bir ikonka tugmada aria-label bor`, () => {
      expect(unnamedIconButtons(readFileSync(file, 'utf-8'))).toEqual([]);
    });
  }
});
