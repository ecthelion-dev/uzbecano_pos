import { describe, it, expect } from 'vitest';
import {
  extractReason,
  stampRejection,
  acknowledge,
  awaitingReview,
  discard,
  actorOf,
  retryFailedAction,
  retryAllFailedActions,
  extractActionItems,
  tableNumberOfAction,
  type FailedAction,
} from './failedActions';
import { unsyncedOrderIds } from './orderMerge';

/**
 * Rad etilgan amal — kassadagi eng og'ir holat, chunki uni QILGAN odam
 * ko'pincha bilmay qoladi: o'zgartirish ekranda ko'rinadi, serverga esa
 * yetmaydi. Keyin boshqa xodim boshqa holatni ko'radi va aybdor qidiriladi.
 *
 * Shuning uchun har bir rad etilgan yozuv uchta savolga javob berishi kerak:
 * KIM qildi, NEGA o'tmadi, QACHON. Shu fayl o'sha javoblarni qulflaydi.
 */

const ITEM = {
  kind: 'patch' as const,
  qid: 'q-1',
  queuedAt: 1_000,
  orderId: 'order-1',
  label: 'Bar 2',
  actor: 'Dilsora',
  body: { paidCash: 153_000 },
};

describe('extractReason', () => {
  it('serverning `error` maydonini oladi', () => {
    const raw = JSON.stringify({ error: "Naqd va karta summalari yig'indisi mos emas" });
    expect(extractReason(raw, 400)).toBe("Naqd va karta summalari yig'indisi mos emas");
  });

  it('JSON bo‘lmasa matnning o‘zini oladi', () => {
    expect(extractReason('Bad Request', 400)).toBe('Bad Request');
  });

  it('bo‘sh javobda holat kodini aytadi', () => {
    expect(extractReason('', 400)).toContain('400');
    expect(extractReason(null, 404)).toContain('404');
  });

  it('`error` maydoni bo‘sh bo‘lgan JSON ham holat kodiga tushadi', () => {
    expect(extractReason(JSON.stringify({ error: '   ' }), 400)).toContain('400');
  });

  it('juda uzun matnni qisqartiradi', () => {
    const long = 'x'.repeat(1000);
    const reason = extractReason(long, 400);
    expect(reason.length).toBeLessThanOrEqual(300);
  });
});

describe('stampRejection', () => {
  it('sababi, vaqti va holat kodini qo‘shadi', () => {
    const failed = stampRejection(ITEM, 400, 'Miqdor noto‘g‘ri', 5_000);

    expect(failed.rejectedStatus).toBe(400);
    expect(failed.rejectedReason).toBe('Miqdor noto‘g‘ri');
    expect(failed.rejectedAt).toBe(5_000);
  });

  it('asl amalni butunlay saqlaydi — bu pul, yo‘qotib bo‘lmaydi', () => {
    const failed = stampRejection(ITEM, 400, 'x', 5_000) as FailedAction & { body: unknown };

    expect(failed).toMatchObject({
      kind: 'patch',
      qid: 'q-1',
      orderId: 'order-1',
      label: 'Bar 2',
      actor: 'Dilsora',
      queuedAt: 1_000,
    });
    expect(failed.body).toEqual({ paidCash: 153_000 });
  });

  it('kiruvchi yozuvni o‘zgartirmaydi', () => {
    const before = JSON.stringify(ITEM);
    stampRejection(ITEM, 400, 'x', 5_000);
    expect(JSON.stringify(ITEM)).toBe(before);
  });
});

describe('actorOf', () => {
  it('amalni kim qo‘shganini qaytaradi', () => {
    expect(actorOf(ITEM)).toBe('Dilsora');
  });

  it('eski yozuvlarda kim ekani noma’lum', () => {
    const { actor, ...withoutActor } = ITEM;
    expect(actorOf(withoutActor)).toBeNull();
  });

  it('bo‘sh ism ham noma’lum', () => {
    expect(actorOf({ ...ITEM, actor: '   ' })).toBeNull();
  });
});

describe('acknowledge — "Tushunarli"', () => {
  const list = [
    stampRejection({ ...ITEM, qid: 'q-1' }, 400, 'a', 1),
    stampRejection({ ...ITEM, qid: 'q-2' }, 400, 'b', 2),
  ];

  it('yozuvni O‘CHIRMAYDI — faqat ko‘rildi deb belgilaydi', () => {
    /*
     * Ilgari yozuv ro'yxatdan chiqarilardi. Rad etilgan buyurtma yaratish
     * bo'lsa, keyingi tarix yangilanishida mahalliy chek ham o'chardi:
     * u endi na navbatda, na rad etilganlar orasida, na serverda edi.
     * Pul olingan, chek bosilgan — va hech qayerda yozuv qolmasdi.
     */
    const next = acknowledge(list, 'q-1', 500);
    expect(next.map((x) => x.qid)).toEqual(['q-1', 'q-2']);
    expect(next[0].acknowledgedAt).toBe(500);
    expect(next[1].acknowledgedAt).toBeUndefined();
  });

  it('ko‘rilgan yaratish yozuvi chekni kassada USHLAB turadi', () => {
    const create = stampRejection(
      { kind: 'create', qid: 'q-c', order: { id: 'ord-local' } },
      400, 'rad', 1,
    );
    const next = acknowledge([create], 'q-c', 500);
    expect(unsyncedOrderIds([], next).has('ord-local')).toBe(true);
  });

  it('notanish nom hech narsani o‘zgartirmaydi', () => {
    expect(acknowledge(list, 'yo-q', 500)).toEqual(list);
  });

  it('asl ro‘yxatni o‘zgartirmaydi', () => {
    acknowledge(list, 'q-1', 500);
    expect(list[0].acknowledgedAt).toBeUndefined();
  });

  it('massiv bo‘lmasa bo‘sh ro‘yxat qaytadi', () => {
    expect(acknowledge(null as never, 'q-1', 500)).toEqual([]);
  });
});

describe('awaitingReview — belgi va ro‘yxat nimani ko‘rsatadi', () => {
  it('faqat ko‘rilmaganlarni qaytaradi', () => {
    const list = acknowledge(
      [
        stampRejection({ ...ITEM, qid: 'q-1' }, 400, 'a', 1),
        stampRejection({ ...ITEM, qid: 'q-2' }, 400, 'b', 2),
      ],
      'q-1',
      500,
    );
    expect(awaitingReview(list).map((x) => x.qid)).toEqual(['q-2']);
  });

  it('massiv bo‘lmasa bo‘sh ro‘yxat', () => {
    expect(awaitingReview(undefined as never)).toEqual([]);
  });
});

describe('discard — amal savatdan qaytadan bajarilganda', () => {
  const list = [
    stampRejection({ ...ITEM, qid: 'q-1' }, 400, 'a', 1),
    stampRejection({ ...ITEM, qid: 'q-2' }, 400, 'b', 2),
  ];

  it('faqat bitta yozuvni olib tashlaydi', () => {
    expect(discard(list, 'q-1').map((x) => x.qid)).toEqual(['q-2']);
  });

  it('nomsiz so‘rov hech narsani o‘chirmaydi', () => {
    expect(discard(list, '')).toHaveLength(2);
  });
});

describe('retryFailedAction va retryAllFailedActions', () => {
  const failedList = [
    stampRejection({ ...ITEM, qid: 'q-1' }, 400, 'xato 1', 1),
    stampRejection({ ...ITEM, qid: 'q-2' }, 400, 'xato 2', 2),
  ];

  it('bitta amalni rad etilganlardan navbatga ko‘chiradi va tamg‘alarni tozalaydi', () => {
    const queue = [{ kind: 'cash' as const, qid: 'q-0', entry: {} }];
    const { nextQueue, nextFailed } = retryFailedAction(queue, failedList, 'q-1');

    expect(nextFailed.map((x) => x.qid)).toEqual(['q-2']);
    expect(nextQueue.map((x) => x.qid)).toEqual(['q-0', 'q-1']);
    const restored = nextQueue.find((x) => x.qid === 'q-1') as any;
    expect(restored.rejectedAt).toBeUndefined();
    expect(restored.rejectedStatus).toBeUndefined();
    expect(restored.rejectedReason).toBeUndefined();
  });

  it('barcha amallarni navbatga qaytaradi', () => {
    const queue = [{ kind: 'cash' as const, qid: 'q-0', entry: {} }];
    const { nextQueue, nextFailed } = retryAllFailedActions(queue, failedList);

    expect(nextFailed).toEqual([]);
    expect(nextQueue.map((x) => x.qid)).toEqual(['q-0', 'q-1', 'q-2']);
  });
});

describe('extractActionItems va tableNumberOfAction', () => {
  it('create amalidan taomlar va stol raqamini oladi', () => {
    const item = stampRejection(
      {
        kind: 'create',
        qid: 'q-c',
        order: {
          tableNumber: 'Stol 5',
          items: JSON.stringify([{ name: 'Osh', quantity: 2, price: 35000 }]),
        },
      },
      400,
      'xato',
      1,
    );

    expect(tableNumberOfAction(item)).toBe('Stol 5');
    expect(extractActionItems(item)).toEqual([
      { productId: undefined, name: 'Osh', quantity: 2, price: 35000, note: undefined, variant: undefined },
    ]);
  });

  it('patch amalidan taomlar va stol nomini oladi', () => {
    const item = stampRejection(
      {
        kind: 'patch',
        qid: 'q-p',
        orderId: 'o1',
        label: 'VIP 1',
        body: {
          tableNumber: 'VIP 1',
          items: [{ name: 'Somsa', quantity: 3, price: 10000, note: 'Issiq bo‘lsin' }],
        },
      },
      400,
      'xato',
      1,
    );

    expect(tableNumberOfAction(item)).toBe('VIP 1');
    expect(extractActionItems(item)).toEqual([
      { productId: undefined, name: 'Somsa', quantity: 3, price: 10000, note: 'Issiq bo‘lsin', variant: undefined },
    ]);
  });
});

describe('extractActionItems — taom qo‘shish so‘rovi', () => {
  it('`addItems` dan ham taomlarni oladi', () => {
    // Taom qo'shish endi faqat yangi taomlarni `addItems` da yuboradi.
    // Ularni o'qimasa "savatga qaytarish" rad etilgan qo'shishda bo'sh qolardi.
    const item = stampRejection(
      {
        kind: 'patch',
        qid: 'q-a',
        orderId: 'ord-1',
        body: { addItems: [{ productId: 'p_choy', name: 'Choy', quantity: 2, price: 8000 }], appendKey: 'q-a' },
      },
      400, 'rad', 1,
    );
    expect(extractActionItems(item)).toEqual([
      expect.objectContaining({ productId: 'p_choy', name: 'Choy', quantity: 2 }),
    ]);
  });
});
