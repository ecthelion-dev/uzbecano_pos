import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './testStorage';

installMemoryStorage();

const { nextDailyNumber, peekDailyNumber } = await import('./dailySequence');

beforeEach(() => {
  installMemoryStorage();
});

const morning = new Date('2026-09-02T09:00:00');
const evening = new Date('2026-09-02T23:30:00');
const nextDay = new Date('2026-09-03T08:00:00');

describe('kunlik tartib raqami', () => {
  it('birinchi buyurtmaga 1 beradi', () => {
    expect(nextDailyNumber('uzbecano', morning)).toBe(1);
  });

  it('kun davomida ketma-ket o\'sadi', () => {
    expect(nextDailyNumber('uzbecano', morning)).toBe(1);
    expect(nextDailyNumber('uzbecano', morning)).toBe(2);
    expect(nextDailyNumber('uzbecano', evening)).toBe(3);
  });

  it('yangi kunda yana birdan boshlanadi', () => {
    nextDailyNumber('uzbecano', morning);
    nextDailyNumber('uzbecano', evening);
    expect(nextDailyNumber('uzbecano', nextDay)).toBe(1);
  });

  it('har bir kafe o\'z hisobini yuritadi', () => {
    expect(nextDailyNumber('uzbecano', morning)).toBe(1);
    expect(nextDailyNumber('boshqa', morning)).toBe(1);
    expect(nextDailyNumber('uzbecano', morning)).toBe(2);
  });

  it('buzuq yozuvdan keyin ham raqam beradi', () => {
    localStorage.setItem('orderplus_uzbecano_kitchen_seq', '{buzuq');
    expect(nextDailyNumber('uzbecano', morning)).toBe(1);
    expect(nextDailyNumber('uzbecano', morning)).toBe(2);
  });

  it('peek raqamni sarflamaydi', () => {
    nextDailyNumber('uzbecano', morning);
    expect(peekDailyNumber('uzbecano', morning)).toBe(1);
    expect(peekDailyNumber('uzbecano', morning)).toBe(1);
    expect(nextDailyNumber('uzbecano', morning)).toBe(2);
  });

  it('kun almashgach peek nolga qaytadi', () => {
    nextDailyNumber('uzbecano', morning);
    expect(peekDailyNumber('uzbecano', nextDay)).toBe(0);
  });
});
