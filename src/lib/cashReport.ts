import { cashCategoryLabel, categoryKey } from './cashCategories';

export interface CashReportRow {
  label: string;
  chiqim: number;
}

export interface CashReport {
  chiqim: number;
  rows: CashReportRow[];
  /** Blokni umuman chop etish kerakmi. */
  any: boolean;
}

/**
 * Kun oxiridagi hisobot uchun kassadan olingan pulni jamlash.
 *
 * "Kirim" tushunchasi yo'q: kassaga pul faqat savdodan tushadi, ya'ni uni
 * alohida yozib borish o'sha pulni ikki marta sanash bo'lardi.
 */
export function summariseCashReport(entries: any[]): CashReport {
  const groups = new Map<string, CashReportRow>();
  let chiqim = 0;

  for (const entry of entries || []) {
    const amount = Math.max(0, Math.round(Number(entry?.amount) || 0));
    if (!amount) continue;

    // Eski yozuvlar orasida "kirim" bo'lsa, u chiqim sifatida jamlanmaydi —
    // aks holda olingan pul olinmagan pul bilan qo'shilib ketardi.
    if (entry?.type === 'kirim') continue;

    const label = cashCategoryLabel(String(entry?.category || ''));
    if (!label) continue;

    chiqim += amount;

    const key = categoryKey(label);
    const group = groups.get(key) ?? { label, chiqim: 0 };
    group.chiqim += amount;
    groups.set(key, group);
  }

  return {
    chiqim,
    rows: [...groups.values()].sort((a, b) => b.chiqim - a.chiqim),
    any: chiqim > 0,
  };
}

/**
 * Xarajatlar ayirilgandan keyin qolgan pul.
 *
 * Hisobotda "Jami tushum" satri O'RNINI BOSMAYDI, uning ostida turadi:
 * sotilgan taomlar summasi o'z holicha qolishi kerak, aks holda "bugun
 * qancha sotdik" degan savolga hisobotdan javob topib bo'lmaydi va oradan
 * bir oy o'tgach uni tiklashning iloji qolmaydi.
 */
export function netAfterExpenses(revenue: number, report: CashReport): number {
  return Math.round(Number(revenue) || 0) - report.chiqim;
}

/**
 * Xarajatlardan keyin kassada qolgan NAQD.
 *
 * Xarajat faqat naqd puldan olinadi — kassadan sut uchun pul chiqadi,
 * kartadagi pul esa bankda turadi va unga tegib bo'lmaydi. Shuning uchun
 * ayirish naqd satridan bajariladi.
 *
 * Ilgari hisobotda faqat umumiy ayirma turardi, ya'ni "qaysi puldan
 * olindi" degan savol javobsiz qolardi: 273 000 dan 130 000 ayirilgani
 * ko'rinar, lekin kartadagi 50 000 ga hech kim tegmaganini hisobotdan
 * bilib bo'lmasdi.
 */
export function cashAfterExpenses(cashSales: number, report: CashReport): number {
  return Math.round(Number(cashSales) || 0) - report.chiqim;
}
