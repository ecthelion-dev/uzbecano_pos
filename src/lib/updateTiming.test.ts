import { describe, it, expect } from 'vitest';
import { isSafeToInstall } from './updateTiming';

/**
 * Yangilanish o'rnatilganda ilova qayta ochiladi. Savat diskda saqlanadi,
 * lekin kassir ekran oldida turgan paytda oyna yopilib, PIN qayta so'ralsa
 * xizmat to'xtaydi. Shuning uchun faqat kassa band bo'lmaganda o'rnatiladi.
 */
describe('isSafeToInstall', () => {
  const idle = { isLoggedIn: true, hasLiveWork: false, hasQueuedActions: false };

  it('kassir kirmagan bo\'lsa xavfsiz — yopilsa hech kim sezmaydi', () => {
    expect(isSafeToInstall({ ...idle, isLoggedIn: false, hasLiveWork: true })).toBe(true);
  });

  it('ochiq chek yoki chaqiruv bor bo\'lsa xavfli', () => {
    expect(isSafeToInstall({ ...idle, hasLiveWork: true })).toBe(false);
  });

  it('serverga yuborilmagan amal navbatda turgan bo\'lsa xavfli', () => {
    expect(isSafeToInstall({ ...idle, hasQueuedActions: true })).toBe(false);
  });

  it('kirgan, ish yo\'q, navbat bo\'sh bo\'lsa xavfsiz', () => {
    expect(isSafeToInstall(idle)).toBe(true);
  });
});
