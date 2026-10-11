import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './uuid';

/**
 * `crypto.randomUUID` faqat xavfsiz kontekstda (https, localhost) bor.
 * Lokal markaz rejasida ofitsiant sahifasini kassa `http://192.168.x.x` dan
 * beradi — u yerda bu funksiya `undefined`, va chek ochish `TypeError` bilan
 * yiqilardi. `getRandomValues` esa har qanday kontekstda ishlaydi.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('newId', () => {
  it('xavfsiz kontekstda UUID v4 qaytaradi', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('http sahifada (randomUUID yo`q) ham UUID v4 qaytaradi', () => {
    // Arrange: xavfsiz bo'lmagan kontekstdagi `crypto`.
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });

    // Act
    const ids = Array.from({ length: 200 }, () => newId());

    // Assert: server id ni UUID sifatida tekshiradi, shakl aniq bo'lishi shart.
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/*
 * Qoida kodda saqlanib qolishi uchun: `crypto.randomUUID()` to'g'ridan-to'g'ri
 * chaqirilsa, `http` dagi telefon yana o'sha joyda yiqiladi.
 */
describe('kod bo`ylab', () => {
  const SRC = join(__dirname, '..');

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it('crypto.randomUUID faqat lib/uuid.ts da chaqiriladi', () => {
    const offenders = sourceFiles(SRC)
      .filter((f) => !f.endsWith(join('lib', 'uuid.ts')))
      .filter((f) => /crypto\.randomUUID\s*\(/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f));

    expect(offenders).toEqual([]);
  });
});
