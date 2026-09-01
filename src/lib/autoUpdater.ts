import { IS_DESKTOP_APP } from '../constants';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  version?: string;
  downloading: boolean;
  downloaded: boolean;
  progress?: number;
  error?: string;
}

type UpdateCallback = (status: UpdateStatus) => void;
const listeners = new Set<UpdateCallback>();

let currentStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
};

function notify(update: Partial<UpdateStatus>) {
  currentStatus = { ...currentStatus, ...update };
  listeners.forEach((cb) => cb(currentStatus));
}

export function subscribeUpdateStatus(cb: UpdateCallback): () => void {
  listeners.add(cb);
  cb(currentStatus);
  return () => listeners.delete(cb);
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

/**
 * Yangi versiyani tekshiradi va mavjud bo'lsa fonda yuklab olib qayta ishga tushiradi.
 */
export async function checkForAppUpdates(): Promise<boolean> {
  if (!IS_DESKTOP_APP) return false;

  try {
    notify({ checking: true, error: undefined });
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update) {
      notify({ checking: false, available: false });
      return false;
    }

    notify({
      checking: false,
      available: true,
      version: update.version,
      downloading: true,
      progress: 0,
    });

    let downloadedBytes = 0;
    let totalBytes = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          totalBytes = event.data.contentLength || 0;
          break;
        case 'Progress':
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            const progress = Math.round((downloadedBytes / totalBytes) * 100);
            notify({ progress });
          }
          break;
        case 'Finished':
          notify({ downloading: false, downloaded: true, progress: 100 });
          break;
      }
    });

    // Yangilandi — ilovani yangi versiya bilan qayta ishga tushiramiz
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('Auto-updater tekshirishda xato:', err);
    notify({ checking: false, downloading: false, error: errMsg });
    return false;
  }
}

/**
 * Ilova ishga tushganda fonda yangilanishlarni tekshirishni boshlaydi.
 */
export function initAutoUpdater() {
  if (!IS_DESKTOP_APP) return;

  // Ilova ochilgach 5 soniyadan keyin tekshiradi
  setTimeout(() => {
    checkForAppUpdates();
  }, 5000);

  // Har 1 soatda fonda qayta tekshiradi
  setInterval(() => {
    checkForAppUpdates();
  }, 60 * 60 * 1000);
}
