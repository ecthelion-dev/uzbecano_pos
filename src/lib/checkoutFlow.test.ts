import { describe, it, expect, vi } from 'vitest';
import { createExclusive } from './exclusive';
import { openPaymentAfterDispatch } from './checkoutFlow';

/*
 * 2026-10-16 22:18: "To'lov" savatni yuborib, javobni kutmasdan oynani
 * ochdi. Tez tasdiqlangan to'lov ikkinchi chek ochdi (409), pul mavjud
 * bo'lmagan chekka ketdi (404). Oyna yuborish TUGAGACH ochilishi shart.
 */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Haqiqiy `exclusive` bilan: kassadagi `handleSendToKitchen` xuddi shunday. */
function till() {
  const exclusive = createExclusive();
  const server = deferred();
  const send = vi.fn(() => exclusive(() => server.promise));
  const openPayment = vi.fn();
  const pay = (hasUnsavedCart = true) =>
    openPaymentAfterDispatch({ hasUnsavedCart, send, waitIdle: exclusive.idle, openPayment });
  return { server, send, openPayment, pay };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('To‘lov oynasi savat serverga yetgach ochiladi', () => {
  it('server javob bermaguncha oyna ochilmaydi', async () => {
    const { server, openPayment, pay } = till();

    const done = pay();
    await flush();
    expect(openPayment).not.toHaveBeenCalled();

    server.resolve();
    await done;
    expect(openPayment).toHaveBeenCalledTimes(1);
  });

  it('ikkinchi bosish ham birinchi yuborishni kutadi va qayta yubormaydi', async () => {
    const { server, send, openPayment, pay } = till();

    const first = pay();
    const second = pay();
    await flush();
    // Avval aynan shu yerda oyna ochilib qolardi: o'tkazib yuborilgan
    // yuborish darhol qaytardi.
    expect(openPayment).not.toHaveBeenCalled();

    server.resolve();
    await Promise.all([first, second]);
    expect(openPayment).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('savat bo‘sh bo‘lsa yubormaydi, lekin ketayotgan yuborishni kutadi', async () => {
    const { server, send, openPayment, pay } = till();

    const sending = send();
    const done = pay(false);
    await flush();
    expect(openPayment).not.toHaveBeenCalled();

    server.resolve();
    await Promise.all([sending, done]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(openPayment).toHaveBeenCalledTimes(1);
  });

  it('yuborish xato bersa ham oyna ochiladi — mijoz kutib turibdi', async () => {
    const { server, openPayment, pay } = till();

    const done = pay();
    server.reject(new Error('tarmoq'));
    await expect(done).rejects.toThrow('tarmoq');
    expect(openPayment).toHaveBeenCalledTimes(1);
  });

  it('hech narsa ketmayotgan bo‘lsa oyna darhol ochiladi', async () => {
    const { openPayment, pay } = till();
    await pay(false);
    expect(openPayment).toHaveBeenCalledTimes(1);
  });
});
