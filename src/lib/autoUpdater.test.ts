import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

/**
 * Kassa band paytida o'rnatilmaydi.
 *
 * O'rnatuvchi ilovani yopadi va qayta ochadi. Savat diskda qoladi, lekin
 * kassir ekran oldida turgan paytda oyna yo'qolib, PIN qayta so'ralsa xizmat
 * to'xtaydi. Yuklab olish esa band paytda ham ketaveradi.
 */
describe('kassa band paytida', () => {
  const RECHECK_MS = 30_000;
  const MAX_DEFER_MS = 8 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    check.mockResolvedValue({ version: '1.4.3', download, install });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('yuklab oladi, lekin o\'rnatmaydi va banner `ready` da qoladi', async () => {
    const { checkForAppUpdates, setInstallGuard, getUpdateStatus } = await freshModule();
    setInstallGuard(() => false);

    await checkForAppUpdates();
    await vi.advanceTimersByTimeAsync(RECHECK_MS);

    expect(download).toHaveBeenCalledTimes(1);
    expect(install).not.toHaveBeenCalled();
    expect(getUpdateStatus().phase).toBe('ready');
  });

  it('kassa bo\'shagach keyingi tekshiruvda o\'rnatadi', async () => {
    const { checkForAppUpdates, setInstallGuard } = await freshModule();
    let safe = false;
    setInstallGuard(() => safe);

    await checkForAppUpdates();
    await vi.advanceTimersByTimeAsync(RECHECK_MS);
    expect(install).not.toHaveBeenCalled();

    safe = true;
    await vi.advanceTimersByTimeAsync(RECHECK_MS);

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('sakkiz soatdan keyin band bo\'lsa ham o\'rnatadi — kassa eski versiyada qotib qolmasin', async () => {
    const { checkForAppUpdates, setInstallGuard } = await freshModule();
    setInstallGuard(() => false);

    await checkForAppUpdates();
    await vi.advanceTimersByTimeAsync(MAX_DEFER_MS + RECHECK_MS);

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('ilova yiqilsa (to\'siq olib tashlansa) kutmasdan o\'rnatadi', async () => {
    const { checkForAppUpdates, setInstallGuard } = await freshModule();
    const removeGuard = setInstallGuard(() => false);

    await checkForAppUpdates();
    expect(install).not.toHaveBeenCalled();

    // React daraxti qulaganda App unmount bo'ladi — 1.4.1 dagi oq ekran
    // holatida ham yangilanish o'tishi kerak.
    removeGuard();
    await vi.advanceTimersByTimeAsync(RECHECK_MS);

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('to\'siqning o\'zi xato otsa yangilanishni to\'sib qo\'ymaydi', async () => {
    const { checkForAppUpdates, setInstallGuard } = await freshModule();
    setInstallGuard(() => {
      throw new Error('holat o\'qilmadi');
    });

    await checkForAppUpdates();
    await vi.advanceTimersByTimeAsync(0);

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('banner tugmasi (installUpdate) to\'siqni chetlab o\'tadi', async () => {
    const { checkForAppUpdates, setInstallGuard, installUpdate } = await freshModule();
    setInstallGuard(() => false);

    await checkForAppUpdates();
    await installUpdate();

    expect(install).toHaveBeenCalledTimes(1);
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
