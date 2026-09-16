import type { DurableBackend } from './kvStore';

/**
 * `kvStore` uchun IndexedDB.
 *
 * Bu yerda faqat idish bor, qoida yo'q: barcha qarorlar (ko'chirish, zaxira,
 * tartib) `kvStore.ts` da va ular test bilan qulflangan. Shuning uchun bu
 * fayl ataylab zerikarli.
 *
 * Har bir amal o'z tranzaksiyasida ketadi. `write` ga berilgan yozuvlar esa
 * BITTASIDA: `sync_queue` va `sync_failed` ni birga yozish uchun aynan shu
 * kerak — ular orasida ilova yiqilsa pul ikkala ro'yxatdan ham tushib
 * qolardi.
 */

const DB_NAME = 'orderplus_pos';
const DB_VERSION = 1;
const STORE = 'kv';

/** Baza ochilishini kutadi. Bo'lmasa xato — chaqiruvchi zaxiraga o'tadi. */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB yo‘q'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB ochilmadi'));
    /*
     * Boshqa oyna eski versiyani ushlab turibdi. Kutib o'tirmaymiz: kassa
     * `localStorage` bilan ishlayveradi va kassir hech narsani sezmaydi.
     */
    request.onblocked = () => reject(new Error('IndexedDB band'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      // Keyingi urinish qaytadan ochishga harakat qilsin.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export function createIdbBackend(): DurableBackend {
  return {
    async loadAll() {
      const conn = await db();
      return new Promise((resolve, reject) => {
        const tx = conn.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const out: Record<string, string> = {};

        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) {
            resolve(out);
            return;
          }
          const key = String(cursor.key);
          const value = cursor.value;
          if (typeof value === 'string') out[key] = value;
          cursor.continue();
        };
        cursorReq.onerror = () => reject(cursorReq.error ?? new Error('o‘qib bo‘lmadi'));
        tx.onerror = () => reject(tx.error ?? new Error('tranzaksiya yiqildi'));
      });
    },

    async write(entries) {
      if (entries.length === 0) return;
      const conn = await db();
      return new Promise((resolve, reject) => {
        const tx = conn.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        for (const { key, value } of entries) {
          if (value === null) store.delete(key);
          else store.put(value, key);
        }
        // `oncomplete` — yozuv rostdan ham diskka tushgani. `onsuccess`
        // bu yerda yetarli emas: tranzaksiya keyin ham bekor bo'lishi mumkin.
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('yozib bo‘lmadi'));
        tx.onabort = () => reject(tx.error ?? new Error('tranzaksiya bekor qilindi'));
      });
    },
  };
}
