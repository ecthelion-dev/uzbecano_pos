import { describe, it, expect, vi } from 'vitest';
import { withDeadline } from './deadline';

describe('withDeadline', () => {
  it('ish vaqtida tugasa uning natijasi', async () => {
    await expect(withDeadline(Promise.resolve('javob'), 1000, null)).resolves.toBe('javob');
  });

  it('vaqt tugasa zaxira qiymat — kassir kutib qolmaydi', async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {});
    const result = withDeadline<string | null>(never, 8000, null);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(result).resolves.toBeNull();
    vi.useRealTimers();
  });

  it('ish xato bilan tugasa xato o‘tadi', async () => {
    await expect(withDeadline(Promise.reject(new Error('x')), 1000, null)).rejects.toThrow('x');
  });
});
