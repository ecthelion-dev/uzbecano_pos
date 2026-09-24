import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './testStorage';

installMemoryStorage();

const { readSession, writeSession, clearSession, purgeLegacySession, getTokenExpiry, isTokenExpiringSoon } = await import('./session');

const CAFE = 'test-kafe';
const WAITER = { id: 'w1', name: 'Aziz', role: 'waiter', cafeId: CAFE } as any;

beforeEach(() => {
  installMemoryStorage();
});

describe('kassa sessiyasi', () => {
  it('yozilgan sessiyani qaytaradi', () => {
    writeSession(CAFE, WAITER, 'jwt-abc');
    expect(readSession(CAFE)).toEqual({ waiter: WAITER, token: 'jwt-abc' });
  });

  it('tokenni diskda emas, sessionStorage da saqlaydi', () => {
    writeSession(CAFE, WAITER, 'jwt-abc');

    // Bu asosiy qoida: localStorage dagi token kassa o'chirilgandan keyin ham
    // diskda qolar edi, ya'ni WebView faylini o'qigan odam uchun tayyor
    // sessiya. sessionStorage ilova yopilishi bilan o'chadi.
    expect(localStorage.getItem(`orderplus_${CAFE}_session`)).toBeNull();
    expect(sessionStorage.getItem(`orderplus_${CAFE}_session`)).not.toBeNull();
  });

  it('chiqishda sessiyani butunlay o‘chiradi', () => {
    writeSession(CAFE, WAITER, 'jwt-abc');
    clearSession(CAFE);
    expect(readSession(CAFE)).toBeNull();
  });

  it('eski versiyalar qoldirgan ochiq tokenni tozalaydi', () => {
    localStorage.setItem(`orderplus_${CAFE}_auth_token`, 'eski-ochiq-token');
    localStorage.setItem(`orderplus_${CAFE}_current_waiter`, JSON.stringify(WAITER));

    purgeLegacySession(CAFE);

    expect(localStorage.getItem(`orderplus_${CAFE}_auth_token`)).toBeNull();
    expect(localStorage.getItem(`orderplus_${CAFE}_current_waiter`)).toBeNull();
  });

  it('chiqish eski qoldiqlarni ham birga tozalaydi', () => {
    localStorage.setItem(`orderplus_${CAFE}_auth_token`, 'eski-ochiq-token');
    writeSession(CAFE, WAITER, 'jwt-abc');

    clearSession(CAFE);

    expect(localStorage.getItem(`orderplus_${CAFE}_auth_token`)).toBeNull();
  });

  it('buzilgan yozuvda yiqilmaydi', () => {
    sessionStorage.setItem(`orderplus_${CAFE}_session`, '{buzilgan json');
    expect(readSession(CAFE)).toBeNull();
  });

  it('waiter siz yozuvni sessiya deb qabul qilmaydi', () => {
    sessionStorage.setItem(`orderplus_${CAFE}_session`, JSON.stringify({ token: 'jwt-abc' }));
    expect(readSession(CAFE)).toBeNull();
  });

  it('bir kafening sessiyasi boshqasiga o‘tmaydi', () => {
    writeSession(CAFE, WAITER, 'jwt-abc');
    expect(readSession('boshqa-kafe')).toBeNull();
  });

  it('bir kafedan chiqish boshqasining sessiyasini buzmaydi', () => {
    writeSession(CAFE, WAITER, 'jwt-abc');
    writeSession('boshqa-kafe', WAITER, 'jwt-xyz');

    clearSession(CAFE);

    expect(readSession(CAFE)).toBeNull();
    expect(readSession('boshqa-kafe')?.token).toBe('jwt-xyz');
  });

  it('token exp vaqtini to‘g‘ri ajratib oladi', () => {
    const payload = Buffer.from(JSON.stringify({ exp: 1999999999 })).toString('base64url');
    const fakeJwt = `header.${payload}.sig`;
    expect(getTokenExpiry(fakeJwt)).toBe(1999999999);
    expect(getTokenExpiry('not-a-jwt')).toBeNull();
  });

  it('token yaqinda eskirishini aniqlaydi', () => {
    const now = Math.floor(Date.now() / 1000);
    const expiringSoon = `header.${Buffer.from(JSON.stringify({ exp: now + 3600 })).toString('base64url')}.sig`;
    const freshToken = `header.${Buffer.from(JSON.stringify({ exp: now + 24 * 3600 })).toString('base64url')}.sig`;

    expect(isTokenExpiringSoon(expiringSoon)).toBe(true);
    expect(isTokenExpiringSoon(freshToken)).toBe(false);
  });
});
