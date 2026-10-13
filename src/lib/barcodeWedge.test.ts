import { describe, it, expect } from 'vitest';
import { createWedgeReader } from './barcodeWedge';

/**
 * USB skaner klaviatura kabi yozadi: belgilar juda tez (har biri 5–30 ms),
 * oxirida Enter. Odam esa sekin teradi. Ajratilmasa, kassirning har bir
 * Enter bosishi "skanerlangan kod" bo'lib qolardi.
 */
function feed(reader: ReturnType<typeof createWedgeReader>, keys: string, start = 0, gapMs = 10) {
  let at = start;
  let result: string | null = null;
  for (const key of keys.split('')) {
    result = reader.push(key, at);
    at += gapMs;
  }
  return { result, at };
}

describe('createWedgeReader', () => {
  it('tez terilgan kod va Enter — skaner deb qaytadi', () => {
    const reader = createWedgeReader();
    const { at } = feed(reader, '4780001234567');

    expect(reader.push('Enter', at)).toBe('4780001234567');
  });

  it('harf-raqamli kod (Code 128) ham o‘qiladi', () => {
    const reader = createWedgeReader();
    const { at } = feed(reader, '2145UZ');

    expect(reader.push('Enter', at)).toBe('2145UZ');
  });

  it('odam sekin terganda Enter kod bermaydi', () => {
    const reader = createWedgeReader();
    const { at } = feed(reader, '12345678', 0, 150);

    expect(reader.push('Enter', at)).toBeNull();
  });

  it('juda qisqa ketma-ketlik (masalan bitta tugma + Enter) kod emas', () => {
    const reader = createWedgeReader();
    const { at } = feed(reader, '12');

    expect(reader.push('Enter', at)).toBeNull();
  });

  /*
   * Kassir bir-ikki tugma bosib qo'ydi, keyin skaner ishladi: eski belgilar
   * kodning boshiga yopishib qolmasligi kerak.
   */
  it('uzun tanaffusdan keyin bufer qaytadan boshlanadi', () => {
    const reader = createWedgeReader();
    feed(reader, '99', 0, 200);
    const { at } = feed(reader, '4780001234567', 5000);

    expect(reader.push('Enter', at)).toBe('4780001234567');
  });

  it('Shift kabi modifikator tugmalar kodni buzmaydi', () => {
    const reader = createWedgeReader();
    let at = 0;
    for (const key of ['Shift', 'U', 'Shift', 'Z', '1', '2']) {
      reader.push(key, at);
      at += 5;
    }

    expect(reader.push('Enter', at)).toBe('UZ12');
  });

  it('kod qaytgandan keyin bufer tozalanadi', () => {
    const reader = createWedgeReader();
    const first = feed(reader, '4780001234567');
    reader.push('Enter', first.at);

    expect(reader.push('Enter', first.at + 5)).toBeNull();
  });
});
