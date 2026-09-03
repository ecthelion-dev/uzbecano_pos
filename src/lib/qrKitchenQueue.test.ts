import { describe, it, expect } from 'vitest';
import { nextQrSlip } from './qrKitchenQueue';

const qr = (id: string, status = 'sent_to_kitchen') => ({ id, source: 'qr', status });
const pos = (id: string, status = 'sent_to_kitchen') => ({ id, source: 'pos', status });

describe('QR buyurtma navbati', () => {
  it('birinchi ishga tushishda hech narsa chop etmaydi', () => {
    // Yangilanish o'rnatilganda zalda ochiq QR buyurtmalar turgan bo'lishi
    // mumkin. Ular allaqachon berilgan — kassa ularni birdaniga qog'ozga
    // tushirsa, oshxona bir dasta eski buyurtma oladi.
    const d = nextQrSlip([qr('a'), qr('b')], null);
    expect(d.print).toBeNull();
    expect(d.save).toEqual(['a', 'b']);
  });

  it('birinchi ishga tushishdan keyin kelgan buyurtmani chop etadi', () => {
    const d = nextQrSlip([qr('a'), qr('b'), qr('yangi')], ['a', 'b']);
    expect(d.print).toBe('yangi');
    expect(d.save).toEqual(expect.arrayContaining(['a', 'b', 'yangi']));
  });

  it('kassada berilgan buyurtmani chop etmaydi', () => {
    // Uni kassir tasdiqlaganda kvitansiya allaqachon chiqqan.
    expect(nextQrSlip([pos('a')], []).print).toBeNull();
  });

  it('manbasi noma\'lum buyurtmani chop etmaydi', () => {
    // Eski serverda `source` yo'q. Taxmin qilinsa, kassada berilgan har bir
    // buyurtma ikkinchi marta qog'ozga chiqardi.
    expect(nextQrSlip([{ id: 'a', status: 'sent_to_kitchen' }], []).print).toBeNull();
  });

  it('yopilgan buyurtmani chop etmaydi', () => {
    expect(nextQrSlip([qr('a', 'served')], []).print).toBeNull();
  });

  it('bitta buyurtmani ikki marta chop etmaydi', () => {
    const first = nextQrSlip([qr('a')], []);
    expect(first.print).toBe('a');
    const second = nextQrSlip([qr('a')], first.save!);
    expect(second.print).toBeNull();
  });

  it('navbatdagilarni birma-bir beradi', () => {
    let printed: string[] = [];
    const orders = [qr('a'), qr('b'), qr('c')];
    const got: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d = nextQrSlip(orders, printed);
      if (d.save) printed = d.save;
      if (d.print) got.push(d.print);
    }
    expect(got).toEqual(['a', 'b', 'c']);
  });

  it('ro\'yxatni cheksiz o\'stirmaydi', () => {
    // Kassa endi ko'rmaydigan buyurtma ro'yxatdan tushadi. Yopilgan buyurtma
    // faol ro'yxatga qaytmaydi, ya'ni u qayta chop etilmaydi.
    const d = nextQrSlip([qr('yangi')], ['juda', 'eski', 'idlar']);
    expect(d.save).toEqual(['yangi']);
  });

  it('hech narsa o\'zgarmasa xotiraga yozmaydi', () => {
    expect(nextQrSlip([qr('a')], ['a']).save).toBeNull();
  });
});
