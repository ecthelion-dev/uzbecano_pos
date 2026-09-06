/**
 * Zal ko'rinishidagi bitta stolning holati.
 *
 * Stol uch xil sababdan band bo'lishi mumkin va uchalasi bir xil emas:
 *
 *   1. Serverda ochiq chek bor — buyurtma yuborilgan, har qanday xodim
 *      unga taom qo'sha oladi.
 *   2. Shu qurilmada savat ochiq — kassir yozayotgan buyurtma.
 *   3. BOSHQA xodim savat ochgan — bu stolga yozib bo'lmaydi.
 *
 * Qulf QURILMAGA emas, XODIMGA bog'langan. Ilgari qurilmaga bog'langan edi
 * va buyurtmani boshlagan xodim o'z telefonidan o'sha stolni ochib
 * bo'lmasdi: bitta odam ikkita qurilmada ikki xil odam bo'lib ko'rinardi.
 *
 * Boshqa xodimga esa qulf yopiq qoladi. Aks holda ikkalasidan ham buyurtma
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
  /** Xodim id si. Eski kassa yozgan belgida bo'lmasligi mumkin. */
  holderId?: string;
  deviceId: string;
  total?: number;
}

export interface CurrentUser {
  id?: string;
  name?: string;
}

/**
 * Belgi SHU xodimnikimi.
 *
 * Id bo'yicha solishtiriladi. Eski kassa yozgan belgida id bo'lmaydi va
 * kassa ham uni bilmasligi mumkin — o'shanda ism bo'yicha solishtiriladi.
 * Ism kamroq ishonchli, lekin qulfni butunlay ochib qo'yishdan yaxshiroq:
 * eng yomon holatda bitta xodim o'z stoliga kira olmaydi, ikkita xodim
 * bitta stolga yozib yubormaydi.
 */
function samePerson(hold: TableHold, me: CurrentUser): boolean {
  const holdId = (hold.holderId || '').trim();
  const myId = (me?.id || '').trim();
  if (holdId && myId) return holdId === myId;

  const holdName = (hold.holder || '').trim().toLocaleLowerCase();
  const myName = (me?.name || '').trim().toLocaleLowerCase();
  return !!holdName && holdName === myName;
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
  /** Hozir kirgan xodim — qulf shunga qarab ochiladi. */
  user: CurrentUser;
}): TableState {
  const { tableNumber, openOrderTotal, draftTotal, holds, deviceId, user } = input;

  // Shu qurilmaning o'z belgisi hisobga olinmaydi: savat allaqachon shu
  // yerda va uni ikkinchi marta sanashning ma'nosi yo'q.
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
    /*
     * Qulf faqat BOSHQA xodimning savati uchun.
     *
     * Ochiq chek yoki shu qurilmadagi savat bo'lsa ham qulf yo'q:
     * birinchisida buyurtma allaqachon serverda, ikkinchisida kassir o'z
     * ishini davom ettiradi.
     */
    heldBy:
      elsewhere && !hasOpenOrder && !hasOwnDraft && !samePerson(elsewhere, user)
        ? elsewhere.holder || ''
        : undefined,
  };
}
