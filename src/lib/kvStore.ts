/**
 * Kassaning diskdagi yozuvlari uchun chidamli saqlash.
 *
 * `localStorage` pul saqlanadigan joy uchun noto'g'ri idish edi. Uchta
 * sababdan:
 *
 *   - TRANZAKSIYA YO'Q. `sync_queue` dan `sync_failed` ga ko'chirish ikkita
 *     alohida yozuv, va ular orasida ilova yiqilsa pul ikkala ro'yxatdan
 *     ham tushib qolardi. Kod bu yerda yozuvlar TARTIBIGA tayanib turgan
 *     edi — ishlaydi, lekin bu himoya emas, ehtiyotkorlik.
 *   - JOY ~5MB. Cheklar ro'yxati o'sib boradi va bir kuni yozuv o'tmay
 *     qoladi. `writeCafeJson` `false` qaytaradi, chaqiruvchilarning
 *     aksariyati esa uni tekshirmaydi.
 *   - O'QISH-O'ZGARTIRISH-YOZISH poygasi. Ikkita oyna (yoki drenaj bilan
 *     yangi buyurtma) bir vaqtda navbatga tegsa, biri ikkinchisini bosadi.
 *
 * IndexedDB uchalasini ham yechadi va — SQLite dan farqli — Tauri
 * webview'ida ham, telefondagi brauzer kassasida ham AYNAN bir xil ishlaydi,
 * ya'ni ikkita alohida saqlash yo'li paydo bo'lmaydi.
 *
 * Ikkita qoida butun tuzilmani ushlab turadi:
 *
 *   1. O'QISH SINXRON. Kassa kodi sinxron: yozib, darhol o'qiydigan joylar
 *      bor. Shuning uchun haqiqat xotiradagi nusxada, bazaga yozish esa
 *      orqadan, tartibni saqlagan holda ketadi.
 *   2. `localStorage` TASHLANMAYDI. Har bir yozuv unga ham dublikat
 *      qilinadi va ko'chirishdan keyin ham tozalanmaydi. Yangilanish orqaga
 *      qaytarilsa (eski versiya qaytib o'rnatilsa) kassa o'z ma'lumotini
 *      topadi. Bo'sh kassa — yo'qolgan smena.
 */

/** Kassaning yozuvlari shu prefiks bilan boshlanadi. */
const KEY_PREFIX = 'orderplus';

/** Chidamli saqlash — IndexedDB yoki test uchun soxta nusxasi. */
export interface DurableBackend {
  loadAll(): Promise<Record<string, string>>;
  /** Bitta tranzaksiya: yo hammasi yoziladi, yo hech biri. `null` — o'chirish. */
  write(entries: { key: string; value: string | null }[]): Promise<void>;
}

export interface KvStore {
  hydrate(): Promise<void>;
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
  setMany(entries: { key: string; value: string | null }[]): boolean;
  /** Kutayotgan yozuvlar bazaga tushguncha kutadi — testlar va yopilish uchun. */
  flush(): Promise<void>;
  /** Chidamli baza ishlayaptimi. `false` — `localStorage` ga qaytilgan. */
  isDurable(): boolean;
  /** Saqlash umuman ishlayaptimi. */
  isHealthy(): boolean;
  /**
   * Xotiradagi nusxani tashlab, brauzer saqlashidan qaytadan o'qiydi.
   *
   * Ostidagi saqlash BOSHQASIGA almashganda kerak — bu testlarda bo'ladi,
   * va nazariy jihatdan boshqa oyna yozuvlarni almashtirganda ham.
   */
  reload(): void;
}

function browserStore(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** `localStorage` dagi kassa yozuvlari — ko'chirish uchun. */
function readOwnKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  const store = browserStore();
  if (!store) return out;
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      // Begona yozuv bazaga sudralib kirmasligi kerak: bitta domenda
      // boshqa narsa ham yashashi mumkin.
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      const value = store.getItem(key);
      if (typeof value === 'string') out[key] = value;
    }
  } catch {
    // O'qib bo'lmadi — ko'chiradigan narsa yo'q deb hisoblanadi.
  }
  return out;
}

export function createKvStore(backend: DurableBackend): KvStore {
  const mirror = new Map<string, string>();
  let durable = false;
  let healthy = true;
  let hydrated = false;

  /*
   * Hidratatsiya tugagunga qadar yozilgan kalitlar.
   *
   * Kassa hidratatsiyani kutmaydi — `constants/index.ts` API manzilini modul
   * yuklanayotganda o'qiydi, ya'ni birinchi `await` dan ham oldin. Shu
   * oraliqda yozilgan qiymat eng yangisi, va bazadan kelgan eskirgan nusxa
   * uni bosib ketmasligi kerak.
   */
  const writtenBeforeHydrate = new Set<string>();

  // Xotira DARHOL to'ldiriladi: sinxron o'qish hidratatsiyani kuta olmaydi.
  for (const [key, value] of Object.entries(readOwnKeys())) mirror.set(key, value);

  /*
   * Yozuvlar BITTA zanjirda ketadi. Parallel yuborilsa ular o'rin
   * almashishi mumkin va o'shanda eski qiymat yangisini bosib ketardi —
   * navbat uchun bu allaqachon yuborilgan buyurtmaning qaytib kelishi
   * degani.
   */
  let chain: Promise<void> = Promise.resolve();

  /** Hammasi yozilganini qaytaradi. */
  function mirrorToBrowser(entries: { key: string; value: string | null }[]): boolean {
    const store = browserStore();
    if (!store) return false;
    let ok = true;
    for (const { key, value } of entries) {
      try {
        if (value === null) store.removeItem(key);
        else store.setItem(key, value);
      } catch {
        // Joy tugagan bo'lishi mumkin. Chidamli baza bor bo'lsa bu halokat
        // emas — u haqiqat manbai, bu esa orqaga qaytarish uchun nusxa.
        ok = false;
      }
    }
    return ok;
  }

  function enqueue(entries: { key: string; value: string | null }[]): void {
    if (!durable) return;
    chain = chain
      .then(() => backend.write(entries))
      .catch(() => {
        // Yozib bo'lmadi. Xotiradagi nusxa va `localStorage` joyida —
        // savdo to'xtamaydi, lekin iz qoladi.
        console.error('[kvStore] chidamli bazaga yozib bo\'lmadi');
      });
  }

  function apply(entries: { key: string; value: string | null }[]): boolean {
    for (const { key, value } of entries) {
      if (value === null) mirror.delete(key);
      else mirror.set(key, value);
    }
    const browserOk = mirrorToBrowser(entries);
    if (!hydrated) {
      for (const { key } of entries) writtenBeforeHydrate.add(key);
    }
    enqueue(entries);

    if (!durable && !browserOk) {
      /*
       * Yozuv hech qayerga tushmadi. Chaqiruvchilarning aksariyati
       * qaytgan qiymatni tekshirmaydi, shuning uchun iz shu yerda
       * qoldiriladi — aks holda savdo "saqlandi" deb ko'rinar, aslida
       * ilova yopilishi bilan yo'qolardi.
       */
      for (const { key } of entries) console.error(`[storage] yozib bo'lmadi: ${key}`);
    }

    /*
     * Yozuv diskka yetib bordimi.
     *
     * Chidamli baza bor bo'lsa — ha: u kvotaga ham, shaxsiy rejimga ham
     * bog'liq emas. Bo'lmasa esa yagona umid `localStorage` edi va u
     * yiqilgan bo'lsa, yozuv ilova yopilishi bilan yo'qoladi — chaqiruvchi
     * buni BILISHI kerak.
     */
    return durable || browserOk;
  }

  return {
    async hydrate() {
      let rows: Record<string, string> | null = null;
      try {
        rows = await backend.loadAll();
        durable = true;
      } catch {
        /*
         * Baza ochilmadi — yashirin oyna, o'chirilgan saqlash, buzuq profil.
         * Kassa `localStorage` bilan, ya'ni bugungi holatida ishlayveradi.
         * Savdoni to'xtatish bundan yomonroq bo'lardi.
         */
        durable = false;
      }

      const fromBrowser = readOwnKeys();

      if (rows && Object.keys(rows).length > 0) {
        // Baza haqiqat manbai: eskirgan `localStorage` nusxasi uni bosib
        // ketmasligi kerak. Istisno — shu seansda allaqachon yozilgani.
        for (const [key, value] of Object.entries(rows)) {
          if (writtenBeforeHydrate.has(key)) continue;
          mirror.set(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(fromBrowser)) {
          if (writtenBeforeHydrate.has(key)) continue;
          mirror.set(key, value);
        }

        // Birinchi marta yangilangan kassa: butun ish holati `localStorage`
        // da yotibdi va u bazaga ko'chirilishi kerak. `localStorage` esa
        // TOZALANMAYDI — yuqoridagi 2-qoida.
        if (durable && Object.keys(fromBrowser).length > 0) {
          enqueue(Object.entries(fromBrowser).map(([key, value]) => ({ key, value })));
        }
      }

      hydrated = true;
      healthy = true;

      // Hidratatsiyagacha yozilganlar bazaga yetkaziladi: o'sha paytda
      // `durable` hali `false` edi va ular navbatga tushmagan.
      if (durable && writtenBeforeHydrate.size > 0) {
        const pending = [...writtenBeforeHydrate].map((key) => ({
          key,
          value: mirror.has(key) ? mirror.get(key)! : null,
        }));
        enqueue(pending);
      }
      writtenBeforeHydrate.clear();
    },

    get(key) {
      if (mirror.has(key)) return mirror.get(key)!;

      /*
       * Xotirada yo'q — brauzer saqlashiga qaraymiz.
       *
       * Hamma kod shu modul orqali yozmaydi: `deviceId.ts` `localStorage`
       * ga to'g'ridan-to'g'ri tegadi, va bu to'g'ri — u qurilma nomi, kafe
       * yozuvi emas. Bunday kalitlar shu yerdan ham ko'rinib tursin.
       */
      const store = browserStore();
      if (!store) return null;
      try {
        const value = store.getItem(key);
        if (typeof value === 'string') mirror.set(key, value);
        return value ?? null;
      } catch {
        return null;
      }
    },

    set(key, value) {
      return apply([{ key, value }]);
    },

    remove(key) {
      apply([{ key, value: null }]);
    },

    setMany(entries) {
      return apply(entries);
    },

    async flush() {
      await chain;
    },

    isDurable() {
      return durable;
    },

    isHealthy() {
      return healthy;
    },

    reload() {
      mirror.clear();
      writtenBeforeHydrate.clear();
      for (const [key, value] of Object.entries(readOwnKeys())) mirror.set(key, value);
    },
  };
}
