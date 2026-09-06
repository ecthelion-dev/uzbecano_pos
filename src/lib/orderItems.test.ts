import { describe, it, expect } from 'vitest';
import { adoptServerId, cartLineToOrderItem, sentItemToOrderItem, outgoingSize } from './orderItems';
import type { CartItem } from '../types';

/**
 * O'lcham serverga yetib borishi.
 *
 * Bu eng jimgina pul xatosi edi: kassir "Katta" tanlaydi, mijoz 25 000
 * so'm to'laydi, chek ham 25 000 chiqadi — lekin serverga o'lcham
 * yuborilmagani uchun savdo 20 000 bo'lib yoziladi. Ekranda ham, kunlik
 * hisobotda ham kam ko'rinadi, va hech qayerda "xato" degan belgi yo'q.
 *
 * Shuning uchun bu yerdagi har bir tekshiruv bitta savolga javob beradi:
 * server taomni QAYSI narxda yozadi.
 */

function line(over: Partial<CartItem> = {}): CartItem {
  return {
    lineId: 'l1',
    product: { id: 'p_mojito', name: 'Mojito', price: 20000 } as any,
    quantity: 1,
    ...over,
  };
}

describe('yangi qator', () => {
  it('tanlangan o‘lcham yuboriladi', () => {
    const out = cartLineToOrderItem(line({
      selectedVariant: { name: 'Katta', price: 25000 },
    }));
    expect(out.selectedSize).toEqual({ label: 'Katta' });
    expect(out.productId).toBe('p_mojito');
  });

  it('ASOSIY narx o‘lcham sifatida yuborilmaydi', () => {
    /*
     * "Standart" — kassa qo'shgan yozuv, bazada bunday o'lcham yo'q.
     * Yuborilsa server "bunday o'lcham mavjud emas" deb butun buyurtmani
     * rad etadi va kassir taomni umuman yoza olmaydi.
     */
    const out = cartLineToOrderItem(line({
      selectedVariant: { name: 'Standart', price: 20000, isBase: true },
    }));
    expect(out.selectedSize).toBeUndefined();
  });

  it('o‘lchamsiz taom o‘lchamsiz yuboriladi', () => {
    expect(cartLineToOrderItem(line()).selectedSize).toBeUndefined();
  });

  it('bo‘sh yorliq yuborilmaydi', () => {
    // Bo'sh satr ham serverni rad javobiga olib borardi.
    const out = cartLineToOrderItem(line({ selectedVariant: { name: '   ', price: 1 } }));
    expect(out.selectedSize).toBeUndefined();
  });

  it('miqdor va izoh saqlanadi', () => {
    const out = cartLineToOrderItem(line({ quantity: 3, note: 'muzsiz' }));
    expect(out.quantity).toBe(3);
    expect(out.note).toBe('muzsiz');
  });
});

describe('allaqachon yuborilgan qator', () => {
  it('o‘lchami saqlanib qoladi', () => {
    /*
     * Stolga ikkinchi marta taom qo'shilganda server BARCHA qatorni
     * qaytadan narxlaydi. O'lcham shu yerda tushib qolsa, avval yozilgan
     * "Katta" taomlar jimgina asosiy narxga tushardi — ya'ni stolga bir
     * piyola choy qo'shish oldingi kokteyllarni arzonlashtirardi.
     */
    const out = sentItemToOrderItem({
      productId: 'p_mojito', name: 'Mojito', price: 25000, quantity: 1,
      selectedSize: { label: 'Katta' },
    });
    expect(out.selectedSize).toEqual({ label: 'Katta' });
  });

  it('server "notes" deb yozgan izohni yo‘qotmaydi', () => {
    // Kassa `note`, server `notes`. Bittasini o'qib ikkinchisini unutish
    // oshxonaga noto'g'ri taom chiqishi demakdir.
    expect(sentItemToOrderItem({ name: 'Choy', notes: 'issiq' }).note).toBe('issiq');
  });

  it('o‘lchamsiz qator o‘lchamsiz qoladi', () => {
    expect(sentItemToOrderItem({ name: 'Choy', price: 8000 }).selectedSize).toBeUndefined();
  });

  it('"Standart" deb yozilgan qator ham qaytariladi', () => {
    /*
     * Serverning O'ZI o'lchamli taomga "Standart" yorlig'ini qo'yadi, va
     * uni qaytarganimizda ham u yana o'sha yorliqni qo'yadi — narx esa
     * asosiy narx bo'lib qolaveradi. Ya'ni bu xavfsiz: qatorni
     * o'zgartirmaydi.
     */
    const out = sentItemToOrderItem({ name: 'Mojito', selectedSize: { label: 'Standart' } });
    expect(out.selectedSize).toEqual({ label: 'Standart' });
  });
});

describe('o‘lcham qoidasi', () => {
  it('bo‘sh va yo‘q holatlar', () => {
    expect(outgoingSize(null)).toEqual({});
    expect(outgoingSize(undefined)).toEqual({});
    expect(outgoingSize({ name: 'Katta' })).toEqual({ selectedSize: { label: 'Katta' } });
    expect(outgoingSize({ name: 'Katta', isBase: true })).toEqual({});
  });
});

/**
 * Serverning id sini o'zlashtirish.
 */
describe('server id si', () => {
  const resWith = (body: any) => new Response(JSON.stringify(body), {
    status: 201, headers: { 'content-type': 'application/json' },
  });

  it('mahalliy id serverniki bilan almashtiriladi', async () => {
    /*
     * Buni qilmaslik stolni serverda ochiq qoldirardi: to'lov so'rovi
     * kassaning tasodifiy id siga ketar va 400 bo'lib qaytardi. Kassada
     * stol yopilgandek ko'rinar, hisobotda esa to'lanmagan bo'lib turardi.
     */
    const order = { id: 'mahalliy-uuid' } as { id: string; dailyNumber?: number };
    await adoptServerId(resWith({ id: 'cmt9serverid', dailyNumber: 7 }), order);
    expect(order.id).toBe('cmt9serverid');
    expect(order.dailyNumber).toBe(7);
  });

  it('javob buzuq bo‘lsa mahalliy id qoladi', async () => {
    // Xato tashlash bu yerda stolni umuman yopilmay qoldirardi.
    const order = { id: 'mahalliy-uuid' };
    const bad = new Response('<html>502</html>', { status: 201 });
    await expect(adoptServerId(bad, order)).resolves.toBeUndefined();
    expect(order.id).toBe('mahalliy-uuid');
  });

  it('id yo‘q javob mahalliy id ni buzmaydi', async () => {
    const order = { id: 'mahalliy-uuid' };
    await adoptServerId(resWith({ dailyNumber: 3 }), order);
    expect(order.id).toBe('mahalliy-uuid');
  });

  it('nol chek raqami yozilmaydi', async () => {
    // Oflayn buyurtmada raqam yo'q. 0 ni yozib qo'yish chekka "№ 0"
    // bosardi — raqamsiz chek bundan yaxshiroq.
    const order: { id: string; dailyNumber?: number } = { id: 'x' };
    await adoptServerId(resWith({ id: 'y', dailyNumber: 0 }), order);
    expect(order.dailyNumber).toBeUndefined();
  });
});

/**
 * Kassadan serverga ketadigan HAR BIR taom shu fayldan o'tishi.
 *
 * Bu tekshiruv aynan shu xato uch marta qaytgani uchun yozildi. O'lcham
 * yuborilishini bir joyda tuzatgan edim va sinovlarim o'tgan edi — lekin
 * ular faqat YORDAMCHINI sinardi. Stolni "Tasdiqlash"siz yopish esa
 * boshqa yo'ldan ketardi va o'sha yo'l taomni o'zi yig'ib, o'lchamni
 * `selectedVariant` deb yuborardi. Server bunday nomni bilmaydi.
 *
 * Shuning uchun qoida: `App.tsx` serverga yuboriladigan taom obyektini
 * O'ZI yasamaydi. Yasasa — shu test yiqiladi.
 */
describe('yuborish yo‘llari', () => {
  it('App.tsx taom obyektini o‘zi yasamaydi', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../App.tsx', import.meta.url), 'utf-8');

    // `productId` — faqat serverga ketadigan qatorda bo'ladi.
    expect(src.includes('productId:')).toBe(false);

    // `selectedVariant` faqat SAVAT qatorida saqlanadi (kassaning ichki
    // ishi), serverga ketadigan obyektda emas.
    const variantUses = src.match(/selectedVariant:/g) || [];
    expect(variantUses.length).toBe(1);

    // Va yordamchilar haqiqatan ishlatilyapti.
    expect(src.includes('cartLineToOrderItem')).toBe(true);
    expect(src.includes('sentItemToOrderItem')).toBe(true);
    expect(src.includes('adoptServerId')).toBe(true);
  });
});
