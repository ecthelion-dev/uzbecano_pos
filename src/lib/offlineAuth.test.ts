import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './testStorage';

installMemoryStorage();

const {
  rememberCredential,
  verifyCachedPin,
  hasCachedCredentials,
  offlineLockStatus,
  OFFLINE_LOGIN_MAX_AGE_MS,
} = await import('./offlineAuth');

const CAFE = 'test-kafe';

function credential(over: Partial<Parameters<typeof rememberCredential>[1]> = {}) {
  return {
    pin: '1234',
    waiterId: 'w1',
    name: 'Aziz',
    role: 'waiter',
    token: 'server-token-abc',
    ...over,
  };
}

beforeEach(() => {
  installMemoryStorage();
});

describe('oflayn kirish keshi', () => {
  it("to'g'ri PIN yozuvni ochadi va tokenni qaytaradi", async () => {
    await rememberCredential(CAFE, credential());
    expect(hasCachedCredentials(CAFE)).toBe(true);

    const res = await verifyCachedPin(CAFE, '1234');
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.credential.waiterId).toBe('w1');
    expect(res.token).toBe('server-token-abc');
  });

  it('PIN ni ham, tokenni ham ochiq saqlamaydi', async () => {
    await rememberCredential(CAFE, credential());
    const raw = localStorage.getItem(`orderplus_${CAFE}_offline_auth`)!;

    // Bu keshni o'qigan odam tayyor sessiyani olmasligi kerak: token PIN dan
    // chiqarilgan kalit ostida shifrlangan bo'lishi shart.
    expect(raw).not.toContain('1234');
    expect(raw).not.toContain('server-token-abc');
  });

  it("noto'g'ri PIN tokenni ochib bermaydi", async () => {
    await rememberCredential(CAFE, credential());
    const res = await verifyCachedPin(CAFE, '9999');
    expect(res.status).toBe('invalid');
  });

  it("5 xato urinishdan keyin bloklaydi", async () => {
    await rememberCredential(CAFE, credential());

    for (let i = 0; i < 4; i++) {
      const r = await verifyCachedPin(CAFE, '0000');
      expect(r.status).toBe('invalid');
    }

    const fifth = await verifyCachedPin(CAFE, '0000');
    expect(fifth.status).toBe('locked');

    // Blok ochilmaguncha TO'G'RI PIN ham qabul qilinmaydi — aks holda cheklov
    // shunchaki kechikish bo'lib qolardi.
    const correct = await verifyCachedPin(CAFE, '1234');
    expect(correct.status).toBe('locked');
    expect(offlineLockStatus(CAFE).locked).toBe(true);
  });

  it("muvaffaqiyatli kirish hisoblagichni nolga qaytaradi", async () => {
    await rememberCredential(CAFE, credential());

    await verifyCachedPin(CAFE, '0000');
    await verifyCachedPin(CAFE, '0000');
    const ok = await verifyCachedPin(CAFE, '1234');
    expect(ok.status).toBe('ok');

    // Hisoblagich tozalanmasa, oldingi ikki xato keyingi seansga qo'shilib
    // ketardi va kassir sababsiz bloklanardi.
    for (let i = 0; i < 4; i++) {
      expect((await verifyCachedPin(CAFE, '0000')).status).toBe('invalid');
    }
  });

  it("bir hafta ishlatilmagan yozuv qabul qilinmaydi", async () => {
    await rememberCredential(CAFE, credential());

    const key = `orderplus_${CAFE}_offline_auth`;
    const list = JSON.parse(localStorage.getItem(key)!);
    list[0].cachedAt = new Date(Date.now() - OFFLINE_LOGIN_MAX_AGE_MS - 1000).toISOString();
    localStorage.setItem(key, JSON.stringify(list));

    expect((await verifyCachedPin(CAFE, '1234')).status).toBe('invalid');
  });

  it("requireElevated oddiy ofitsiantni rad etadi, rahbarni qabul qiladi", async () => {
    await rememberCredential(CAFE, credential({ pin: '1111', waiterId: 'w1', role: 'waiter' }));
    await rememberCredential(CAFE, credential({ pin: '2222', waiterId: 'm1', name: 'Dilnoza', role: 'manager' }));

    const waiter = await verifyCachedPin(CAFE, '1111', { requireElevated: true });
    expect(waiter.status).toBe('invalid');

    const manager = await verifyCachedPin(CAFE, '2222', { requireElevated: true });
    expect(manager.status).toBe('ok');
  });

  it("PIN o'zgarsa bitta xodimga bitta yozuv qoladi", async () => {
    await rememberCredential(CAFE, credential({ pin: '1234' }));
    await rememberCredential(CAFE, credential({ pin: '4321' }));

    const list = JSON.parse(localStorage.getItem(`orderplus_${CAFE}_offline_auth`)!);
    expect(list).toHaveLength(1);

    expect((await verifyCachedPin(CAFE, '1234')).status).toBe('invalid');
    expect((await verifyCachedPin(CAFE, '4321')).status).toBe('ok');
  });

  it("boshqa kafening keshi bu kafega kirish bermaydi", async () => {
    await rememberCredential(CAFE, credential());
    expect(hasCachedCredentials('boshqa-kafe')).toBe(false);
    expect((await verifyCachedPin('boshqa-kafe', '1234')).status).toBe('invalid');
  });

  it("eski formatdagi (tokeni ochiq) yozuvlar o'qilmaydi", async () => {
    localStorage.setItem(
      `orderplus_${CAFE}_offline_auth`,
      JSON.stringify([{ waiterId: 'w1', name: 'Eski', role: 'waiter', version: 1, token: 'ochiq-token' }])
    );

    expect(hasCachedCredentials(CAFE)).toBe(false);
    expect((await verifyCachedPin(CAFE, '1234')).status).toBe('invalid');
  });
});
