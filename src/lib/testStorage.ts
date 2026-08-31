/**
 * Testlar uchun `localStorage` / `sessionStorage` o'rnini bosuvchi oddiy
 * xotira. jsdom keltirmaslik uchun: sinaladigan kod bu ikkitasidan boshqa
 * hech qanday brauzer API siga tegmaydi.
 */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

/** Ikkala saqlashni ham toza holatga qo'yadi va o'shalarni qaytaradi. */
export function installMemoryStorage(): { local: MemoryStorage; session: MemoryStorage } {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: session, configurable: true });
  return { local, session };
}
