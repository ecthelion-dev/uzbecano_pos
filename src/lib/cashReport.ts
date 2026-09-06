import { cashCategoryLabel, categoryKey } from './cashCategories';

export interface CashReportRow {
  label: string;
  chiqim: number;
  kirim: number;
}

export interface CashReport {
  chiqim: number;
  kirim: number;
  rows: CashReportRow[];
  /** Blokni umuman chop etish kerakmi. */
  any: boolean;
}

/**
 * Kun oxiridagi hisobot uchun kassa harakatini jamlash.
 *
 * Bu SOTUV EMAS. Sut uchun kassadan 200 000 chiqsa, o'sha kuni sotilgan
 * taomlar summasi o'zgarmaydi — shuning uchun bu yerdagi hech bir raqam
 * tushum bilan qo'shilmaydi va undan ayirilmaydi. Ikkalasi bitta raqamga
 * aylantirilsa, "bugun qancha sotdik" degan savolga bir umr ishonib
 * bo'lmaydi.
 */
export function summariseCashReport(entries: any[]): CashReport {
  const groups = new Map<string, CashReportRow>();
  let chiqim = 0;
  let kirim = 0;

  for (const entry of entries || []) {
    const amount = Math.max(0, Math.round(Number(entry?.amount) || 0));
    if (!amount) continue;

    const label = cashCategoryLabel(String(entry?.category || ''));
    if (!label) continue;

    const isKirim = entry?.type === 'kirim';
    if (isKirim) kirim += amount;
    else chiqim += amount;

    const key = categoryKey(label);
    const group = groups.get(key) ?? { label, chiqim: 0, kirim: 0 };
    if (isKirim) group.kirim += amount;
    else group.chiqim += amount;
    groups.set(key, group);
  }

  return {
    chiqim,
    kirim,
    rows: [...groups.values()].sort((a, b) => b.chiqim - a.chiqim),
    any: chiqim > 0 || kirim > 0,
  };
}

/**
 * Kun oxirida kassada naqd qancha qolishi kerak.
 *
 * Faqat SHU DAVR: naqd sotuv, ustiga kassaga solingani, minus kassadan
 * olingani. Boshlang'ich pul hisobga olinmaydi — kafe uni yuritmaydi, va
 * bilmagan raqamni nolga tenglashtirib "qoldiq" deb atash noto'g'ri
 * bo'lardi. Karta to'lovlari ham kirmaydi: ular kassaga naqd tushirmaydi.
 */
export function cashThatShouldRemain(cashSales: number, report: CashReport): number {
  return Math.round(Number(cashSales) || 0) + report.kirim - report.chiqim;
}
