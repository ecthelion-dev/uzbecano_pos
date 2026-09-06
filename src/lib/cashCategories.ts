/**
 * Xarajat turkumlari.
 *
 * Qat'iy ro'yxat yo'q — nomni kassirning o'zi yozadi. Ilgari beshta tugma
 * bor edi (Sut, Obed, Ujin, Gazli suv, Boshqa) va ro'yxatga tushmagan har
 * bir xarajat "Boshqa" ga yig'ilardi, ya'ni eng kerakli savol — "nimaga
 * ketdi" — aynan o'sha yerda javobsiz qolardi.
 *
 * Bir marta yozilgan nom keyingi safar tugma bo'lib chiqadi. Ro'yxat
 * serverdan keladi va u alohida boshqarilmaydi: ro'yxat — kassaning o'zi
 * ishlatgan nomlari.
 */

export const MAX_CATEGORY_LENGTH = 40;

/** Ortiqcha bo'sh joysiz. "Sut" va "Sut " bitta turkum bo'lishi uchun. */
export function normalizeCategory(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

/** Ikki nomni bir xil deb hisoblash uchun — "sut" va "Sut" bitta turkum. */
export function categoryKey(raw: unknown): string {
  return normalizeCategory(raw).toLocaleLowerCase();
}

/**
 * Qat'iy ro'yxat davridan qolgan yozuvlar bazada mashina nomi bilan turadi
 * ("gazli_suv"), ekranda esa odam o'qiydigan nom kerak. Yozuvlarning o'zi
 * o'zgartirilmaydi.
 */
const LEGACY_LABELS: Record<string, string> = {
  sut: 'Sut',
  obed: 'Obed',
  ujin: 'Ujin',
  gazli_suv: 'Gazli suv',
  boshqa: 'Boshqa',
};

export function cashCategoryLabel(id: string): string {
  const clean = normalizeCategory(id);
  return LEGACY_LABELS[clean] ?? clean;
}

/** Takrorlanmaydigan ro'yxat — bir xil nom ikkita tugma bo'lib chiqmasin. */
export function dedupeCategories(names: unknown[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of names || []) {
    const label = cashCategoryLabel(String(raw ?? ''));
    if (!label) continue;
    const key = categoryKey(label);
    if (!seen.has(key)) seen.set(key, label);
  }
  return [...seen.values()];
}
