import { describe, it, expect } from 'vitest';
import { buildVariants } from './productVariants';

/**
 * Kassirga ko'rinadigan o'lchamlar ro'yxati.
 *
 * Ro'yxat noto'g'ri bo'lsa kassir noto'g'ri narxni uradi — bu to'g'ridan
 * to'g'ri chekdagi summa.
 */
describe("o'lchamlar ro'yxati", () => {
  it("o'lchamsiz taomda ro'yxat umuman bo'lmaydi", () => {
    // Kassir bitta bosish bilan qo'shadi, tanlash oynasi ochilmaydi.
    expect(buildVariants({ price: 35000, sizes: null })).toBeUndefined();
    expect(buildVariants({ price: 35000, sizes: '[]' })).toBeUndefined();
  });

  it("asosiy narxni ro'yxat boshiga qo'yadi", () => {
    const variants = buildVariants({
      price: 15000,
      sizes: JSON.stringify([{ label: 'Katta', price: 18000 }]),
    });
    expect(variants).toEqual([
      { name: 'Standart', price: 15000, isBase: true },
      { name: 'Katta', price: 18000 },
    ]);
  });

  it("asosiy narx o'lchamlardan biriga teng bo'lsa ikki marta chiqmaydi", () => {
    /*
     * Adminkada narxlar bitta ro'yxat bo'lgach, tahrirlovchi "Standart"
     * qatorini o'chirishi mumkin — o'shanda asosiy narx birinchi
     * o'lchamnikiga teng bo'ladi. Kassirga ikkita bir xil narx chiqsa, u
     * qaysinisini bosishni bilmaydi, chekda esa nomlar farq qilardi.
     */
    const variants = buildVariants({
      price: 240000,
      sizes: JSON.stringify([{ label: '1 kg', price: 240000 }, { label: '2 kg', price: 450000 }]),
    });
    expect(variants!.map((v) => v.name)).toEqual(['1 kg', '2 kg']);
    expect(variants!.some((v) => v.isBase)).toBe(false);
  });

  it("nomsiz o'lchamni tashlaydi", () => {
    const variants = buildVariants({
      price: 15000,
      sizes: JSON.stringify([{ label: '  ', price: 20000 }, { label: 'Katta', price: 18000 }]),
    });
    expect(variants!.map((v) => v.name)).toEqual(['Standart', 'Katta']);
  });

  it('buzilgan matn kassani yiqitmaydi', () => {
    expect(buildVariants({ price: 15000, sizes: 'not json' })).toBeUndefined();
  });

  it("narxi yo'q o'lcham asosiy narxni oladi", () => {
    const variants = buildVariants({
      price: 15000,
      sizes: JSON.stringify([{ label: 'Katta' }]),
    });
    // Narx bir xil bo'lgani uchun "Standart" alohida taklif emas.
    expect(variants).toEqual([{ name: 'Katta', price: 15000 }]);
  });
});
