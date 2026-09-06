import { describe, it, expect } from 'vitest';
import { CASH_CATEGORIES, cashCategoryLabel, noteRequired } from './cashCategories';

describe('xarajat turkumlari', () => {
  it('serverdagi ro‘yxat bilan bir xil', () => {
    /*
     * Bu ro'yxat uzbecano loyihasidagi `src/lib/cashEntries.ts` ning
     * nusxasi. Ajralib ketsa server yozuvni 400 bilan rad etadi va
     * kassirga sababsiz "saqlanmadi" bo'lib ko'rinadi — shuning uchun
     * o'zgarish shu testni yiqitadi va ikkinchi joyni ham eslatadi.
     */
    expect(CASH_CATEGORIES.map((c) => c.id)).toEqual([
      'sut',
      'obed',
      'ujin',
      'gazli_suv',
      'boshqa',
    ]);
  });

  it('yorliq beriladi', () => {
    expect(cashCategoryLabel('gazli_suv')).toBe('Gazli suv');
    expect(cashCategoryLabel('eskirgan')).toBe('eskirgan');
  });

  it('izoh faqat "Boshqa" da majburiy', () => {
    expect(noteRequired('boshqa')).toBe(true);
    expect(noteRequired('sut')).toBe(false);
  });
});
