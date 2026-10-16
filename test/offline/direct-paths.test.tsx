// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cartLineToOrderItem } from '../../src/lib/orderItems';
import {
  BASE_URL,
  CAFE,
  PRODUCTS,
  clearOrders,
  harnessAvailable,
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
