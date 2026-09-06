/**
 * Zal ko'rinishidagi bitta stolning holati.
 *
 * Stol uch xil sababdan band bo'lishi mumkin va uchalasi bir xil emas:
 *
 *   1. Serverda ochiq chek bor — buyurtma yuborilgan, har qanday xodim
 *      unga taom qo'sha oladi.
 *   2. SHU qurilmada savat ochiq — kassir yozayotgan buyurtma.
 *   3. BOSHQA qurilmada savat ochiq — bu stolga bu yerdan yozib bo'lmaydi.
 *
 * Uchinchisi qulflanadi. Aks holda ikkala qurilmadan ham buyurtma
 * yuborilganda stolda IKKITA ochiq chek paydo bo'ladi: kassa ularning
 * bittasini ko'rsatadi, ikkinchisi esa hech qachon yopilmay, ochiq stollar
 * orasida qolib ketadi.
 *
 * Ochiq chek borligi qulfni BEKOR QILADI: buyurtma allaqachon serverda,
 * ya'ni unga qo'shilgan taom yo'qolmaydi va ikkinchi chek yaratilmaydi.
 */

export interface TableHold {
  tableNumber: string;
  holder: string;
  deviceId: string;
  total?: number;
}

export interface TableState {
  occupied: boolean;
  total: number;
  /** Boshqa qurilma yig'ayotgan bo'lsa — kim. Shunda stol ochilmaydi. */
  heldBy?: string;
}

const sameTable = (a: string, b: string) =>
  (a || '').trim().toLocaleLowerCase() === (b || '').trim().toLocaleLowerCase();

export function tableState(input: {
  tableNumber: string;
  /** Serverdagi ochiq chek summasi. Chek bo'lmasa — undefined. */
  openOrderTotal?: number;
  /** Shu qurilmadagi savat summasi (0 — savat bo'sh). */
  draftTotal: number;
  holds: TableHold[];
  deviceId: string;
}): TableState {
  const { tableNumber, openOrderTotal, draftTotal, holds, deviceId } = input;

  const elsewhere = (holds || []).find(
    (h) => h && h.deviceId !== deviceId && sameTable(h.tableNumber, tableNumber),
  );

  const hasOwnDraft = draftTotal > 0;
  const hasOpenOrder = typeof openOrderTotal === 'number';

  const total = hasOpenOrder
    ? openOrderTotal
    : hasOwnDraft
      ? draftTotal
      // Boshqa qurilma hisoblab yuborgan summa. Bu yerda taxmin
      // qilinmaydi — savat o'sha qurilmada.
      : Math.max(0, Math.round(Number(elsewhere?.total) || 0));

  return {
    occupied: hasOpenOrder || hasOwnDraft || !!elsewhere,
    total,
    // Ochiq chek yoki o'z savati bo'lsa qulf yo'q: birinchisida buyurtma
    // allaqachon serverda, ikkinchisida kassir o'z ishini davom ettiradi.
    heldBy: elsewhere && !hasOpenOrder && !hasOwnDraft ? elsewhere.holder || '' : undefined,
  };
}
