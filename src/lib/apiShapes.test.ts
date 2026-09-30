import { describe, it, expect } from 'vitest';
import { asCafeSettings, asCategoryArray, asProduct, asProductArray } from './apiShapes';

describe('asProduct', () => {
  it("to'g'ri taomni o'qidi", () => {
    const p = asProduct({ id: 'p1', name: 'Osh', category: 'Asosiy', price: 35000 });
    expect(p).toEqual({ id: 'p1', name: 'Osh', category: 'Asosiy', price: 35000 });
  });

  it("nomi, kategoriyasi yoki narxi bo'lmasa taom tashlanadi", () => {
    expect(asProduct({ id: 'p1', category: 'Asosiy', price: 10 })).toBeNull();
    expect(asProduct({ id: 'p1', name: 'Osh', price: 10 })).toBeNull();
    expect(asProduct({ id: 'p1', name: 'Osh', category: 'Asosiy' })).toBeNull();
    expect(asProduct(null)).toBeNull();
    expect(asProduct('Osh')).toBeNull();
  });

  /*
   * Narx matn bo'lib kelishi mumkin ("35000"). Uni tashlab yuborish
   * noto'g'ri bo'lardi: taom menyudan yo'qolardi.
   */
  it("matn bo'lib kelgan narx o'qiladi", () => {
    const p = asProduct({ id: 'p1', name: 'Osh', category: 'Asosiy', price: '35000' });
    expect(p?.price).toBe(35000);
  });

  it('buzilgan variant va qo‘shimchalar olib tashlanadi, qolgani saqlanadi', () => {
    const p = asProduct({
      id: 'p1', name: 'Osh', category: 'Asosiy', price: 30000,
      variants: [{ name: 'Katta', price: 40000 }, { name: 'Buzuq' }, 'nima bu'],
      addons: [{ name: 'Qazi', price: 10000 }, null],
    });
    expect(p?.variants).toEqual([{ name: 'Katta', price: 40000 }]);
    expect(p?.addons).toEqual([{ name: 'Qazi', price: 10000 }]);
  });

  it('isBase faqat true bo‘lganda saqlanadi (server uni rad etadi)', () => {
    const p = asProduct({
      id: 'p1', name: 'Osh', category: 'Asosiy', price: 30000,
      variants: [{ name: 'Standart', price: 30000, isBase: true }],
    });
    expect(p?.variants).toEqual([{ name: 'Standart', price: 30000, isBase: true }]);
  });
});

describe('asProductArray', () => {
  it("ro'yxat bo'lmasa null — chaqiruvchi eski menyuni saqlaydi", () => {
    expect(asProductArray({ xato: 'javob' })).toBeNull();
    expect(asProductArray('xato')).toBeNull();
  });

  it("bo'sh ro'yxat — haqiqiy javob, o'sha holicha qaytadi", () => {
    expect(asProductArray([])).toEqual([]);
  });

  it('buzilgan yozuv tashlanadi, qolgan menyu ishlaydi', () => {
    const list = asProductArray([
      { id: 'p1', name: 'Osh', category: 'Asosiy', price: 35000 },
      { id: 'p2', name: 'Choy' },
    ]);
    expect(list?.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('asCategoryArray', () => {
  it("nomi yo'q kategoriya tashlanadi, id o'rniga nom ishlatiladi", () => {
    const list = asCategoryArray([{ name: 'Asosiy' }, { id: 'x' }]);
    expect(list).toEqual([{ id: 'Asosiy', name: 'Asosiy' }]);
  });
});

describe('asCafeSettings', () => {
  it("xizmat haqi foizi o'qiladi va chegaralanadi", () => {
    expect(asCafeSettings({ serviceFeePercent: 10 })?.serviceFeePercent).toBe(10);
    expect(asCafeSettings({ serviceFeePercent: '10' })?.serviceFeePercent).toBe(10);
    // Manfiy yoki 100 dan katta foiz chekni buzardi.
    expect(asCafeSettings({ serviceFeePercent: -5 })?.serviceFeePercent).toBeUndefined();
    expect(asCafeSettings({ serviceFeePercent: 150 })?.serviceFeePercent).toBeUndefined();
    expect(asCafeSettings({ serviceFeePercent: 'salom' })?.serviceFeePercent).toBeUndefined();
  });

  it("kafe nomi va manzili o'qiladi, bo'sh qiymat tashlanadi", () => {
    const s = asCafeSettings({ name: 'UzBecano', address: '', logo: '  ' });
    expect(s?.name).toBe('UzBecano');
    expect(s?.address).toBeUndefined();
    expect(s?.logo).toBeUndefined();
  });

  it("obyekt bo'lmasa null", () => {
    expect(asCafeSettings(null)).toBeNull();
    expect(asCafeSettings([])).toBeNull();
  });
});
