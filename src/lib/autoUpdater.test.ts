import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Avto-yangilanish.
 *
 * Bu yerdagi asosiy savol bitta: yuklab olingan paket kassirdan hech nima
 * so'ramasdan o'rnatiladimi? 1.4.1 da javob "yo'q" edi va oq ekranda qotib
 * qolgan kassa o'zini tuzata olmadi — o'rnatish tugmasi qulagan React
 * daraxti ichida edi. Shuning uchun o'rnatishning avtomatikligi endi
 * test bilan qulflangan.
 */

const install = vi.fn();
const download = vi.fn();
const check = vi.fn();
const relaunch = vi.fn();

vi.mock('../constants', () => ({ IS_DESKTOP_APP: true }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: (...a: unknown[]) => check(...a) }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: (...a: unknown[]) => relaunch(...a) }));

async function freshModule() {
  vi.resetModules();
  return import('./autoUpdater');
}

beforeEach(() => {
  install.mockReset().mockResolvedValue(undefined);
  download.mockReset().mockResolvedValue(undefined);
  relaunch.mockReset().mockResolvedValue(undefined);
  check.mockReset();
});

describe('yuklab olingach o‘rnatish', () => {
  it('kassir hech nima bosmasdan o‘rnatiladi', async () => {
    check.mockResolvedValue({ version: '1.4.3', download, install });

    const { checkForAppUpdates } = await freshModule();
    await checkForAppUpdates();

    expect(download).toHaveBeenCalled();
    expect(install).toHaveBeenCalled();
  });

  it('yangilanish bo‘lmasa hech nima o‘rnatilmaydi', async () => {
    check.mockResolvedValue(null);

    const { checkForAppUpdates, getUpdateStatus } = await freshModule();
    await checkForAppUpdates();

    expect(install).not.toHaveBeenCalled();
    expect(getUpdateStatus().phase).toBe('idle');
  });

  it('tekshirish otsa o‘rnatishga urinilmaydi', async () => {
    check.mockRejectedValue(new Error('tarmoq yo‘q'));

    const { checkForAppUpdates, getUpdateStatus } = await freshModule();
    await checkForAppUpdates();

    expect(install).not.toHaveBeenCalled();
    expect(getUpdateStatus().phase).toBe('error');
  });

  it('o‘rnatish otsa holat `ready` ga qaytadi — banner zaxira yo‘l bo‘lib qoladi', async () => {
    check.mockResolvedValue({ version: '1.4.3', download, install });
    install.mockRejectedValue(new Error('o‘rnatuvchi ishga tushmadi'));

    const { checkForAppUpdates, getUpdateStatus } = await freshModule();
    await checkForAppUpdates();
    // Avtomatik o'rnatish "fire-and-forget" — xato qaytishini kutamiz.
    await new Promise((r) => setTimeout(r, 0));

    const status = getUpdateStatus();
    expect(status.phase).toBe('ready');
    expect(status.error).toContain('o‘rnatuvchi');
  });
});

describe('takroriy tekshiruv', () => {
  it('paket tayyor bo‘lsa qayta yuklab olmaydi', async () => {
    check.mockResolvedValue({ version: '1.4.3', download, install });

    const { checkForAppUpdates } = await freshModule();
    await checkForAppUpdates();
    await checkForAppUpdates();

    // Soatlik interval yarim yuklangan paket ustiga ikkinchisini boshlamasin.
    expect(check).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
  });
});
