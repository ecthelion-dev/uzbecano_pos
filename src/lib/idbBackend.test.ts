import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { createIdbBackend } from './idbBackend';

/**
 * IndexedDB adapterining o'zi.
 *
 * Bu qatlam uzoq vaqt test bilan qoplanmadi — Node'da IndexedDB yo'q, va
 * ustidagi butun mantiq (`kvStore`) soxta baza bilan sinalgani uchun
 * adapter "zerikarli, sinaydigan narsa yo'q" deb qoldirilgandi. Lekin
 * aynan shu yerda kassaning HAMMA yozuvi diskka tushadi: bu yerdagi
 * jimgina xato butun smenani yo'q qiladi.
 *
 * `fake-indexeddb` haqiqiy IndexedDB semantikasini beradi — tranzaksiya,
 * kursor, `onupgradeneeded` — ya'ni bu testlar adapterni brauzerdagidek
 * sinaydi.
 */

const backend = createIdbBackend();

/** Do'kondagi kalitlar — adapterdan o'tmasdan, xom holda. */
function rawKeys(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('orderplus_pos');
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', 'readonly');
      const all = tx.objectStore('kv').getAllKeys();
      tx.oncomplete = () => resolve(all.result.map(String).sort());
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/*
 * Har testdan oldin do'kon bo'shatiladi.
 *
 * Bazaning O'ZI o'chirilmaydi: `idbBackend` ulanishni modul darajasida
 * keshlaydi va o'chirilgan bazaga bog'langan keshni tiklashning yo'li
 * yo'q — testlar bir-birini yiqitib ketardi.
 */
beforeEach(async () => {
  const rows = await backend.loadAll();
  const keys = Object.keys(rows);
  if (keys.length) await backend.write(keys.map((key) => ({ key, value: null })));
});

describe('IndexedDB adapteri', () => {
  test('bo`sh bazadan bo`sh ro`yxat qaytadi', async () => {
    expect(await backend.loadAll()).toEqual({});
  });

  test('yozilgan qiymat qaytib o`qiladi', async () => {
    // Arrange & Act
    await backend.write([{ key: 'orderplus_a', value: '1' }]);

    // Assert
    expect(await backend.loadAll()).toEqual({ orderplus_a: '1' });
  });

  test('mavjud kalit ustiga yoziladi', async () => {
    await backend.write([{ key: 'orderplus_a', value: 'eski' }]);
    await backend.write([{ key: 'orderplus_a', value: 'yangi' }]);

    expect((await backend.loadAll()).orderplus_a).toBe('yangi');
  });

  test('null qiymat qatorni BAZADAN o`chiradi', async () => {
    // Do'kon TO'G'RIDAN-TO'G'RI o'qiladi, `loadAll` orqali emas.
    //
    // `loadAll` faqat matn qiymatlarni qaytaradi, ya'ni o'chirish o'rniga
    // `null` yozilgan qator ham "yo'q" bo'lib ko'rinardi. O'shanday test
    // o'chirish butunlay buzilganini ham sezmasdi — sinab ko'rilgan: kodni
    // ataylab buzganda test o'tib ketaverdi. Qator esa bazada abadiy
    // qolib, kassaning diski shishib borardi.
    await backend.write([{ key: 'orderplus_a', value: '1' }]);

    await backend.write([{ key: 'orderplus_a', value: null }]);

    expect(await rawKeys()).toEqual([]);
  });

  test('bir nechta kalit BITTA tranzaksiyada yoziladi', async () => {
    // `sync_queue` dan `sync_failed` ga ko'chirish shu kafolatga tayanadi:
    // ikkalasi ham tushadi yoki hech biri tushmaydi.
    await backend.write([
      { key: 'orderplus_sync_queue', value: '[]' },
      { key: 'orderplus_sync_failed', value: '[{"kind":"patch"}]' },
    ]);

    const rows = await backend.loadAll();
    expect(rows.orderplus_sync_queue).toBe('[]');
    expect(rows.orderplus_sync_failed).toBe('[{"kind":"patch"}]');
  });

  test('bitta tranzaksiyada yozish va o`chirish aralash bo`la oladi', async () => {
    await backend.write([{ key: 'orderplus_eski', value: '1' }]);

    await backend.write([
      { key: 'orderplus_eski', value: null },
      { key: 'orderplus_yangi', value: '2' },
    ]);

    expect(await backend.loadAll()).toEqual({ orderplus_yangi: '2' });
    expect(await rawKeys()).toEqual(['orderplus_yangi']);
  });

  test('bo`sh ro`yxat yozish xato bermaydi', async () => {
    await expect(backend.write([])).resolves.toBeUndefined();
  });

  test('yozuvlar bir necha yozishdan keyin ham saqlanib qoladi', async () => {
    // Kassa kun bo'yi yozadi; hech biri oldingisini o'chirmasligi kerak.
    await backend.write([{ key: 'orderplus_a', value: '1' }]);
    await backend.write([{ key: 'orderplus_b', value: '2' }]);
    await backend.write([{ key: 'orderplus_c', value: '3' }]);

    expect(Object.keys(await backend.loadAll()).sort()).toEqual([
      'orderplus_a',
      'orderplus_b',
      'orderplus_c',
    ]);
  });

  test('uzun qiymat ham buzilmasdan qaytadi', async () => {
    // Cheklar ro'yxati megabaytlarga yetadi — `localStorage` aynan shunda
    // yiqilardi.
    const big = JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ id: `o${i}` })));

    await backend.write([{ key: 'orderplus_orders', value: big }]);

    expect((await backend.loadAll()).orderplus_orders).toBe(big);
  });
});
