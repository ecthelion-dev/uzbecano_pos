import { describe, it, expect } from 'vitest';
import { nextQrSlip } from './qrKitchenQueue';

const T0 = '2026-09-03T10:00:00.000Z';
const NOW = new Date(T0);
const at = (min: number) => new Date(Date.parse(T0) + min * 60_000).toISOString();

const qr = (id: string, createdAt = at(1), status = 'sent_to_kitchen') =>
  ({ id, source: 'qr', status, createdAt });
const pos = (id: string, createdAt = at(1)) =>
  ({ id, source: 'pos', status: 'sent_to_kitchen', createdAt });

/** Kuzatuv boshlangan holat. */
const tracking = { since: T0, ids: [] as string[] };

describe('QR buyurtma navbati', () => {
  it('birinchi ishga tushishda kuzatuvni boshlaydi, hech narsa chop etmaydi', () => {
    const d = nextQrSlip([qr('a', at(-30))], null, NOW);
    expect(d.print).toBeNull();
    expect(d.save).toEqual({ since: T0, ids: [] });
  });

  /*
   * Ilgari bu yerda id ro'yxati saqlanardi. Ishlamasdi: kassa ishga
   * tushganda buyurtmalar ro'yxati hali bo'sh bo'ladi, ya'ni saqlanadigan
   * narsa ham bo'sh — keyin esa zaldagi hamma ochiq QR buyurtma birma-bir
   * qog'ozga chiqib ketardi.
   */
  it('ishga tushishdagi bo\'sh ro\'yxat eski buyurtmalarni ochib yubormaydi', () => {
    const boot = nextQrSlip([], null, NOW);
    expect(boot.save).toEqual({ since: T0, ids: [] });

    // Endi eski buyurtmalar yuklandi — ular kuzatuvdan oldin berilgan.
    const after = nextQrSlip([qr('eski', at(-30)), qr('yana', at(-5))], boot.save, NOW);
    expect(after.print).toBeNull();
  });

  it('kuzatuvdan keyin kelgan buyurtmani chop etadi', () => {
    expect(nextQrSlip([qr('yangi', at(2))], tracking, NOW).print).toBe('yangi');
  });

  it('kassada berilgan buyurtmani chop etmaydi', () => {
    expect(nextQrSlip([pos('a', at(2))], tracking, NOW).print).toBeNull();
  });

  it('manbasi noma\'lum buyurtmani chop etmaydi', () => {
    // Eski serverda `source` yo'q. Taxmin qilinsa, kassada berilgan har bir
    // buyurtma ikkinchi marta qog'ozga chiqardi.
    const unknown = { id: 'a', status: 'sent_to_kitchen', createdAt: at(2) };
    expect(nextQrSlip([unknown], tracking, NOW).print).toBeNull();
  });

  it('yopilgan buyurtmani chop etmaydi', () => {
    expect(nextQrSlip([qr('a', at(2), 'served')], tracking, NOW).print).toBeNull();
  });

  it('bitta buyurtmani ikki marta chop etmaydi', () => {
    const first = nextQrSlip([qr('a', at(2))], tracking, NOW);
    expect(first.print).toBe('a');
    expect(nextQrSlip([qr('a', at(2))], first.save, NOW).print).toBeNull();
  });

  it('navbatdagilarni birma-bir beradi', () => {
    const orders = [qr('a', at(2)), qr('b', at(3)), qr('c', at(4))];
    let state: any = tracking;
    const got: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d = nextQrSlip(orders, state, NOW);
      if (d.save) state = d.save;
      if (d.print) got.push(d.print);
    }
    expect(got).toEqual(['a', 'b', 'c']);
  });

  it('ro\'yxatni cheksiz o\'stirmaydi', () => {
    const d = nextQrSlip([qr('yangi', at(2))], { since: T0, ids: ['juda', 'eski', 'idlar'] }, NOW);
    expect(d.save!.ids).toEqual(['yangi']);
  });

  it('sanasi o\'qilmaydigan buyurtmani chop etadi', () => {
    // Ikkinchi nusxani qog'ozdan yirtib tashlash mumkin; chop etilmagan
    // buyurtma esa hech kimga bilinmaydi.
    expect(nextQrSlip([qr('a', 'buzuq-sana')], tracking, NOW).print).toBe('a');
  });

  it('eski nusxadagi id ro\'yxatini yo\'qotmaydi', () => {
    // v1.3.26 da bu yerda oddiy massiv turardi.
    const d = nextQrSlip([qr('a', at(2))], ['a'], NOW);
    expect(d.print).toBeNull();
    expect(d.save).toEqual({ since: T0, ids: ['a'] });
  });

  it('hech narsa o\'zgarmasa xotiraga yozmaydi', () => {
    expect(nextQrSlip([qr('a', at(2))], { since: T0, ids: ['a'] }, NOW).save).toBeNull();
  });
});
