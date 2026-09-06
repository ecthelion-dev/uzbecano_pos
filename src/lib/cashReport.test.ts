import { describe, it, expect } from 'vitest';
import { summariseCashReport, cashThatShouldRemain } from './cashReport';

describe('hisobotdagi kassa harakati', () => {
  const entries = [
    { type: 'chiqim', category: 'Sut', amount: 90000 },
    { type: 'chiqim', category: 'Sut', amount: 5000 },
    { type: 'chiqim', category: 'Obed', amount: 35000 },
    { type: 'kirim', category: 'Mayda pul', amount: 20000 },
  ];

  it('chiqim va kirimni alohida jamlaydi', () => {
    const r = summariseCashReport(entries);
    expect(r.chiqim).toBe(130000);
    expect(r.kirim).toBe(20000);
  });

  it('turkum bo‘yicha, eng kattasi birinchi', () => {
    const r = summariseCashReport(entries);
    expect(r.rows.map((x) => x.label)).toEqual(['Sut', 'Obed', 'Mayda pul']);
    expect(r.rows[0]).toEqual({ label: 'Sut', chiqim: 95000, kirim: 0 });
  });

  it('bir xil nom har xil harf bilan yozilsa bitta qatorda', () => {
    // Aks holda hisobotda "Sut 90 000" va "sut 5 000" ikkita satr bo'lib,
    // umumiy summa to'g'ri, ko'rinishi esa chalkash bo'lardi.
    const r = summariseCashReport([
      { type: 'chiqim', category: 'Sut', amount: 90000 },
      { type: 'chiqim', category: 'sut', amount: 5000 },
    ]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].chiqim).toBe(95000);
  });

  it('eski mashina nomlari o‘qiladigan bo‘lib chiqadi', () => {
    expect(summariseCashReport([{ type: 'chiqim', category: 'gazli_suv', amount: 1000 }]).rows[0].label)
      .toBe('Gazli suv');
  });

  it('yozuv bo‘lmasa blok chop etilmaydi', () => {
    expect(summariseCashReport([]).any).toBe(false);
    expect(summariseCashReport([{ type: 'chiqim', category: 'Sut', amount: 0 }]).any).toBe(false);
  });

  it('buzuq yozuv hisobotni yiqitmaydi', () => {
    const r = summariseCashReport([
      { type: 'chiqim', category: 'Sut', amount: 1000 },
      { type: 'chiqim', category: '', amount: 5000 },
      { type: 'chiqim', category: 'Sut', amount: 'ko‘p' },
      null,
    ] as any);
    expect(r.chiqim).toBe(1000);
  });
});

describe('kassada qolishi kerak bo‘lgan naqd', () => {
  it('naqd sotuv + kirim − chiqim', () => {
    const r = summariseCashReport([
      { type: 'chiqim', category: 'Sut', amount: 90000 },
      { type: 'kirim', category: 'Mayda pul', amount: 20000 },
    ]);
    expect(cashThatShouldRemain(200000, r)).toBe(130000);
  });

  it('karta to‘lovlari kirmaydi — ular kassaga naqd tushirmaydi', () => {
    // Chaqiruvchi naqd summani beradi; karta bu yerga umuman kelmaydi.
    const r = summariseCashReport([{ type: 'chiqim', category: 'Sut', amount: 50000 }]);
    expect(cashThatShouldRemain(100000, r)).toBe(50000);
  });

  it('chiqim sotuvdan ko‘p bo‘lsa manfiy chiqadi — kassaga pul solish kerak', () => {
    // Yashirmaymiz: manfiy raqam aynan shu holatni ko'rsatib turishi kerak.
    const r = summariseCashReport([{ type: 'chiqim', category: 'Sut', amount: 200000 }]);
    expect(cashThatShouldRemain(50000, r)).toBe(-150000);
  });

  it('xarajatsiz kunda naqd sotuvning o‘zi', () => {
    expect(cashThatShouldRemain(198000, summariseCashReport([]))).toBe(198000);
  });
});
