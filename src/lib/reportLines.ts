/**
 * Davr hisobotidagi taomlar jadvali.
 *
 * Bir necha yuz chekdagi qatorlarni bitta jadvalga yig'adi: qaysi taom
 * nechta sotilgan va qancha pul keltirgan. Bu raqamlar bo'yicha oshxona
 * mahsulot buyuradi va egasi savdoni tekshiradi, ya'ni ular chekdagi
 * summalar bilan bir tiyingacha mos bo'lishi kerak.
 *
 * Shuning uchun bu yerda narx qayta hisoblanmaydi: har qatorning o'z
 * summasi olinadi va qo'shiladi.
 */

export interface ReportLine {
  name: string;
  price: number;
  qty: number;
  sum: number;
  /** Uyga olib ketilgan porsiya — alohida qator bo'ladi. */
  takeaway: boolean;
}

export interface RawReportItem {
  name?: unknown;
  product?: { name?: unknown; price?: unknown };
  price?: unknown;
  unitPrice?: unknown;
  quantity?: unknown;
  count?: unknown;
  totalPrice?: unknown;
  takeaway?: unknown;
}

/**
 * Qatorlarni jadvalga yig'adi.
 *
 * Kalitda narx ham bor: bir xil nomli, boshqa o'lchamdagi taom boshqa
 * narxda sotiladi va ularni qo'shib yuborish jadvalni yolg'onga
 * aylantiradi.
 *
 * Saboy ham alohida: "nechta porsiya uyga ketdi" degan savolga hisobotdan
 * javob topilishi kerak. Qo'shib yuborilsa, u tovoqda berilgan porsiyalar
 * ichida yo'qoladi.
 */
export function aggregateReportLines(
  items: RawReportItem[],
  unnamedLabel: string,
): ReportLine[] {
  const lines = new Map<string, ReportLine>();

  for (const it of items || []) {
    const name = String(
      (it?.product?.name as string) || (it?.name as string) || unnamedLabel,
    );
    const price = Number(it?.price ?? it?.product?.price ?? it?.unitPrice ?? 0) || 0;
    const qty = Number(it?.quantity ?? it?.count ?? 1) || 1;
    const sum = Number(it?.totalPrice ?? price * qty) || price * qty;
    const takeaway = it?.takeaway === true;

    const key = `${name}__${price}__${takeaway ? 'saboy' : ''}`;
    const prev = lines.get(key);
    if (prev) {
      prev.qty += qty;
      prev.sum += sum;
    } else {
      lines.set(key, { name, price, qty, sum, takeaway });
    }
  }

  return [...lines.values()];
}
