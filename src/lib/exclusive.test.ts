import { describe, it, expect } from 'vitest';
import { createExclusive } from './exclusive';

/*
 * 2026-10-05: "Tasdiqlash" va "To'lov" tugmasi javob kutayotganda qayta
 * bosilsa, funksiya ikki-uch marta ishlab, har bir chekni qayta bosardi.
 */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('createExclusive', () => {
  it('birinchi chaqiruv tugamaguncha ikkinchisi ishga tushmaydi', async () => {
    const run = createExclusive();
    const gate = deferred();
    let calls = 0;

    const first = run(async () => { calls += 1; await gate.promise; });
    const second = run(async () => { calls += 1; });
    const third = run(async () => { calls += 1; });

    gate.resolve();
    await Promise.all([first, second, third]);

    expect(calls).toBe(1);
  });

  it('tugagach keyingi chaqiruv yana ishlaydi', async () => {
    const run = createExclusive();
    let calls = 0;

    await run(async () => { calls += 1; });
    await run(async () => { calls += 1; });

    expect(calls).toBe(2);
  });

  it('xato bo‘lsa ham bo‘shaydi, tugma qotib qolmaydi', async () => {
    const run = createExclusive();
    await expect(run(async () => { throw new Error('tarmoq'); })).rejects.toThrow('tarmoq');

    let calls = 0;
    await run(async () => { calls += 1; });
    expect(calls).toBe(1);
  });

  it('natijani qaytaradi, o‘tkazib yuborilganda undefined', async () => {
    const run = createExclusive();
    const gate = deferred();

    const first = run(async () => { await gate.promise; return 'ok'; });
    const skipped = await run(async () => 'ikkinchi');

    gate.resolve();
    expect(await first).toBe('ok');
    expect(skipped).toBeUndefined();
  });
});
