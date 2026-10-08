import { describe, it, expect } from 'vitest';
import { parseTillStatus, splitTableRisk } from './splitRisk';

/*
 * 2026-10-08: kassa oflayn, telefonlar mobil internetda — ikkalasi bir stolni
 * ochdi. Har bir qurilma xavfni o'zi bilishi va aytishi kerak.
 */
describe('splitTableRisk', () => {
  it('oflayn qurilma (kassa yoki telefon) — o‘zi ko‘rmaydi', () => {
    expect(splitTableRisk({ isDesktopApp: true, isOffline: true, tillStatus: 'online' })).toBe('selfOffline');
    expect(splitTableRisk({ isDesktopApp: false, isOffline: true, tillStatus: 'online' })).toBe('selfOffline');
  });

  it('telefon onlayn, kassa jim — tillOffline', () => {
    expect(splitTableRisk({ isDesktopApp: false, isOffline: false, tillStatus: 'offline' })).toBe('tillOffline');
  });

  it('desktop kassa o‘ziga "kassa uzilgan" demaydi', () => {
    expect(splitTableRisk({ isDesktopApp: true, isOffline: false, tillStatus: 'offline' })).toBe('none');
  });

  it('hamma joyida yoki kassa ishlatilmaydi — ogohlantirish yo‘q', () => {
    expect(splitTableRisk({ isDesktopApp: false, isOffline: false, tillStatus: 'online' })).toBe('none');
    expect(splitTableRisk({ isDesktopApp: false, isOffline: false, tillStatus: 'none' })).toBe('none');
  });
});

describe('parseTillStatus', () => {
  it('eski server yoki noma’lum qiymat — none', () => {
    expect(parseTillStatus(undefined)).toBe('none');
    expect(parseTillStatus('kaput')).toBe('none');
    expect(parseTillStatus('offline')).toBe('offline');
  });
});
