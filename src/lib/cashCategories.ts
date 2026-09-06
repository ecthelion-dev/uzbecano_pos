/**
 * Kassa xarajat turkumlari.
 *
 * Ro'yxat serverdagi `src/lib/cashEntries.ts` bilan BIR XIL bo'lishi shart —
 * ikkita loyiha, ikkita nusxa. Ajralib ketsa, kassa jo'natgan turkumni
 * server tanimay 400 qaytaradi va kassirga "saqlanmadi" bo'lib ko'rinadi.
 *
 * Shuning uchun ikkita himoya bor: server noma'lum turkumni ATAYLAB rad
 * etadi (jimgina "Boshqa" ga aylantirmaydi), va bu yerdagi ro'yxat test
 * bilan qulflangan.
 */
export const CASH_CATEGORIES = [
  { id: 'sut', label: 'Sut' },
  { id: 'obed', label: 'Obed' },
  { id: 'ujin', label: 'Ujin' },
  { id: 'gazli_suv', label: 'Gazli suv' },
  { id: 'boshqa', label: 'Boshqa' },
] as const;

export type CashCategoryId = (typeof CASH_CATEGORIES)[number]['id'];

/** Izohsiz ma'nosini yo'qotadigan yagona turkum. */
export const CATEGORY_NEEDING_NOTE = 'boshqa';

export function cashCategoryLabel(id: string): string {
  return CASH_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Turkum uchun izoh majburiymi. */
export function noteRequired(category: string): boolean {
  return category === CATEGORY_NEEDING_NOTE;
}
