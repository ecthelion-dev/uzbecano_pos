import { describe, it, expect } from 'vitest';
import { summariseCashReport, netAfterExpenses } from './cashReport';

describe('hisobotdagi kassa harakati', () => {
  const entries = [
    { type: 'chiqim', category: 'Sut', amount: 90000 },
    { type: 'chiqim', category: 'Sut', amount: 5000 },
    { type: 'chiqim', category: 'Obed', amount: 35000 },
  ];

  it('olingan pulni jamlaydi', () => {
    expect(summariseCashReport(entries).chiqim).toBe(130000);
  });

  it('turkum bo‘yicha, eng kattasi birinchi', () => {
    const r = summariseCashReport(entries);
    expect(r.rows.map((x) => x.label)).toEqual(['Sut', 'Obed']);
    expect(r.rows[0]).toEqual({ label: 'Sut', chiqim: 95000 });
  });

  it('eski "kirim" yozuvlari chiqimga qo‘shilmaydi', () => {
    // Kassaga pul faqat savdodan tushadi, shuning uchun kirim endi
    // yozilmaydi. Eskisi bo'lsa, u olingan pul bilan qo'shilib ketmasligi
    // kerak.
    const r = summariseCashReport([
      { type: 'chiqim', category: 'Sut', amount: 90000 },
      { type: 'kirim', category: 'Mayda pul', amount: 20000 },
    ]);
    expect(r.chiqim).toBe(90000);
    expect(r.rows).toHaveLength(1);
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

describe('xarajatlar ayirilgandan keyingi pul', () => {
  it('tushumdan chiqim ayiriladi', () => {
    const r = summariseCashReport([
      { type: 'chiqim', category: 'Sut', amount: 95000 },
      { type: 'chiqim', category: 'Obed', amount: 35000 },
    ]);
    expect(netAfterExpenses(273000, r)).toBe(143000);
  });

  it('xarajatsiz kunda tushumning o‘zi', () => {
    expect(netAfterExpenses(273000, summariseCashReport([]))).toBe(273000);
  });

  it('chiqim tushumdan ko‘p bo‘lsa manfiy chiqadi', () => {
    // Yashirmaymiz: manfiy raqam aynan shu holatni ko'rsatib turishi kerak.
    const r = summariseCashReport([{ type: 'chiqim', category: 'Sut', amount: 200000 }]);
    expect(netAfterExpenses(50000, r)).toBe(-150000);
  });

  it('tushum raqami O‘ZGARMAYDI — faqat yangi raqam hisoblanadi', () => {
    // Sotilgan taomlar summasi hisobotda o'z holicha qolishi kerak, aks
    // holda "bugun qancha sotdik" degan savolga javob topib bo'lmaydi.
    const revenue = 273000;
    const r = summariseCashReport([{ type: 'chiqim', category: 'Sut', amount: 95000 }]);
    netAfterExpenses(revenue, r);
    expect(revenue).toBe(273000);
  });
});
