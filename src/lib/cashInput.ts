/**
 * To'lov oynasidagi naqd maydonining holati.
 *
 * Maydon ikki xil yo'l bilan to'ladi: kassir raqam terib yoki tayyor summa
 * qo'yiladigan tugma ("Naqd", "Karta") bosilib. Bu ikkisi bir xil ishlay
 * olmaydi, shuning uchun holatda `replace` bayrog'i bor.
 */
export interface CashEntry {
  /** Terilgan matn. Bo'sh — hali hech narsa terilmagan. */
  value: string;
  /** Rost bo'lsa keyingi raqam matnni ALMASHTIRADI, ustiga qo'shmaydi. */
  replace: boolean;
}

/** Maydonga sig'adigan raqamlar soni. */
export const MAX_DIGITS = 10;

const DIGIT = /^[0-9]$/;

/** Tayyor summa qo'yish: keyingi raqam uni almashtiradi. */
export function presetEntry(amount: number): CashEntry {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return { value: String(n), replace: true };
}

/** Bo'sh maydon. */
export function emptyEntry(): CashEntry {
  return { value: '', replace: false };
}

/** Maydondagi summa. Bo'sh maydon — nol. */
export function entryAmount(entry: CashEntry): number {
  const n = Number(entry.value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * Bitta tugma bosilishi.
 *
 * Eng muhim qoidasi — tayyor summa ustiga terilgan BIRINCHI raqam uni
 * almashtiradi. Ilgari u ustiga qo'shilardi: "Naqd" bosib 70 000 qo'yilgach,
 * 5 bosilsa 700 005 bo'lardi, u esa chek summasiga siqilib yana 70 000 ni
 * ko'rsatardi. Ya'ni ekranda hech narsa o'zgarmasdi va naqd tanlanganda
 * maydon umuman ishlamayotgandek tuyulardi.
 */
export function pressKey(entry: CashEntry, key: string): CashEntry {
  if (key === 'C') return emptyEntry();
  // O'chirish tayyor summani ham terilgan matnga aylantiradi: shundan keyin
  // kassir uni oxiridan bemalol tahrirlaydi.
  if (key === 'DEL') return { value: entry.value.slice(0, -1), replace: false };

  if (key === '000' || key === '00') {
    // Ko'p nol faqat terilayotgan summani kattalashtiradi. Bo'sh maydonda
    // ham, tayyor summa ustida ham uning ma'nosi yo'q.
    if (entry.replace || !entry.value) return entry;
    if (entry.value.length + key.length > MAX_DIGITS) return entry;
    return { value: entry.value + key, replace: false };
  }

  if (!DIGIT.test(key)) return entry;
  if (entry.replace) return { value: key, replace: false };
  if (entry.value.length >= MAX_DIGITS) return entry;
  // Boshida keraksiz nol yig'ilib qolmasin.
  return { value: entry.value === '0' ? key : entry.value + key, replace: false };
}
