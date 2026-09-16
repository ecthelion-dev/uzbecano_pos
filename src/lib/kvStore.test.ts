import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createKvStore, type DurableBackend } from './kvStore';
import { installMemoryStorage } from './testStorage';

/** Yozuvlarni xotirada ushlaydigan, nosozligini boshqarish mumkin soxta baza. */
function fakeBackend(seed: Record<string, string> = {}) {
  const rows = new Map(Object.entries(seed));
  const writes: { key: string; value: string | null }[][] = [];
  let failWrites = false;
  let failLoad = false;

  const backend: DurableBackend = {
    async loadAll() {
      if (failLoad) throw new Error('baza ochilmadi');
      return Object.fromEntries(rows);
    },
    async write(entries) {
      if (failWrites) throw new Error('yozib bo\'lmadi');
      writes.push(entries);
      // Tranzaksiya: yo hammasi, yo hech biri.
      for (const { key, value } of entries) {
        if (value === null) rows.delete(key);
        else rows.set(key, value);
      }
    },
  };

  return {
    backend,
    rows,
    writes,
    setFailWrites: (v: boolean) => { failWrites = v; },
    setFailLoad: (v: boolean) => { failLoad = v; },
  };
}

beforeEach(() => {
  installMemoryStorage();
});

describe('hidratatsiya', () => {
  test('bazadagi yozuvlarni xotiraga oladi', async () => {
    // Arrange
    const fake = fakeBackend({ a: '1' });
    const kv = createKvStore(fake.backend);

    // Act
    await kv.hydrate();

    // Assert
    expect(kv.get('a')).toBe('1');
  });

  test('baza bo`sh bo`lsa localStorage dagi yozuvlarni ko`chiradi', async () => {
    // Eski versiyadan yangilanayotgan kassa: butun ish holati localStorage
    // da yotibdi va u YO'QOLMASLIGI kerak.
    localStorage.setItem('orderplus_uzbecano_orders', '[{"id":"o1"}]');
    const fake = fakeBackend();
    const kv = createKvStore(fake.backend);

    await kv.hydrate();

    expect(kv.get('orderplus_uzbecano_orders')).toBe('[{"id":"o1"}]');
    expect(fake.rows.get('orderplus_uzbecano_orders')).toBe('[{"id":"o1"}]');
  });

  test('ko`chirishdan keyin localStorage TOZALANMAYDI', async () => {
    // Yangilanish orqaga qaytarilsa (eski versiya qaytib o'rnatilsa) kassa
    // o'z ma'lumotini topa olishi kerak. Bo'sh kassa — yo'qolgan smena.
    localStorage.setItem('orderplus_uzbecano_orders', '[]');
    const kv = createKvStore(fakeBackend().backend);

    await kv.hydrate();

    expect(localStorage.getItem('orderplus_uzbecano_orders')).toBe('[]');
  });

  test('bazada yozuv bo`lsa localStorage dan ko`chirmaydi', async () => {
    // Baza haqiqat manbai: eskirgan localStorage nusxasi uni bosib
    // ketmasligi kerak.
    localStorage.setItem('orderplus_uzbecano_orders', 'eski');
    const fake = fakeBackend({ 'orderplus_uzbecano_orders': 'yangi' });
    const kv = createKvStore(fake.backend);

    await kv.hydrate();

    expect(kv.get('orderplus_uzbecano_orders')).toBe('yangi');
  });

  test('baza umuman ochilmasa localStorage dan o`qiydi va ishlayveradi', async () => {
    localStorage.setItem('orderplus_uzbecano_orders', '[]');
    const fake = fakeBackend();
    fake.setFailLoad(true);
    const kv = createKvStore(fake.backend);

    await kv.hydrate();

    expect(kv.get('orderplus_uzbecano_orders')).toBe('[]');
    expect(kv.isDurable()).toBe(false);
  });

  test('faqat kassaning o`z kalitlarini ko`chiradi', async () => {
    // Boshqa ilovaning yozuvi (bir xil domen, masalan brauzerdagi kassa)
    // bazaga sudralib kirmasligi kerak.
    localStorage.setItem('orderplus_uzbecano_orders', '[]');
    localStorage.setItem('begona_kalit', 'x');
    const fake = fakeBackend();
    const kv = createKvStore(fake.backend);

    await kv.hydrate();

    expect(fake.rows.has('begona_kalit')).toBe(false);
  });
});

describe('o`qish va yozish', () => {
  test('yozilgan qiymat DARHOL o`qiladi', async () => {
    // Bu shartning butun sababi: kassa kodi sinxron. Yozgandan keyin darhol
    // o'qiydigan joylar bor va ular bazaning javobini kuta olmaydi.
    const kv = createKvStore(fakeBackend().backend);
    await kv.hydrate();

    kv.set('a', '1');

    expect(kv.get('a')).toBe('1');
  });

  test('yo`q kalit uchun null', async () => {
    const kv = createKvStore(fakeBackend().backend);
    await kv.hydrate();

    expect(kv.get('yo`q')).toBeNull();
  });

  test('yozuv bazaga ham yetib boradi', async () => {
    const fake = fakeBackend();
    const kv = createKvStore(fake.backend);
    await kv.hydrate();

    kv.set('a', '1');
    await kv.flush();

    expect(fake.rows.get('a')).toBe('1');
  });

  test('yozuv localStorage ga ham dublikat qilinadi', async () => {
    // Orqaga qaytarish uchun. Bu yozuv muvaffaqiyatsiz bo`lsa ham (joy
    // tugagan) baza haqiqat manbai bo`lib qolaveradi.
    const kv = createKvStore(fakeBackend().backend);
    await kv.hydrate();

    kv.set('a', '1');

    expect(localStorage.getItem('a')).toBe('1');
  });

  test('o`chirish ikkala joydan ham o`chiradi', async () => {
    const fake = fakeBackend({ a: '1' });
    const kv = createKvStore(fake.backend);
    await kv.hydrate();

    kv.remove('a');
    await kv.flush();

    expect(kv.get('a')).toBeNull();
    expect(fake.rows.has('a')).toBe(false);
    expect(localStorage.getItem('a')).toBeNull();
  });

  test('baza yozmasa ham kassa ishlayveradi', async () => {
    const fake = fakeBackend();
    const kv = createKvStore(fake.backend);
    await kv.hydrate();
    fake.setFailWrites(true);

    kv.set('a', '1');
    await kv.flush();

    // Xotirada ham, localStorage da ham bor — savdo to'xtamaydi.
    expect(kv.get('a')).toBe('1');
    expect(localStorage.getItem('a')).toBe('1');
  });
});

describe('bir nechta kalitni birga yozish', () => {
  test('ikkala kalit BITTA tranzaksiyada ketadi', async () => {
    // `sync_queue` dan `sync_failed` ga ko'chirish shu yerda hal bo'ladi:
    // ikkita alohida yozuv orasida ilova yiqilsa, pul ikkala ro'yxatdan
    // ham tushib qolardi.
    const fake = fakeBackend();
    const kv = createKvStore(fake.backend);
    await kv.hydrate();

    kv.setMany([
      { key: 'sync_queue', value: '[]' },
      { key: 'sync_failed', value: '[{"kind":"patch"}]' },
    ]);
    await kv.flush();

    expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0]).toHaveLength(2);
  });

  test('birga yozilganlar darhol o`qiladi', async () => {
    const kv = createKvStore(fakeBackend().backend);
    await kv.hydrate();

    kv.setMany([
      { key: 'a', value: '1' },
      { key: 'b', value: null },
    ]);

    expect(kv.get('a')).toBe('1');
    expect(kv.get('b')).toBeNull();
  });
});

describe('yozuvlar tartibi', () => {
  test('ketma-ket yozuvlar tartibi saqlanadi', async () => {
    // Navbat ustidagi ikkita yozuv o'rin almashsa, eskisi yangisini bosib
    // ketardi — ya'ni allaqachon yuborilgan buyurtma navbatga qaytardi.
    const fake = fakeBackend();
    const kv = createKvStore(fake.backend);
    await kv.hydrate();

    kv.set('a', '1');
    kv.set('a', '2');
    kv.set('a', '3');
    await kv.flush();

    expect(fake.rows.get('a')).toBe('3');
    expect(fake.writes.map((w) => w[0].value)).toEqual(['1', '2', '3']);
  });
});

describe('sog`liq tekshiruvi', () => {
  test('ishlayotgan saqlash uchun rost', async () => {
    const kv = createKvStore(fakeBackend().backend);
    await kv.hydrate();

    expect(kv.isHealthy()).toBe(true);
  });
});

describe('hidratatsiyagacha bo`lgan payt', () => {
  test('qurilishdayoq localStorage dan o`qiy oladi', async () => {
    // `constants/index.ts` API manzilini MODUL YUKLANAYOTGANDA o'qiydi —
    // hech qanday `await` dan oldin. O'shanda bo'sh javob qaytsa, kassa
    // standart manzilga burilib ketardi va qo'lda sozlangan server
    // yo'qolardi.
    localStorage.setItem('orderplus_api_url', 'https://pos.example');

    const kv = createKvStore(fakeBackend().backend);

    expect(kv.get('orderplus_api_url')).toBe('https://pos.example');
  });

  test('hidratatsiyagacha yozilgan qiymatni baza bosib ketmaydi', async () => {
    // Kassa hidratatsiya tugashini kutmaydi. Shu oraliqda yozilgan qiymat
    // — eng yangisi, va bazadagi eskirgan nusxa uni almashtirmasligi kerak.
    const fake = fakeBackend({ 'orderplus_a': 'eski' });
    const kv = createKvStore(fake.backend);

    kv.set('orderplus_a', 'yangi');
    await kv.hydrate();

    expect(kv.get('orderplus_a')).toBe('yangi');
  });

  test('hidratatsiyagacha yozilgan qiymat bazaga yetkaziladi', async () => {
    const fake = fakeBackend({ 'orderplus_b': 'x' });
    const kv = createKvStore(fake.backend);

    kv.set('orderplus_a', 'yangi');
    await kv.hydrate();
    await kv.flush();

    expect(fake.rows.get('orderplus_a')).toBe('yangi');
  });
});
