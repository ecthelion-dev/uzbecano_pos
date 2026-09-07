import { describe, it, expect } from 'vitest';
import { aggregateReportLines } from './reportLines';

/**
 * Hisobotdagi taomlar jadvali.
 *
 * Bu raqamlar bo'yicha oshxona mahsulot buyuradi. Xato qator "sotilmagan"
 * taomni sotilganga qo'shib yuboradi va buni faqat oy oxirida sezishadi.
 */
const line = (over: any = {}) => ({
  name: 'Tandir', price: 120000, quantity: 1, totalPrice: 120000, ...over,
});

describe('hisobot jadvali', () => {
  it('bir xil taomni bitta qatorga yig\'adi', () => {
    const rows = aggregateReportLines([line({ quantity: 2, totalPrice: 240000 }), line()], '—');
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(3);
    expect(rows[0].sum).toBe(360000);
  });

  it('narxi boshqa o\'lchamni alohida qator qiladi', () => {
    // "Tandir 1 kg" va "Tandir 2 kg" bitta qatorga qo'shilsa, jadval
    // o'rtacha narxni ko'rsatib yolg'on gapirardi.
    const rows = aggregateReportLines([line(), line({ price: 240000, totalPrice: 240000 })], '—');
    expect(rows).toHaveLength(2);
  });

  it('SABOY porsiyani alohida qator qiladi', () => {
    /*
     * Hisobotdan "nechtasi uyga ketdi" degan savolga javob topilishi
     * kerak. Qo'shib yuborilsa, saboy porsiyalar tovoqda berilganlar
     * ichida yo'qoladi.
     */
    const rows = aggregateReportLines([line(), line({ takeaway: true })], '—');
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.takeaway)).toHaveLength(1);
    expect(rows.find((r) => r.takeaway)!.qty).toBe(1);
  });

  it('saboy porsiyalar o\'zaro qo\'shiladi', () => {
    const rows = aggregateReportLines([line({ takeaway: true }), line({ takeaway: true })], '—');
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(2);
  });

  it('summani qayta hisoblamaydi, qatordagisini oladi', () => {
    // Chegirma qo'llangan qatorda narx x soni summaga teng emas.
    const rows = aggregateReportLines([line({ quantity: 2, totalPrice: 200000 })], '—');
    expect(rows[0].sum).toBe(200000);
  });

  it('summasi yo\'q qatorni narx x sonidan hisoblaydi', () => {
    const rows = aggregateReportLines([{ name: 'Choy', price: 5000, quantity: 3 }], '—');
    expect(rows[0].sum).toBe(15000);
  });

  it('nomsiz qator zaxira nom bilan chiqadi', () => {
    const rows = aggregateReportLines([{ price: 1000, quantity: 1 }], 'Nomsiz');
    expect(rows[0].name).toBe('Nomsiz');
  });
});
