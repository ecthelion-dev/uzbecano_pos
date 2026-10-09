import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appendItemsPatch, cartLineToOrderItem, removeItemPatch, type OutgoingOrderItem } from '../../src/lib/orderItems';
import { orderTotals, type PromoTerms } from '../../src/lib/promo';
import type { QueuedItem } from '../../src/lib/syncCycle';
import {
  CAFE,
  PRODUCTS,
  TillQueue,
  clearOrders,
  harnessAvailable,
  resetDatabase,
  seed,
  serverOrders,
  startApi,
  stopApi,
  tokenFor,
} from './harness';

/*
 * Har bir ssenariy: internet YO'Q paytda kassa amallarni navbatga yozadi,
 * keyin aloqa qaytadi va navbat haqiqiy serverga yuboriladi. Talab
 * hammasida bitta: navbat bo'shaydi, rad etilgan amal qolmaydi va serverdagi
 * holat kassadagi bilan bir xil.
 */

type Product = (typeof PRODUCTS)[keyof typeof PRODUCTS];

function line(product: Product, quantity = 1): OutgoingOrderItem {
  return cartLineToOrderItem({ product, quantity, note: '' } as any);
}

/** `useKitchenDispatch` dagi `newOrderObj` shakli. */
function newOrder(tableNumber: string, items: OutgoingOrderItem[], promo: PromoTerms | null = null): QueuedItem {
  const id = crypto.randomUUID();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const { serviceFee, discount, total } = orderTotals(subtotal, 0, promo);
  return {
    kind: 'create',
    order: {
      id,
      cafeId: CAFE,
      tableNumber,
      waiterName: 'Dilsora',
      items: JSON.stringify(items),
      subtotal,
      serviceFee,
      discount,
      total,
      promo: promo ? { code: promo.code, type: promo.type, value: promo.value } : undefined,
      status: 'sent_to_kitchen',
      idempotencyKey: id,
    },
  };
}

const orderId = (item: QueuedItem): string => (item as any).order.id;

/** `useCheckout` dagi naqd to'lov tanasi. */
function cashPayment(id: string, amount: number): QueuedItem {
  return {
    kind: 'patch',
    orderId: id,
    label: 'finalize_payment',
    body: { status: 'served', paymentMethod: 'cash', cashAmount: amount, cardAmount: 0 },
  };
}

/** `handleRemoveKitchenItem`: qolgan taomlar bilan, rahbar tasdig'i bilan. */
function removeItems(id: string, remaining: OutgoingOrderItem[], approvalToken: string): QueuedItem {
  return { kind: 'patch', orderId: id, label: 'remove_item', approvalToken, body: removeItemPatch(remaining, 0, null) };
}

const describeOffline = harnessAvailable() ? describe : describe.skip;

describeOffline('oflayn → onlayn: navbat haqiqiy serverga', () => {
  const waiter = tokenFor('waiter');
  // Oflayn PIN: kassa keshdagi rahbarning SESSIYA tokenini beradi.
  const managerSession = tokenFor('manager');

  beforeAll(async () => {
    resetDatabase();
    seed();
    await startApi();
  }, 120_000);

  afterAll(() => stopApi());

  beforeEach(() => clearOrders());

  it('2026-10-08 Terassa 1: PIN bilan o`chirish → bekor → o`sha stol qayta ochiladi → to`lov', async () => {
    const till = new TillQueue();
    const first = newOrder('Terassa 1', [line(PRODUCTS.fruitMix)]);
    till.push(first);
    till.push(removeItems(orderId(first), [], managerSession));
    const second = newOrder('Terassa 1', [line(PRODUCTS.cappuccino, 2)]);
    till.push(second);
    till.push(cashPayment(orderId(second), 60000));

    await till.drainUntilSettled(waiter);

    expect(till.failed).toEqual([]);
    expect(till.queue).toEqual([]);
    expect(serverOrders().map((o) => [o.tableNumber, o.status, o.total])).toEqual([
      ['Terassa 1', 'cancelled', 0],
      ['Terassa 1', 'served', 60000],
    ]);
  });

  it('stol ochiladi, to`lanadi, yana ochiladi, yana to`lanadi', async () => {
    const till = new TillQueue();
    const a = newOrder('Bar 4', [line(PRODUCTS.latte)]);
    const b = newOrder('Bar 4', [line(PRODUCTS.cappuccino)]);
    till.push(a);
    till.push(cashPayment(orderId(a), 25000));
    till.push(b);
    till.push(cashPayment(orderId(b), 30000));

    await till.drainUntilSettled(waiter);

    expect(till.failed).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([
      ['served', 25000],
      ['served', 30000],
    ]);
  });

  it('ochiq stolga taom qo`shiladi va to`lanadi', async () => {
    const till = new TillQueue();
    const a = newOrder('Terassa 2', [line(PRODUCTS.latte)]);
    till.push(a);
    till.push({
      kind: 'patch',
      orderId: orderId(a),
      label: 'add_items',
      body: appendItemsPatch([line(PRODUCTS.fruitMix)], crypto.randomUUID()),
    });
    till.push(cashPayment(orderId(a), 70000));

    await till.drainUntilSettled(waiter);

    expect(till.failed).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([['served', 70000]]);
  });

  it('stol ko`chiriladi, bo`shagan stol yana ochiladi', async () => {
    const till = new TillQueue();
    const a = newOrder('Terassa 1', [line(PRODUCTS.latte)]);
    till.push(a);
    till.push({ kind: 'patch', orderId: orderId(a), label: 'move_table', body: { tableNumber: 'Terassa 2' } });
    const b = newOrder('Terassa 1', [line(PRODUCTS.cappuccino)]);
    till.push(b);

    await till.drainUntilSettled(waiter);

    expect(till.failed).toEqual([]);
    expect(serverOrders().map((o) => [o.tableNumber, o.status])).toEqual([
      ['Terassa 2', 'sent_to_kitchen'],
      ['Terassa 1', 'sent_to_kitchen'],
    ]);
  });

  it('band stolga ko`chirish aylanmaydi — sababi bilan, to`lovi bilan birga chiqadi', async () => {
    const till = new TillQueue();
    const a = newOrder('Terassa 1', [line(PRODUCTS.latte)]);
    const b = newOrder('Terassa 2', [line(PRODUCTS.cappuccino)]);
    till.push(a);
    till.push(b);
    till.push({ kind: 'patch', orderId: orderId(a), label: 'move_table', body: { tableNumber: 'Terassa 2' } });
    till.push(cashPayment(orderId(a), 25000));

    await till.drainUntilSettled(waiter);

    expect(till.queue).toEqual([]);
    expect(till.failed.map((i) => (i as any).label)).toEqual(['move_table', 'finalize_payment']);
    expect((till.failed[0] as any).rejectedReason).toMatch(/ochiq buyurtma bor/);
  });

  it('oflayn promo-kodli chek serverda ham chegirma bilan, kassa olgan summada', async () => {
    const till = new TillQueue();
    const promo = { code: 'BAHOR10', type: 'percent', value: 10, minOrder: 0 } as PromoTerms;
    const a = newOrder('Terassa 1', [line(PRODUCTS.fruitMix, 2)], promo);
    till.push(a);
    till.push(cashPayment(orderId(a), (a as any).order.total));

    await till.drainUntilSettled(waiter);

    expect((a as any).order.total).toBe(81000);
    expect(till.failed).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([['served', 81000]]);
  });

  it('javob yo`qolib, xuddi o`sha navbat qayta yuborilsa nusxa paydo bo`lmaydi', async () => {
    const till = new TillQueue();
    const a = newOrder('Bar 4', [line(PRODUCTS.latte)]);
    till.push(a);
    till.push(cashPayment(orderId(a), 25000));
    const snapshot = till.queue;

    await till.drainUntilSettled(waiter);
    // Kassa javobni olmay qoldi deb faraz: xuddi o'sha yozuvlar yana ketadi.
    till.queue = snapshot;
    await till.drainUntilSettled(waiter);

    expect(till.failed).toEqual([]);
    expect(serverOrders().map((o) => [o.status, o.total])).toEqual([['served', 25000]]);
  });

  it('2026-10-02: bitta stolga ikki xil chek — ikkinchisi aylanmaydi, sababi bilan chiqadi', async () => {
    const till = new TillQueue();
    till.push(newOrder('Bar 4', [line(PRODUCTS.latte)]));
    till.push(newOrder('Bar 4', [line(PRODUCTS.latte)]));

    await till.drainUntilSettled(waiter);

    expect(till.queue).toEqual([]);
    expect(till.failed).toHaveLength(1);
    expect((till.failed[0] as any).rejectedReason).toMatch(/ochiq buyurtma bor/);
    expect(serverOrders()).toHaveLength(1);
  });
});
