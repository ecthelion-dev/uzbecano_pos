// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cartLineToOrderItem } from '../../src/lib/orderItems';
import {
  BASE_URL,
  CAFE,
  PRODUCTS,
  clearOrders,
  harnessAvailable,
  query,
  resetDatabase,
  seed,
  serverOrders,
  startApi,
  stopApi,
  tokenFor,
} from './harness';
import { Till, net } from './till';

/*
 * "Yarim internet": Wi-Fi bor, lekin sekin yoki uzilib-ulanadi.
 *
 * 2026-10-16 22:18 — kassa bitta stolga ikkita chek ochdi, to'lov mavjud
 * bo'lmagan chekka ketdi (404), pul kassada qoldi. Sabab: kassa serverga
 * IKKI yo'l bilan yozadi — to'g'ridan-to'g'ri va navbat orqali — va
 * sekin tarmoqda ular bir-birini quvib o'tadi.
 *
 * Bu testlar HAQIQIY hook'larni haqiqiy serverga ishlatadi. Talab: qanday
 * tarmoq bo'lmasin, serverda kassadagi bilan bir xil holat, rad etilgan
 * amal yo'q va server hech qachon "chek topilmadi" demaydi (u Telegram'ga
 * soxta ogohlantirish ham beradi).
 */

vi.mock('../../src/lib/net', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/net')>()),
  fetchWithTimeout: async (input: string, init?: RequestInit) => (await import('./till')).net.fetch(input, init),
}));

const describeOffline = harnessAvailable() ? describe : describe.skip;

const notFound = () => net.writes().filter((e) => e.status === 404);

describeOffline('yarim internet: kassaning haqiqiy hook\'lari haqiqiy serverga', () => {
  const waiter = tokenFor('waiter');
  let till: Till;

  beforeAll(async () => {
    resetDatabase();
    seed();
    await startApi();
  }, 120_000);

  afterAll(() => stopApi());

  beforeEach(() => {
    clearOrders();
    till = new Till(waiter);
  });

  afterEach(() => till.unmount());

  it('T1 javob yo‘qoldi: chek serverga yetdi, kassa bilmadi, keyin to‘lov — bitta to‘langan chek', async () => {
    await till.openTable('Terassa 1');
    await till.addToCart(PRODUCTS.latte);
    net.loseResponses = 1;
    await till.sendToKitchen();
    await till.payCash(PRODUCTS.latte.price);
    await till.syncUntilSettled();

    expect(till.failed()).toEqual([]);
    expect(till.queue()).toEqual([]);
    expect(serverOrders().map((o) => [o.tableNumber, o.status, o.total])).toEqual([
      ['Terassa 1', 'served', PRODUCTS.latte.price],
    ]);
  });

  it('T2 internet qaytgan zahoti: navbatdagi chekka taom va to‘lov — server "topilmadi" demaydi', async () => {
    await till.openTable('Terassa 1');
    till.setOnline(false);
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();

    till.setOnline(true);
    await till.addToCart(PRODUCTS.cappuccino);
    await till.sendToKitchen();
    await till.payCash(PRODUCTS.latte.price + PRODUCTS.cappuccino.price);
    await till.syncUntilSettled();

    expect(notFound()).toEqual([]);
    expect(till.failed()).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([
      ['served', PRODUCTS.latte.price + PRODUCTS.cappuccino.price],
    ]);
  });

  it('T3 tez to‘lov: oshxonaga yuborish tugamay to‘lov bosildi — bitta chek, ikki barobar emas', async () => {
    await till.openTable('Terassa 1');
    await till.addToCart(PRODUCTS.latte);
    net.delayNextMs = 400;
    const dispatch = till.sendToKitchenNoWait();
    await till.payCash(PRODUCTS.latte.price);
    await dispatch;
    await till.syncUntilSettled();

    expect(notFound()).toEqual([]);
    expect(till.failed()).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([['served', PRODUCTS.latte.price]]);
  });

  it('T4 birlashtirish: stoldagi chek boshqa qurilmada to‘langan — eski chek taomlari bilan o‘chib ketmaydi', async () => {
    // Arrange: kassada ikki ochiq stol.
    await till.openTable('Terassa 1');
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();
    await till.openTable('Terassa 2');
    await till.addToCart(PRODUCTS.cappuccino);
    await till.sendToKitchen();
    const target = serverOrders().find((o) => o.tableNumber === 'Terassa 2')!;

    // Ofitsiant telefoni Terassa 2 ni yopdi; kassa hali buni bilmaydi.
    const paid = await fetch(`${BASE_URL}/api/orders/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiter}` },
      body: JSON.stringify({ status: 'served', paymentMethod: 'cash', cashAmount: PRODUCTS.cappuccino.price, cardAmount: 0 }),
    });
    expect(paid.status).toBe(200);

    // Act
    await till.moveTable('Terassa 1', 'Terassa 2', true);
    await till.syncUntilSettled();

    // Assert: Terassa 1 cheki serverda qoldi, birlashtirish rad etilganlarda.
    expect(serverOrders().map((o) => [o.tableNumber, o.status, o.total])).toEqual([
      ['Terassa 1', 'sent_to_kitchen', PRODUCTS.latte.price],
      ['Terassa 2', 'served', PRODUCTS.cappuccino.price],
    ]);
    expect(till.failed().length).toBeGreaterThan(0);
    expect(till.queue()).toEqual([]);
  });

  it('T4b birlashtirish javobi yo‘qoldi — bitta chek, ikkala stol taomlari bilan', async () => {
    await till.openTable('Terassa 1');
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();
    await till.openTable('Terassa 2');
    await till.addToCart(PRODUCTS.cappuccino);
    await till.sendToKitchen();

    net.loseResponses = 1;
    await till.moveTable('Terassa 1', 'Terassa 2', true);
    await till.syncUntilSettled();

    expect(notFound()).toEqual([]);
    expect(till.failed()).toEqual([]);
    // Manba o'chirilmaydi — bekor bo'lib, maqsadga yo'naltirilgan qoladi.
    expect(serverOrders().map((o) => [o.tableNumber, o.status, o.total])).toEqual([
      ['Terassa 1', 'cancelled', PRODUCTS.latte.price],
      ['Terassa 2', 'sent_to_kitchen', PRODUCTS.latte.price + PRODUCTS.cappuccino.price],
    ]);
  });

  /*
   * Phase 2 (2026-10-17): kassa maqsad chekka o'zidagi TO'LIQ ro'yxatni
   * yozardi. Telefon shu orada qo'shgan taom ro'yxatda yo'q edi va o'chib
   * ketardi — mehmon yegan, lekin to'lamagan.
   */
  it('T4c birlashtirish paytida telefon qo‘shgan taom yo‘qolmaydi', async () => {
    await till.openTable('Terassa 1');
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();
    await till.openTable('Terassa 2');
    await till.addToCart(PRODUCTS.cappuccino);
    await till.sendToKitchen();
    const target = serverOrders().find((o) => o.tableNumber === 'Terassa 2')!;

    // Ofitsiant telefoni Terassa 2 ga fruit mix qo'shdi; kassa buni bilmaydi.
    const appended = await fetch(`${BASE_URL}/api/orders/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiter}` },
      body: JSON.stringify({
        addItems: [{ id: PRODUCTS.fruitMix.id, productId: PRODUCTS.fruitMix.id, name: PRODUCTS.fruitMix.name, price: PRODUCTS.fruitMix.price, quantity: 1 }],
        appendKey: 'phone-append-1',
      }),
    });
    expect(appended.status).toBe(200);

    await till.moveTable('Terassa 1', 'Terassa 2', true);
    await till.syncUntilSettled();

    expect(till.failed()).toEqual([]);
    const live = serverOrders().filter((o) => o.status !== 'cancelled');
    expect(live.map((o) => [o.tableNumber, o.total])).toEqual([
      ['Terassa 2', PRODUCTS.latte.price + PRODUCTS.cappuccino.price + PRODUCTS.fruitMix.price],
    ]);
  });

  it('T4d birlashgandan keyin eski stolga telefon qo‘shgan taom yangi chekka tushadi', async () => {
    await till.openTable('Terassa 1');
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();
    await till.openTable('Terassa 2');
    await till.addToCart(PRODUCTS.cappuccino);
    await till.sendToKitchen();
    const source = serverOrders().find((o) => o.tableNumber === 'Terassa 1')!;

    await till.moveTable('Terassa 1', 'Terassa 2', true);
    await till.syncUntilSettled();
    // Telefon birlashtirishni hali ko'rmagan: eski chekka taom qo'shadi.
    const late = await fetch(`${BASE_URL}/api/orders/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiter}` },
      body: JSON.stringify({
        addItems: [{ id: PRODUCTS.fruitMix.id, productId: PRODUCTS.fruitMix.id, name: PRODUCTS.fruitMix.name, price: PRODUCTS.fruitMix.price, quantity: 1 }],
        appendKey: 'phone-late-1',
      }),
    });

    expect(late.status).toBe(200);
    const live = serverOrders().filter((o) => o.status !== 'cancelled');
    expect(live.map((o) => [o.tableNumber, o.total])).toEqual([
      ['Terassa 2', PRODUCTS.latte.price + PRODUCTS.cappuccino.price + PRODUCTS.fruitMix.price],
    ]);
  });

  it('T6 internet qaytgan zahoti vozvrat: chek hali navbatda — vozvrat undan keyin ketadi, "topilmadi" yo‘q', async () => {
    // Arrange: chek oflayn ochilib, oflayn to'langan — hammasi navbatda.
    await till.openTable('Terassa 1');
    till.setOnline(false);
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();
    await till.payCash(PRODUCTS.latte.price);

    // Act: Wi-Fi qaytdi, rahbar darhol vozvrat qildi (navbat hali ketmagan).
    till.setOnline(true);
    await till.refundLast('Mijoz qaytardi');
    await till.syncUntilSettled();

    // Assert
    expect(notFound()).toEqual([]);
    expect(till.failed()).toEqual([]);
    expect(till.queue()).toEqual([]);
    expect(query(`SELECT status, refunded FROM "Order" WHERE "cafeId" = '${CAFE}'`)).toEqual([['served', 't']]);
  });

  it('T7 internet qaytgan zahoti promo-kod: chek hali navbatda — avval chek, keyin kod, "topilmadi" yo‘q', async () => {
    await till.openTable('Terassa 1');
    till.setOnline(false);
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();

    till.setOnline(true);
    const message = await till.applyPromo('BAHOR10');

    expect(message).toBeNull();
    expect(notFound()).toEqual([]);
    expect(till.failed()).toEqual([]);
    expect(query(`SELECT total, discount FROM "Order" WHERE "cafeId" = '${CAFE}'`)).toEqual([
      [String(PRODUCTS.latte.price * 0.9), String(PRODUCTS.latte.price * 0.1)],
    ]);
  });

  it('T8 internet qaytgan zahoti taomni o‘chirish: chek hali navbatda — o‘chirish undan keyin ketadi', async () => {
    await till.openTable('Terassa 1');
    till.setOnline(false);
    await till.addToCart(PRODUCTS.latte);
    await till.addToCart(PRODUCTS.cappuccino);
    await till.sendToKitchen();

    till.setOnline(true);
    await till.removeKitchenItem(0);
    await till.syncUntilSettled();

    expect(notFound()).toEqual([]);
    expect(till.failed()).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([['sent_to_kitchen', PRODUCTS.cappuccino.price]]);
  });

  it('T5 server aniq "stol band" dedi — 409 qayta-qayta yuborilmaydi, taom stoldagi chekka qo‘shiladi', async () => {
    // Boshqa qurilma (ofitsiant telefoni) stolni serverda allaqachon ochgan.
    const other = crypto.randomUUID();
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiter}` },
      body: JSON.stringify({
        id: other,
        idempotencyKey: other,
        cafeId: CAFE,
        tableNumber: 'Terassa 2',
        items: JSON.stringify([cartLineToOrderItem({ product: PRODUCTS.cappuccino, quantity: 1, note: '' } as any)]),
        status: 'sent_to_kitchen',
      }),
    });
    expect(res.status).toBe(201);

    await till.openTable('Terassa 2');
    await till.addToCart(PRODUCTS.latte);
    await till.sendToKitchen();
    await till.syncUntilSettled();

    const conflicts = net.writes().filter((e) => e.status === 409);
    expect(conflicts.length).toBeLessThanOrEqual(1);
    expect(till.failed()).toEqual([]);
    expect(serverOrders().map((o) => [o.tableNumber, o.status, o.total])).toEqual([
      ['Terassa 2', 'sent_to_kitchen', PRODUCTS.cappuccino.price + PRODUCTS.latte.price],
    ]);
  });
});
