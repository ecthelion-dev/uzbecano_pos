import { IS_DESKTOP_APP } from '../constants';
import type { Update } from '@tauri-apps/plugin-updater';

/**
 * Kassa uchun avto-yangilash.
 *
 * Yangilanish yuklab olingan zahoti o'rnatiladi — kassir hech nima bosmaydi.
 *
 * Ilgari o'rnatish tugmaga bog'langan edi, chunki o'rnatuvchi ilovani
 * so'ramasdan yopadi va yozilayotgan buyurtma yo'qolardi. Endi bu xavf yo'q:
 * savatlar diskda saqlanadi (`carts`), ya'ni ilova qayta ochilganda ular
 * joyida turadi va yopilish buyurtmani o'chirmaydi.
 *
 * Tugmaga bog'lashning ikkinchi narxi 1.4.1 da ko'rindi: render qulaganda
 * banner ham yo'qoladi va kassa oq ekranda qotib qoladi — o'zini yangilab
 * tuzata olmaydi, chunki bosadigan tugma yo'q. Bu modul React'dan tashqarida
 * ishlagani uchun endi bunday holatda ham yangilanish o'tadi.
 *
 * Banner o'chirilmadi: u endi jarayonni ko'rsatadi va avtomatik o'rnatish
 * xato bersa, qayta urinish uchun tugma bo'lib qoladi.
 */

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  /** Yuklab olindi, o'rnatish uchun qayta ishga tushirish kutilmoqda. */
  | 'ready'
  | 'installing'
  | 'error';

export interface UpdateStatus {
  phase: UpdatePhase;
  version?: string;
  /** 0..100, faqat `downloading` paytida. */
  progress?: number;
  error?: string;
  /** Xodim bannerni yopgan bo'lsa — `ready` bo'lsa ham ko'rsatilmaydi. */
  dismissed: boolean;
}

type UpdateCallback = (status: UpdateStatus) => void;
const listeners = new Set<UpdateCallback>();

let currentStatus: UpdateStatus = { phase: 'idle', dismissed: false };

/** Yuklab olingan paket — `install()` shu obyektda chaqirilishi shart. */
let pendingUpdate: Update | null = null;

/** Bir vaqtda bitta tekshiruv: soatlik interval sekin yuklanish ustiga ikkinchisini boshlab yubormasin. */
let inFlight: Promise<boolean> | null = null;

/** Yopilgan banner shu vaqtdan keyin qayta ko'rsatiladi (smena oxirigacha unutilib ketmasligi uchun). */
const REMIND_AFTER_MS = 30 * 60 * 1000;
let remindTimer: ReturnType<typeof setTimeout> | null = null;

function notify(update: Partial<UpdateStatus>) {
  currentStatus = { ...currentStatus, ...update };
  listeners.forEach((cb) => cb(currentStatus));
}

export function subscribeUpdateStatus(cb: UpdateCallback): () => void {
  listeners.add(cb);
  cb(currentStatus);
  return () => {
    listeners.delete(cb);
  };
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

/** Bannerni yashiradi. Yangilanish yo'qolmaydi — yarim soatdan keyin yana eslatiladi. */
export function dismissUpdate() {
  notify({ dismissed: true });
  if (remindTimer) clearTimeout(remindTimer);
  remindTimer = setTimeout(() => {
    if (currentStatus.phase === 'ready') notify({ dismissed: false });
  }, REMIND_AFTER_MS);
}

/**
 * Yangi versiyani tekshiradi va bo'lsa fonda yuklab oladi. O'rnatmaydi.
 *
 * @returns yangilanish yuklab olinib, o'rnatishga tayyor bo'lsa `true`.
 */
export function checkForAppUpdates(): Promise<boolean> {
  if (!IS_DESKTOP_APP) return Promise.resolve(false);
  // Paket allaqachon tayyor — qayta tekshirishning ma'nosi yo'q.
  if (pendingUpdate) return Promise.resolve(true);
  if (inFlight) return inFlight;

  inFlight = runCheck().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runCheck(): Promise<boolean> {
  try {
    notify({ phase: 'checking', error: undefined });
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update) {
      notify({ phase: 'idle', version: undefined, progress: undefined });
      return false;
    }

    notify({ phase: 'downloading', version: update.version, progress: 0, dismissed: false });

    let downloadedBytes = 0;
    let totalBytes = 0;

    await update.download((event) => {
      switch (event.event) {
        case 'Started':
          totalBytes = event.data.contentLength || 0;
          break;
        case 'Progress':
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            notify({ progress: Math.round((downloadedBytes / totalBytes) * 100) });
          }
          break;
      }
    });

    pendingUpdate = update;
    notify({ phase: 'ready', progress: 100 });

    // Darhol o'rnatamiz. Xato bo'lsa `installUpdate` holatni `ready` ga
    // qaytaradi va banner tugmasi zaxira yo'l bo'lib qoladi.
    void installUpdate();
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('Auto-updater tekshirishda xato:', err);
    notify({ phase: 'error', progress: undefined, error: errMsg });
    return false;
  }
}

/**
 * Yuklab olingan yangilanishni o'rnatadi va ilovani qayta ishga tushiradi.
 *
 * Yuklab olingach avtomatik chaqiriladi; banner tugmasi esa xato bo'lgan
 * holatda qayta urinish uchun xizmat qiladi.
 */
export async function installUpdate(): Promise<void> {
  if (!pendingUpdate) return;

  try {
    notify({ phase: 'installing' });
    await pendingUpdate.install();
    // Windows'da bu yergacha yetib kelinmaydi: o'rnatuvchi ilovani o'zi
    // yopadi. macOS/Linux'da esa qayta ishga tushirish bizning zimmamizda.
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('Yangilanishni o‘rnatishda xato:', err);
    // Paketni saqlab qolamiz — xodim qayta urinib ko'rishi mumkin.
    notify({ phase: 'ready', error: errMsg });
  }
}

/** Ilova ishga tushganda fonda yangilanishlarni tekshirishni boshlaydi. */
export function initAutoUpdater() {
  if (!IS_DESKTOP_APP) return;

  // Ilova ochilgach 5 soniyadan keyin tekshiradi
  setTimeout(() => {
    void checkForAppUpdates();
  }, 5000);

  // Har 1 soatda fonda qayta tekshiradi
  setInterval(() => {
    void checkForAppUpdates();
  }, 60 * 60 * 1000);
}
