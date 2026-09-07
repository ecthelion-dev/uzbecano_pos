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
  /**
   * Kassadagi rol. "manager" — kafe admini, "admin" — kassir.
   *
   * Ular qulfdan o'tadi: kassir istalgan stolni yopishi va tuzatishi kerak,
   * aks holda oddiy ish to'xtab qolardi.
   */
  role?: string;
}

/** Buyurtma egasi — serverda saqlanadi. */
export interface OpenOrder {
  total: number;
  waiterId?: string;
  waiterName?: string;
}

const ELEVATED_ROLES = ['manager', 'admin', 'cafe_admin', 'platform_admin', 'cashier'];

function isElevated(user: CurrentUser): boolean {
  return ELEVATED_ROLES.includes(String(user?.role || '').trim().toLocaleLowerCase());
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
function samePerson(
  owner: { id?: string; name?: string },
  me: CurrentUser,
): boolean {
  const ownerId = (owner?.id || '').trim();
  const myId = (me?.id || '').trim();
  if (ownerId && myId) return ownerId === myId;

  const ownerName = (owner?.name || '').trim().toLocaleLowerCase();
  const myName = (me?.name || '').trim().toLocaleLowerCase();
  return !!ownerName && ownerName === myName;
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
  /** Serverdagi ochiq chek. Chek bo'lmasa — undefined. */
  openOrder?: OpenOrder;
  /** Shu qurilmadagi savat summasi (0 — savat bo'sh). */
  draftTotal: number;
  holds: TableHold[];
  deviceId: string;
  /** Hozir kirgan xodim — qulf shunga qarab ochiladi. */
  user: CurrentUser;
}): TableState {
  const { tableNumber, openOrder, draftTotal, holds, deviceId, user } = input;

  // Shu qurilmaning o'z belgisi hisobga olinmaydi: savat allaqachon shu
  // yerda va uni ikkinchi marta sanashning ma'nosi yo'q.
  const elsewhere = (holds || []).find(
    (h) => h && h.deviceId !== deviceId && sameTable(h.tableNumber, tableNumber),
  );

  const hasOwnDraft = draftTotal > 0;
  const hasOpenOrder = !!openOrder;

  const total = hasOpenOrder
    ? openOrder.total
    : hasOwnDraft
      ? draftTotal
      // Boshqa qurilma hisoblab yuborgan summa. Bu yerda taxmin
      // qilinmaydi — savat o'sha qurilmada.
      : Math.max(0, Math.round(Number(elsewhere?.total) || 0));

  return {
    occupied: hasOpenOrder || hasOwnDraft || !!elsewhere,
    total,
    heldBy: lockedBy({ openOrder, elsewhere, hasOwnDraft, user }),
  };
}

/**
 * Stol kimga qulflangan.
 *
 * Stol buyurtmani boshlagan xodimniki — u yuborilgandan keyin ham. Ilgari
 * qulf faqat yuborilmagan savatga qo'yilardi va chek serverga tushishi bilan
 * ochilib ketardi: shundan keyin istalgan xodim begona stolga taom qo'sha
 * olardi va chekda kim xizmat qilgani noaniq bo'lib qolardi.
 *
 * Uchta holatda qulf yo'q:
 *
 *   1. Shu qurilmada savat ochiq — kassir o'z ishini davom ettiradi.
 *   2. Xodim rahbar yoki kassir — u istalgan stolni yopishi va tuzatishi
 *      kerak, aks holda oddiy ish to'xtab qolardi.
 *   3. Buyurtma egasi noma'lum — eski cheklar va QR mehmoni buyurtmasi.
 *      Ularni hech kim olmagan, ya'ni himoya qiladigan narsa yo'q.
 */
function lockedBy(input: {
  openOrder?: OpenOrder;
  elsewhere?: TableHold;
  hasOwnDraft: boolean;
  user: CurrentUser;
}): string | undefined {
  const { openOrder, elsewhere, hasOwnDraft, user } = input;

  if (hasOwnDraft || isElevated(user)) return undefined;

  // Serverdagi chek birinchi: u savat belgisidan ishonchliroq va uzoq
  // yashaydi.
  if (openOrder) {
    const owner = { id: openOrder.waiterId, name: openOrder.waiterName };
    if (!owner.id && !owner.name) return undefined;
    return samePerson(owner, user) ? undefined : openOrder.waiterName || '';
  }

  if (!elsewhere) return undefined;
  const holder = { id: elsewhere.holderId, name: elsewhere.holder };
  return samePerson(holder, user) ? undefined : elsewhere.holder || '';
}
