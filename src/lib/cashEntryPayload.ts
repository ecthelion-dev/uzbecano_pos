/**
 * Kassa xarajatining serverga ketadigan tanasi.
 *
 * Qoida alohida faylda: `idempotencyKey` yozuv tug'ilgan paytda beriladi va
 * qayta yuborishda o'zgarmaydi — server aynan shunga qarab takrorni tanaydi.
 * Kalit sifatida `Date.now()` ishlatilsa, bitta kafedagi ikkita kassa bir
 * millisekundda yozganda ikkinchisi jimgina yo'qolardi.
 *
 * Faqat chiqim: kassaga pul savdodan tushadi, uni alohida yozib borish o'sha
 * pulni ikki marta sanash bo'lardi. Kim kiritgani serverda SESSIYADAN olinadi
 * — bu yerdan yuborilgan ismga ishonilmaydi. `kind` yuborilmaydi: server uni
 * "mahsulot" (umumiy xarajat) deb qabul qiladi, doimiy xarajat admin panelda.
 */
export interface CashEntryPayload {
  type: 'chiqim';
  category: string;
  amount: number;
  note?: string;
  idempotencyKey: string;
}

export function buildCashEntryPayload(
  category: string,
  amount: number,
  note: string,
  idempotencyKey: string = crypto.randomUUID(),
): CashEntryPayload {
  return {
    type: 'chiqim',
    category,
    amount,
    note: note.trim() || undefined,
    idempotencyKey,
  };
}
