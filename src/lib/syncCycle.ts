import { canSync, decideFromStatus, removeProcessed } from './syncQueue';

/**
 * Oflayn navbatni bo'shatish — bir sikl.
 *
 * Bu kod uzoq vaqt `App.tsx` ichida, React komponentining uch yarim ming
 * qatori orasida yashadi va shuning uchun testga umuman yetib bo'lmasdi.
 * Natijasi 2026-09-16 da ko'rindi: uchta pul yo'qotadigan xato topildi va
 * uchalasi ham kodni qo'lda o'qib, pul yo'qolganidan KEYIN topildi.
 *
 * Endi u shu yerda va tashqi dunyo bilan faqat `SyncPorts` orqali
 * gaplashadi. Tarmoq ham, disk ham chetdan beriladi, ya'ni "tarmoq aynan
 * shu paytda uzildi" degan savolni test qo'ya oladi.
 */

/** Navbatdagi amal. `qid` — yozuvning barqaror nomi. */
export type QueuedItem = { queuedAt?: number; qid?: string } & (
  | { kind: 'create'; order: any }
  | { kind: 'patch'; orderId: string; body: any; label?: string; approvalToken?: string }
  | { kind: 'delete'; orderId: string; label?: string }
  | { kind: 'cash'; entry: any; label?: string; approvalToken?: string }
);

export interface SyncPorts {
  /** Navbatning JONLI holati — sikl davomida o'zgarishi mumkin. */
  readQueue(): QueuedItem[];
  readFailed(): QueuedItem[];
  /**
   * Navbat va rad etilganlar — BITTA tranzaksiyada. `failed` `null` bo'lsa
   * unga tegilmaydi. Yozib bo'lmasa `false`.
   */
  commit(queue: QueuedItem[], failed: QueuedItem[] | null): boolean;
  /** Amalni serverga yuboradi. Otilgan xato — tarmoq yiqilgani. */
  send(item: QueuedItem): Promise<Response>;
  /** Javob kafe muzlatilganini bildiradimi. */
  isFrozen(res: Response): Promise<boolean>;
  /** Rad etilgan amalni kassirga qanday atash. */
  label(item: QueuedItem): string;
}

export interface SyncOutcome {
  anySucceeded: boolean;
  rejectedLabels: string[];
  /** Diskka yozib bo'lmadi — navbat o'z holicha qoldi. */
  commitFailed: boolean;
}

/**
 * Amal qaysi chekka tegishli.
 *
 * Naqd yozuvi hech qanday chekni ushlab turmaydi — u buyurtma emas,
 * kassadan olingan pul.
 */
function orderIdOf(item: QueuedItem): string | undefined {
  if (item.kind === 'create') return item.order?.id;
  if (item.kind === 'cash') return undefined;
  return item.orderId;
}

/**
 * Siklni bir marta yurgizadi.
 *
 * `null` qaytsa — umuman urinilmadi (navbat bo'sh yoki sessiya yo'q).
 */
export async function runSyncCycle(
  ports: SyncPorts,
  token: string | null | undefined,
): Promise<SyncOutcome | null> {
  const queue = ports.readQueue();
  if (queue.length === 0) return null;

  /*
   * Sessiyasiz urinmaymiz. Kassa sessiyasi ilova yopilishi bilan o'chadi,
   * navbat esa diskda qoladi — ya'ni ilova qayta ochilgan, PIN esa hali
   * kiritilmagan payt bo'ladi. O'shanda yuborilgan so'rov faqat 401 oladi,
   * va 2026-09-10 da aynan shu to'rtta chekni yo'qotgan edi.
   */
  if (!canSync(token)) return null;

  /*
   * Yakunda navbatdan OLIB TASHLANADIGAN yozuvlar nomi. Qolgani o'z joyida
   * qolaveradi, ya'ni uni alohida ro'yxatga yig'ish shart emas — aynan
   * o'sha "qolganlar ro'yxati" navbat ustidan yozilganda oradagi yangi
   * buyurtmani yeb qo'yardi.
   */
  const processedIds = new Set<string>();
  const parked: QueuedItem[] = [];
  const blockedOrders = new Set<string>();
  const rejectedLabels: string[] = [];
  let anySucceeded = false;

  for (const item of queue) {
    const orderId = orderIdOf(item);
    /*
     * Shu chekning avvalgi amali o'tmagan bo'lsa, keyingisiga ham
     * urinmaymiz: serverda hali mavjud bo'lmagan chekka PATCH yuborish 404
     * beradi va uni chetga qo'yardi — ya'ni to'lov yo'qolardi.
     */
    if (orderId && blockedOrders.has(orderId)) continue;

    try {
      const res = await ports.send(item);

      if (res.ok) {
        anySucceeded = true;
        if (item.qid) processedIds.add(item.qid);
      } else if (await ports.isFrozen(res)) {
        // Kafe muzlatilgan: davom etish befoyda. Shu amaldan boshlab
        // hammasi navbatda qoladi — hech biri "ishlangan" deb
        // belgilanmagani uchun o'zi shunday bo'ladi.
        break;
      } else if (decideFromStatus(res.status) === 'retry') {
        if (orderId) blockedOrders.add(orderId);
      } else {
        /*
         * Server printsipial rad etdi. Qayta yuborish foydasiz, shuning
         * uchun yozuv navbatdan chiqadi — lekin O'CHIRILMAYDI: bu pul va
         * uni jimgina yo'qotib bo'lmaydi.
         */
        parked.push(item);
        rejectedLabels.push(ports.label(item));
        if (orderId) blockedOrders.add(orderId);
      }
    } catch {
      // Tarmoq yiqildi. So'rov serverga yetmagan ham, yetib javobi
      // yo'qolgan ham bo'lishi mumkin — ikkinchisi uchun har amalda
      // `idempotencyKey` bor, ya'ni takror yuborish nusxa yaratmaydi.
      if (orderId) blockedOrders.add(orderId);
    }
  }

  for (const item of parked) if (item.qid) processedIds.add(item.qid);

  /*
   * Navbat SHU YERDA qaytadan o'qiladi.
   *
   * Yuqoridagi tsikl har bir yozuv uchun tarmoqni sakkiz soniyagacha
   * kutadi: Wi-Fi o'lgan va navbatda beshta yozuv bor bo'lsa, bu yergacha
   * yarim daqiqa o'tadi. O'sha yarim daqiqada kassir urgan buyurtma tsikl
   * boshidagi nusxada YO'Q, ya'ni o'sha nusxani diskka yozish uni jimgina
   * o'chirib yuborardi — xatosiz, ogohlantirishsiz va rad etilganlarga ham
   * tushmasdan.
   */
  const nextQueue = removeProcessed(ports.readQueue(), processedIds);
  const nextFailed = parked.length > 0 ? [...ports.readFailed(), ...parked] : null;

  // Ikkalasi bitta tranzaksiyada: yozuv navbatdan chiqib, rad etilganlarga
  // tushmay qolishi mumkin bo'lgan oraliq umuman bo'lmasligi kerak.
  const saved = ports.commit(nextQueue, nextFailed);

  return { anySucceeded, rejectedLabels, commitFailed: !saved };
}
