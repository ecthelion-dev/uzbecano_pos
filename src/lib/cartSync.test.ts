import { describe, it, expect } from 'vitest';
import { cartToHoldLines, holdLinesToCart, parseHoldItems } from './cartSync';
import type { CartItem, DBProduct } from '../types';

const OSH: DBProduct = {
  id: 'p_osh',
  name: 'Osh',
  price: 35000,
  category: 'Taomlar',
  isAvailable: true,
  variants: [
    { name: 'Standart', price: 35000, isBase: true },
    { name: 'Katta', price: 45000 },
  ],
  addons: [{ name: 'Qatiq', price: 5000 }],
} as any;

const CHOY: DBProduct = {
  id: 'p_choy', name: 'Choy', price: 5000, category: 'Ichimlik', isAvailable: true,
} as any;

const line = (over: Partial<CartItem> = {}): CartItem => ({
  lineId: 'l1',
  product: OSH,
  quantity: 2,
  ...over,
} as CartItem);

describe('savatni yuborishga tayyorlash', () => {
  it('faqat qayta yig‘ish uchun kerak bo‘lgani', () => {
    expect(cartToHoldLines([line()])).toEqual([
      { lineId: 'l1', productId: 'p_osh', quantity: 2 },
    ]);
  });

  it('narx va nom YUBORILMAYDI', () => {
    /*
     * Narx "Tasdiqlash" paytida bazadan qaytadan olinadi. Bu yerda
     * yuborilsa, boshqa qurilma eskirgan narxni haqiqiydek ko'rsatib
     * turgan bo'lardi. Rasm esa base64 bo'lishi mumkin.
     */
    const sent = cartToHoldLines([line()])[0] as any;
    expect(sent.price).toBeUndefined();
    expect(sent.name).toBeUndefined();
    expect(sent.image).toBeUndefined();
  });

  it('o‘lcham, izoh va qo‘shimchalar nom bo‘yicha ketadi', () => {
    const sent = cartToHoldLines([line({
      note: 'Achchiq',
      selectedVariant: { name: 'Katta', price: 45000 },
      selectedAddons: [{ name: 'Qatiq', price: 5000 }],
    })]);
    expect(sent[0]).toEqual({
      lineId: 'l1', productId: 'p_osh', quantity: 2,
      note: 'Achchiq', variant: 'Katta', addons: ['Qatiq'],
    });
  });
});

describe('savatni qayta yig‘ish', () => {
  const menu = [OSH, CHOY];

  it('taom menyudan topiladi', () => {
    const cart = holdLinesToCart([{ lineId: 'l1', productId: 'p_osh', quantity: 2 }], menu);
    expect(cart).toHaveLength(1);
    expect(cart[0].product.name).toBe('Osh');
    expect(cart[0].product.price).toBe(35000);
    expect(cart[0].quantity).toBe(2);
  });

  it('o‘lcham narxi menyudan olinadi', () => {
    // Aynan shu narx muammosi ilgari chekni 45 000 o'rniga 55 000 qilgan
    // edi: o'lcham nomi bo'yicha qaytadan topiladi.
    const cart = holdLinesToCart(
      [{ lineId: 'l1', productId: 'p_osh', quantity: 1, variant: 'Katta' }], menu,
    );
    expect(cart[0].product.price).toBe(45000);
    expect(cart[0].selectedVariant?.name).toBe('Katta');
    expect(cart[0].product.name).toBe('Osh (Katta)');
  });

  it('qo‘shimcha narxi qo‘shiladi', () => {
    const cart = holdLinesToCart(
      [{ lineId: 'l1', productId: 'p_osh', quantity: 1, addons: ['Qatiq'] }], menu,
    );
    expect(cart[0].product.price).toBe(40000);
  });

  it('menyuda yo‘q taom TASHLANADI', () => {
    /*
     * Uni nomsiz qatordek ko'rsatish yomonroq: kassir uni chekka qo'shib
     * yuborar, server esa "bunday taom yo'q" deb butun buyurtmani rad
     * etardi va kassirga sababi ko'rinmasdi.
     */
    const cart = holdLinesToCart([
      { lineId: 'l1', productId: 'o‘chirilgan', quantity: 1 },
      { lineId: 'l2', productId: 'p_choy', quantity: 1 },
    ], menu);
    expect(cart.map((c) => c.product.id)).toEqual(['p_choy']);
  });

  it('noma‘lum o‘lcham asosiy narxga tushadi', () => {
    // Narxni bu yerda o'ylab topib bo'lmaydi.
    const cart = holdLinesToCart(
      [{ lineId: 'l1', productId: 'p_osh', quantity: 1, variant: 'Ulkan' }], menu,
    );
    expect(cart[0].product.price).toBe(35000);
    expect(cart[0].selectedVariant).toBeUndefined();
  });

  it('miqdor kamida bitta', () => {
    const cart = holdLinesToCart([{ lineId: 'l1', productId: 'p_osh', quantity: 0 }], menu);
    expect(cart[0].quantity).toBe(1);
  });

  it('qator belgisi saqlanadi', () => {
    // Miqdorni o'zgartirish shu belgi bo'yicha ishlaydi: yo'qolsa, bir
    // taomning ikki o'lchami bitta qator bo'lib qolardi.
    const cart = holdLinesToCart([
      { lineId: 'a', productId: 'p_osh', quantity: 1 },
      { lineId: 'b', productId: 'p_osh', quantity: 1, variant: 'Katta' },
    ], menu);
    expect(cart.map((c) => c.lineId)).toEqual(['a', 'b']);
  });
});

describe('borib-kelish', () => {
  it('savat o‘zgarmay qaytadi', () => {
    const original = [
      line({ lineId: 'a', note: 'Achchiq' }),
      line({ lineId: 'b', selectedVariant: { name: 'Katta', price: 45000 }, quantity: 1 }),
    ];
    const back = holdLinesToCart(cartToHoldLines(original), [OSH, CHOY]);

    expect(back).toHaveLength(2);
    expect(back[0].note).toBe('Achchiq');
    expect(back[1].product.price).toBe(45000);
    expect(back.map((c) => c.quantity)).toEqual([2, 1]);
  });
});

describe('belgidagi savatni o‘qish', () => {
  it('JSON matn', () => {
    expect(parseHoldItems('[{"lineId":"l1","productId":"p","quantity":1}]')).toHaveLength(1);
  });

  it('buzuq JSON butun zalni yiqitmaydi', () => {
    expect(parseHoldItems('{buzuq')).toEqual([]);
    expect(parseHoldItems(null)).toEqual([]);
    expect(parseHoldItems('')).toEqual([]);
    expect(parseHoldItems(42)).toEqual([]);
  });
});
