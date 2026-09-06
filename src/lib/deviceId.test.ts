import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './testStorage';

describe('qurilma nomi', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('bir xil qoladi', async () => {
    const { getDeviceId } = await import('./deviceId');
    expect(getDeviceId()).toBe(getDeviceId());
  });

  it('serverdagi tekshiruvdan o‘tadigan shaklda', async () => {
    // Server nomni `[A-Za-z0-9._:-]{8,64}` bo'yicha tekshiradi va mos
    // kelmasa belgini umuman qo'ymaydi.
    const { getDeviceId } = await import('./deviceId');
    expect(getDeviceId()).toMatch(/^[A-Za-z0-9._:-]{8,64}$/);
  });
});
