import { describe, expect, it } from 'vitest';
import { runSyncCycle, type QueuedItem, type SyncPorts } from './syncCycle';

/**
 * Oflayn ssenariylari.
 *
 * Bu testlar shu loyihaning eng qimmat darsidan chiqdi: 2026-09-16 da uchta
 * pul yo'qotadigan xato topildi va UCHALASI ham kodni qo'lda o'qib
 * topildi — pul yo'qolganidan keyin. Birorta test ularni ushlamagan edi,
 * chunki navbatni bo'shatadigan kod `App.tsx` ning uch yarim ming qatori
 * ichida, testga yetib bo'lmaydigan joyda yashardi.
 *
 * Endi u shu yerda va savol har safar bitta: "tarmoq AYNAN shu paytda
 * uzilsa, pul qayerda qoladi?"
 */

/** Diskni taqlid qiladi — o'qish har doim JONLI holatni qaytaradi. */
function fakeStore(queue: QueuedItem[] = [], failed: QueuedItem[] = []) {
  const state = { queue: [...queue], failed: [...failed] };
  let commitOk = true;
  return {
    state,
    breakCommit: () => { commitOk = false; },
    /** Drenaj ishlayotganda kassir yangi amal urdi. */
    enqueue: (item: QueuedItem) => { state.queue.push(item); },
    ports: (over: Partial<SyncPorts> = {}): SyncPorts => ({
      readQueue: () => [...state.queue],
      readFailed: () => [...state.failed],
      commit: (q, f) => {
        if (!commitOk) return false;
        state.queue = [...q];
        if (f) state.failed = [...f];
        return true;
      },
      send: async () => new Response('{}', { status: 200 }),
      isFrozen: async () => false,
      label: (i) => ('orderId' in i ? String(i.orderId) : 'chek'),
      ...over,
    }),
  };
}

const create = (id: string, qid: string): QueuedItem =>
  ({ kind: 'create', qid, order: { id, tableNumber: 'Stol 1' } });
const patch = (orderId: string, qid: string): QueuedItem =>
  ({ kind: 'patch', qid, orderId, body: { status: 'served' } });

const ok = () => new Response('{}', { status: 200 });
const fail = (status: number) => new Response('{}', { status });

describe('aloqa tiklangandagi navbat', () => {
  it('uzilishda urilgan uchta zakaz BIR MARTADAN yuboriladi', async () => {
    // Arrange
    const store = fakeStore([create('o1', 'q1'), create('o2', 'q2'), create('o3', 'q3')]);
    const sent: string[] = [];

    // Act
    await runSyncCycle(store.ports({
      send: async (i) => { sent.push(i.qid!); return ok(); },
    }), 'token');

    // Assert
    expect(sent).toEqual(['q1', 'q2', 'q3']);
    expect(store.state.queue).toEqual([]);
  });

  it('DRENAJ PAYTIDA urilgan zakaz yo`qolmaydi', async () => {
    // Bugungi eng qimmat xato. Kassir tarmoq tiklanayotgan paytda zakaz
    // uradi; drenaj esa navbatni o'zi boshlagandagi nusxadan yozib,
    // o'sha zakazni jimgina o'chirib yuborardi.
    const store = fakeStore([create('o1', 'q1')]);

    await runSyncCycle(store.ports({
      send: async () => { store.enqueue(create('o2', 'q2')); return ok(); },
    }), 'token');

    expect(store.state.queue.map((i) => i.qid)).toEqual(['q2']);
  });

  it('tarmoq yiqilsa yozuv navbatda qoladi', async () => {
    const store = fakeStore([create('o1', 'q1')]);

    await runSyncCycle(store.ports({
      send: async () => { throw new Error('tarmoq yo`q'); },
    }), 'token');

    expect(store.state.queue.map((i) => i.qid)).toEqual(['q1']);
    expect(store.state.failed).toEqual([]);
  });

  it('sessiyasiz umuman urinmaydi', async () => {
    // Ilova qayta ochilgan, PIN hali kiritilmagan. Tokensiz so'rov faqat
    // 401 oladi va 2026-09-10 da aynan shu to'rtta chekni yo'qotgan edi.
    const store = fakeStore([create('o1', 'q1')]);
    let sent = 0;

    const res = await runSyncCycle(store.ports({
      send: async () => { sent += 1; return ok(); },
    }), null);

    expect(sent).toBe(0);
    expect(res).toBeNull();
    expect(store.state.queue).toHaveLength(1);
  });

  it('bo`sh navbat hech narsa qilmaydi', async () => {
    const store = fakeStore([]);
    expect(await runSyncCycle(store.ports(), 'token')).toBeNull();
  });
});

describe('server rad etganda', () => {
  it('400 — yozuv navbatdan chiqadi, lekin RAD ETILGANLARGA tushadi', async () => {
    const store = fakeStore([create('o1', 'q1')]);

    const res = await runSyncCycle(store.ports({ send: async () => fail(400) }), 'token');

    expect(store.state.queue).toEqual([]);
    expect(store.state.failed.map((i) => i.qid)).toEqual(['q1']);
    expect(res?.rejectedLabels).toHaveLength(1);
  });

  it('rad etilgan yozuv SABABINI, vaqtini va kimligini olib qoladi', async () => {
    // Kassada "nega o'tmadi" degan savolga javob shu yerdan chiqadi —
    // boshqa hech qayerda saqlanmaydi.
    const store = fakeStore([{ ...patch('o1', 'q1'), actor: 'Dilsora' }]);
    const body = JSON.stringify({ error: 'Naqd va karta summalari mos emas' });

    await runSyncCycle(
      store.ports({ send: async () => new Response(body, { status: 400 }) }),
      'token',
    );

    const [failed] = store.state.failed as any[];
    expect(failed.rejectedReason).toBe('Naqd va karta summalari mos emas');
    expect(failed.rejectedStatus).toBe(400);
    expect(failed.actor).toBe('Dilsora');
    expect(typeof failed.rejectedAt).toBe('number');
  });

  it('javob tanasi bo`sh bo`lsa ham sabab yoziladi', async () => {
    const store = fakeStore([patch('o1', 'q1')]);

    await runSyncCycle(store.ports({ send: async () => new Response('', { status: 404 }) }), 'token');

    expect((store.state.failed[0] as any).rejectedReason).toContain('404');
  });

  it('rad etilganlar avvalgilarining ustiga QO`SHILADI', async () => {
    const store = fakeStore([create('o2', 'q2')], [create('o1', 'q1')]);

    await runSyncCycle(store.ports({ send: async () => fail(404) }), 'token');

    expect(store.state.failed.map((i) => i.qid)).toEqual(['q1', 'q2']);
  });

  it('409 rad etish emas — navbatda qoladi', async () => {
    // Server "ma'lumoting eskirgan" deydi. Keyingi urinish chekni qaytadan
    // o'qiydi va o'tadi.
    const store = fakeStore([patch('o1', 'q1')]);

    await runSyncCycle(store.ports({ send: async () => fail(409) }), 'token');

    expect(store.state.queue.map((i) => i.qid)).toEqual(['q1']);
    expect(store.state.failed).toEqual([]);
  });

  /*
   * 2026-10-08: uzilishda telefonlar mobil internet bilan stollarni serverda
   * ochdi, kassa oflayn o'sha stollarga zakaz urdi. Tiklanganda server
   * "stolda ochiq buyurtma bor" deb 409 berdi, kassa uni "eskirgan
   * ma'lumot" deb tushunib 136 marta qayta yubordi va 5 ta chek
   * "kutilmoqda" da qolib ketdi — bu 409 o'zi hech qachon o'tmaydi.
   */
  describe('stol band (409 + conflict.tableNumber)', () => {
    const tableBusy = () =>
      new Response(
        JSON.stringify({
          statusCode: 409,
          message: '"Stol 1" stolida ochiq buyurtma bor.',
          conflict: { tableNumber: 'Stol 1', orderId: 'server-order' },
        }),
        { status: 409 },
      );

    it('navbatda aylanmaydi — sababi bilan RAD ETILGANLARGA chiqadi', async () => {
      const store = fakeStore([create('o1', 'q1')]);

      const outcome = await runSyncCycle(store.ports({ send: async () => tableBusy() }), 'token');

      expect(store.state.queue).toEqual([]);
      expect(store.state.failed.map((i) => i.qid)).toEqual(['q1']);
      expect((store.state.failed[0] as any).rejectedReason).toContain('ochiq buyurtma bor');
      expect(outcome?.rejectedLabels).toHaveLength(1);
    });

    it('o`sha chekning to`lovi ham birga chiqadi, 404 olib alohida yo`qolmaydi', async () => {
      const store = fakeStore([create('o1', 'q1'), patch('o1', 'q2'), create('o2', 'q3')]);
      const sent: string[] = [];

      await runSyncCycle(store.ports({
        send: async (i) => { sent.push(i.qid!); return i.qid === 'q1' ? tableBusy() : ok(); },
      }), 'token');

      // To'lov serverga yuborilmaydi: chek u yerda yaratilmagan.
      expect(sent).toEqual(['q1', 'q3']);
      expect(store.state.failed.map((i) => i.qid)).toEqual(['q1', 'q2']);
      expect(store.state.queue).toEqual([]);
    });

    it('oddiy 409 (eskirgan ma`lumot) avvalgidek navbatda qoladi', async () => {
      const store = fakeStore([patch('o1', 'q1')]);
      await runSyncCycle(store.ports({
        send: async () => new Response(JSON.stringify({ message: 'Buyurtma boshqa qurilmada o`zgardi' }), { status: 409 }),
      }), 'token');
      expect(store.state.queue.map((i) => i.qid)).toEqual(['q1']);
      expect(store.state.failed).toEqual([]);
    });
  });

  /*
   * 2026-10-08: oflayn paytda Terassa 1 dan taom o'chirildi, lekin chekni
   * keyin admin serverda o'zi bekor qildi. Navbatdagi o'chirish endi har
   * urinishda 400 "yopilgan (cancelled) buyurtma" olib, kassada abadiy
   * "o'tmagan amal" bo'lib qolardi — chek esa allaqachon bo'sh.
   */
  describe('bekor qilingan chekdan taom o`chirish', () => {
    const removeItem = (orderId: string, qid: string): QueuedItem =>
      ({ kind: 'patch', qid, orderId, label: 'remove_item', body: { items: [] } });
    const alreadyCancelled = () =>
      new Response(
        JSON.stringify({ message: 'Tayyorlanayotgan yoki yopilgan (cancelled) buyurtma tarkibini o‘zgartirish taqiqlanadi', orderStatus: 'cancelled' }),
        { status: 400 },
      );

    it('eskirgan amal sifatida navbatdan chiqadi, rad etilganlarga tushmaydi', async () => {
      const store = fakeStore([removeItem('o1', 'q1')]);

      const outcome = await runSyncCycle(store.ports({ send: async () => alreadyCancelled() }), 'token');

      expect(store.state.queue).toEqual([]);
      expect(store.state.failed).toEqual([]);
      expect(outcome?.rejectedLabels).toEqual([]);
    });

    it('yopilgan (to`langan) chekdan o`chirish avvalgidek rad etiladi', async () => {
      const store = fakeStore([removeItem('o1', 'q1')]);
      const closed = () => new Response(JSON.stringify({ message: 'yopilgan (closed)', orderStatus: 'closed' }), { status: 400 });

      await runSyncCycle(store.ports({ send: async () => closed() }), 'token');

      expect(store.state.failed.map((i) => i.qid)).toEqual(['q1']);
    });

    it('bekor qilingan chekka boshqa amal (to`lov) avvalgidek rad etiladi', async () => {
      const store = fakeStore([patch('o1', 'q1')]);

      await runSyncCycle(store.ports({ send: async () => alreadyCancelled() }), 'token');

      expect(store.state.failed.map((i) => i.qid)).toEqual(['q1']);
    });
  });

  it('401 ham navbatda qoladi', async () => {
    const store = fakeStore([create('o1', 'q1')]);

    const outcome = await runSyncCycle(store.ports({ send: async () => fail(401) }), 'token');

    expect(store.state.queue.map((i) => i.qid)).toEqual(['q1']);
    expect(outcome?.unauthorized).toBe(true);
  });
});

describe('bitta chekning tartibi', () => {
  it('CREATE yiqilsa o`sha chekning PATCH i urinmaydi', async () => {
    // Serverda hali mavjud bo'lmagan chekka PATCH yuborish 404 beradi va
    // uni chetga qo'yardi — ya'ni to'lov yo'qolardi.
    const store = fakeStore([create('o1', 'q1'), patch('o1', 'q2')]);
    const sent: string[] = [];

    await runSyncCycle(store.ports({
      send: async (i) => {
        sent.push(i.qid!);
        if (i.kind === 'create') throw new Error('tarmoq');
        return ok();
      },
    }), 'token');

    expect(sent).toEqual(['q1']);
    expect(store.state.queue.map((i) => i.qid)).toEqual(['q1', 'q2']);
  });

  it('boshqa chekning yozuvi bundan zarar ko`rmaydi', async () => {
    const store = fakeStore([create('o1', 'q1'), create('o2', 'q2')]);

    await runSyncCycle(store.ports({
      send: async (i) => {
        if (i.qid === 'q1') throw new Error('tarmoq');
        return ok();
      },
    }), 'token');

    expect(store.state.queue.map((i) => i.qid)).toEqual(['q1']);
  });
});

describe('kafe muzlatilganda', () => {
  it('tsikl to`xtaydi va qolganlari navbatda qoladi', async () => {
    const store = fakeStore([create('o1', 'q1'), create('o2', 'q2'), create('o3', 'q3')]);
    const sent: string[] = [];

    await runSyncCycle(store.ports({
      send: async (i) => { sent.push(i.qid!); return i.qid === 'q1' ? ok() : fail(402); },
      isFrozen: async (r) => r.status === 402,
    }), 'token');

    expect(sent).toEqual(['q1', 'q2']);
    expect(store.state.queue.map((i) => i.qid)).toEqual(['q2', 'q3']);
  });
});

describe('diskka yozib bo`lmaganda', () => {
  it('navbat o`z holicha qoladi va bu ochiq aytiladi', async () => {
    // Yozuv o'tmasa hammasi qaytadan yuboriladi — `idempotencyKey` buni
    // zararsiz qiladi. Jimgina yo'qotishdan afzal.
    const store = fakeStore([create('o1', 'q1')]);
    store.breakCommit();

    const res = await runSyncCycle(store.ports({ send: async () => ok() }), 'token');

    expect(res?.commitFailed).toBe(true);
    expect(store.state.queue.map((i) => i.qid)).toEqual(['q1']);
  });
});
