import { describe, it, expect } from 'vitest';
import {
  cashCategoryLabel,
  normalizeCategory,
  categoryKey,
  dedupeCategories,
} from './cashCategories';

describe('xarajat turkumlari', () => {
  it('nom o‘zgarmaydi', () => {
    expect(cashCategoryLabel('Moshina yog‘i')).toBe('Moshina yog‘i');
  });

  it('eski mashina nomlari o‘qiladigan bo‘lib chiqadi', () => {
    // Bazadagi yozuv o'zgartirilmaydi, faqat ekranda ko'rinishi tuzatiladi.
    expect(cashCategoryLabel('gazli_suv')).toBe('Gazli suv');
    expect(cashCategoryLabel('sut')).toBe('Sut');
  });

  it('ortiqcha bo‘sh joy tozalanadi', () => {
    expect(normalizeCategory('  Non   olish ')).toBe('Non olish');
  });

  it('bir xil nom har xil harf bilan yozilsa ham bitta turkum', () => {
    expect(categoryKey('SUT')).toBe(categoryKey('sut'));
  });

  it('ro‘yxatda bir xil nom ikki marta chiqmaydi', () => {
    expect(dedupeCategories(['Sut', 'sut', 'SUT', 'Obed'])).toEqual(['Sut', 'Obed']);
  });

  it('bo‘sh nom ro‘yxatga tushmaydi', () => {
    expect(dedupeCategories(['  ', null, undefined, 'Sut'])).toEqual(['Sut']);
  });
});
