import { describe, expect, test } from 'vitest';
import { mergeActiveOrders, mergeOrderHistory, unsyncedOrderIds } from './orderMerge';

const order = (id: string, status = 'sent_to_kitchen') => ({ id, status });

describe('unsyncedOrderIds', () => {
  test('navbatdagi CREATE ning buyurtma id sini oladi', () => {
    // Arrange
    const queue = [{ kind: 'create', order: { id: 'o1' } }];

    // Act
    const ids = unsyncedOrderIds(queue, []);

    // Assert
    expect(ids.has('o1')).toBe(true);
  });

  test('navbatdagi PATCH va DELETE ning orderId sini oladi', () => {
    const queue = [
      { kind: 'patch', orderId: 'o2' },
      { kind: 'delete', orderId: 'o3' },
    ];

    const ids = unsyncedOrderIds(queue, []);

    expect([...ids].sort()).toEqual(['o2', 'o3']);
  });

  test('rad etilganlar ro`yxatidagi buyurtmani ham egasiz qoldirmaydi', () => {
    // Bu aynan pul yo'qolgan yo'l: server 400 qaytargach yozuv `sync_failed`
    // ga ko'chadi va navbatdan chiqadi. Faqat navbatga qaralsa, chek
    // ro'yxatdan o'chib ketadi — pul esa yashikda.
    const failed = [{ kind: 'patch', orderId: 'o4' }];

    const ids = unsyncedOrderIds([], failed);

    expect(ids.has('o4')).toBe(true);
  });

  test('naqd yozuvining buyurtmasi yo`q — u hech kimni ushlab turmaydi', () => {
    const queue = [{ kind: 'cash', label: 'sut' }];

    const ids = unsyncedOrderIds(queue, []);

    expect(ids.size).toBe(0);
  });

  test('buzuq ma`lumot butun ro`yxatni yiqitmaydi', () => {
    const ids = unsyncedOrderIds('shalpaq' as unknown, [null, { kind: 'patch', orderId: 7 }] as unknown[]);

    expect(ids.size).toBe(0);
  });
});

describe('mergeOrderHistory', () => {
  test('serverning nusxasi odatda mahalliy nusxani yangilaydi', () => {
    // Arrange
    const local = [order('o1', 'sent_to_kitchen')];
    const server = [order('o1', 'served')];

    // Act
    const merged = mergeOrderHistory(local, server, new Set());

    // Assert
    expect(merged).toEqual([order('o1', 'served')]);
  });

  test('to`lovi navbatda turgan yopilgan chekni server qayta ochib yubormaydi', () => {
    // Kassir pulni olgan, chek bosilgan, status mahalliy `served`. Server
    // esa PATCH ni hali ko'rmagan. Server nusxasi yutsa, chek smena
    // hisobotidagi `served` ro'yxatiga tushmaydi va o'sha pul hisobotdan
    // tushib qoladi — yashikda esa turaveradi.
    const local = [order('o1', 'served')];
    const server = [order('o1', 'sent_to_kitchen')];

    const merged = mergeOrderHistory(local, server, new Set(['o1']));

    expect(merged).toEqual([order('o1', 'served')]);
  });

  test('yozuv navbatda qolmagan bo`lsa ham yopilgan chek qayta ochilmaydi', () => {
    // Navbat poygasi yozuvni yeb qo'ygan bo'lishi mumkin. Mahalliy `served`
    // — kassirning qo'li bilan qo'yilgan holat va u serverning eskirgan
    // nusxasidan ustun.
    const local = [order('o1', 'served')];
    const server = [order('o1', 'sent_to_kitchen')];

    const merged = mergeOrderHistory(local, server, new Set());

    expect(merged).toEqual([order('o1', 'served')]);
  });

  test('ikkala tomon ham yopiq bo`lsa server nusxasi olinadi', () => {
    // Server yopgan bo'lsa unda to'lov tafsilotlari ham bor.
    const local = [{ id: 'o1', status: 'served', cashAmount: 0 }];
    const server = [{ id: 'o1', status: 'served', cashAmount: 50000 }];

    const merged = mergeOrderHistory(local, server, new Set());

    expect(merged[0].cashAmount).toBe(50000);
  });

  test('serverda yo`q, lekin navbat ushlab turgan chek saqlanadi', () => {
    const local = [order('o1'), order('o2')];
    const server = [order('o2')];

    const merged = mergeOrderHistory(local, server, new Set(['o1']));

    expect(merged.map((o) => o.id).sort()).toEqual(['o1', 'o2']);
  });

  test('serverda yo`q, rad etilganlar ushlab turgan chek ham saqlanadi', () => {
    const local = [order('o1', 'served')];
    const server: typeof local = [];

    const merged = mergeOrderHistory(local, server, new Set(['o1']));

    expect(merged).toEqual([order('o1', 'served')]);
  });

  test('hech kim ushlab turmagan mahalliy chek o`chadi', () => {
    // Boshqa kassa uni o'chirgan bo'lishi mumkin — bu yerda serverga
    // ishonamiz, chunki yozuv na navbatda, na rad etilganlarda.
    const local = [order('o1'), order('o2')];
    const server = [order('o2')];

    const merged = mergeOrderHistory(local, server, new Set());

    expect(merged.map((o) => o.id)).toEqual(['o2']);
  });

  test('serverdagi yangi chek qo`shiladi', () => {
    const merged = mergeOrderHistory([], [order('o9')], new Set());

    expect(merged.map((o) => o.id)).toEqual(['o9']);
  });

  test('buzuq javob mahalliy ro`yxatni yo`qotmaydi', () => {
    const local = [order('o1', 'served')];

    const merged = mergeOrderHistory(local, null as unknown as typeof local, new Set());

    expect(merged).toEqual(local);
  });
});

describe('mergeActiveOrders', () => {
  test('yopilgan chekni serverning faol nusxasi qayta ochmaydi', () => {
    const local = [order('o1', 'served')];
    const server = [order('o1', 'sent_to_kitchen')];

    const merged = mergeActiveOrders(local, server);

    expect(merged).toEqual([order('o1', 'served')]);
  });

  test('bekor qilingan chek ham qayta ochilmaydi', () => {
    const local = [order('o1', 'cancelled')];
    const server = [order('o1', 'sent_to_kitchen')];

    const merged = mergeActiveOrders(local, server);

    expect(merged).toEqual([order('o1', 'cancelled')]);
  });

  test('faol chekning yangilangan holati qabul qilinadi', () => {
    const local = [order('o1', 'sent_to_kitchen')];
    const server = [order('o1', 'ready')];

    const merged = mergeActiveOrders(local, server);

    expect(merged).toEqual([order('o1', 'ready')]);
  });

  test('faol javobda yo`q mahalliy cheklar saqlanadi', () => {
    // `active=1` javobi yopilganlarni umuman qaytarmaydi — ularni bu yerda
    // o'chirish butun arxivni ko'rinmas qilardi.
    const local = [order('o1', 'served'), order('o2')];
    const server = [order('o2')];

    const merged = mergeActiveOrders(local, server);

    expect(merged.map((o) => o.id).sort()).toEqual(['o1', 'o2']);
  });

  test('serverdagi yangi chek qo`shiladi', () => {
    const merged = mergeActiveOrders([order('o1')], [order('o2')]);

    expect(merged.map((o) => o.id).sort()).toEqual(['o1', 'o2']);
  });

  test('navbatdagi o‘zgarishi bor faol chekni serverning eskirgan nusxasi bosib ketmaydi', () => {
    // Kassir yoki ofitsiant stolga taom qo'shdi, o'zgarish navbatda turibdi.
    // Server esa hali eski chekni qaytaryapti. Agar server nusxasi yutsa,
    // yangi taomlar ekrandan yo'qolib ketadi.
    const local = [{ id: 'o1', status: 'sent_to_kitchen', items: '[{"name":"Choy"}]' }];
    const server = [{ id: 'o1', status: 'sent_to_kitchen', items: '[]' }];

    const merged = mergeActiveOrders(local, server, new Set(['o1']));

    expect(merged).toEqual(local);
  });

  test('navbatda bo‘lmagan faol chek server nusxasi bilan yangilanadi', () => {
    const local = [{ id: 'o1', status: 'sent_to_kitchen', items: '[]' }];
    const server = [{ id: 'o1', status: 'sent_to_kitchen', items: '[{"name":"Choy"}]' }];

    const merged = mergeActiveOrders(local, server, new Set());

    expect(merged).toEqual(server);
  });
});
