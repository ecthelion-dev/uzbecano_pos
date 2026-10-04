import { describe, it, expect } from 'vitest';
import { cafeDay, previousCafeDay } from './businessDate';

describe('businessDate', () => {
  it('Toshkent yarim tunidan keyin kun almashadi (UTC bo‘yicha hali oldingi kun)', () => {
    const at = new Date('2026-10-03T20:00:00Z'); // 4-okt 01:00 Toshkent
    expect(cafeDay(at)).toBe('2026-10-04');
    expect(previousCafeDay(at)).toBe('2026-10-03');
  });

  it('oy chegarasida kecha to‘g‘ri hisoblanadi', () => {
    expect(previousCafeDay(new Date('2026-10-01T07:00:00Z'))).toBe('2026-09-30');
  });
});
