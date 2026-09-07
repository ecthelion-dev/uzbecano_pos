import type { CartItem } from '../types';

/**
 * Serverga yuboriladigan buyurtma qatori.
 *
 * Narxni server O'ZI hisoblaydi: u `productId` bo'yicha bazadan taomni
 * topadi va `selectedSize` bo'yicha o'lcham narxini oladi. Bu yerdagi
 * `price` faqat oflayn rejimda kassaning o'z ekrani uchun — serverga
 * yetib borganda e'tiborga olinmaydi.
 *
 * Aynan shu sababli `selectedSize` ni YUBORISH shart. U tushib qolsa server
 * taomni asosiy narxda yozadi: kassir "Katta" tanlab 25 000 so'm olsa ham,
 * savdo 20 000 bo'lib qayd etiladi. Chek to'g'ri chiqadi, hisobot esa kam
 * ko'rsatadi — va bu xato hech qayerda ko'zga tashlanmaydi.
 */
export interface OutgoingOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  selectedSize?: { label: string };
  /** Saboy qator. Serverda saqlanadi va chekda qaytib chiqadi. */
  takeaway?: boolean;
}

/**
 * Tanlangan variantdan serverga yuboriladigan o'lcham.
 *
 * "Standart" QAYTARILMAYDI. Uni kassaning o'zi o'lchamlar ro'yxatining
 * boshiga qo'shadi, chunki kassir asosiy narxni ham tanlay olishi kerak —
 * lekin bazada bunday o'lcham yo'q. Yuborilsa server "bunday o'lcham
 * mavjud emas" deb BUTUN buyurtmani rad etadi, ya'ni kassir taomni
 * umuman yoza olmay qoladi.
 */
export function outgoingSize(
  variant?: { name: string; isBase?: boolean } | null,
): { selectedSize: { label: string } } | Record<string, never> {
  if (!variant || variant.isBase) return {};
  const label = String(variant.name || '').trim();
  return label ? { selectedSize: { label } } : {};
}

/** Savatdagi yangi qator — serverga yuboriladigan shaklda. */
export function cartLineToOrderItem(item: CartItem): OutgoingOrderItem {
  return {
    productId: item.product.id,
    name: item.product.name,
    price: Number(item.product.price) || 0,
    quantity: Number(item.quantity) || 1,
    note: item.note || '',
    ...(item.takeaway ? { takeaway: true } : {}),
    ...outgoingSize(item.selectedVariant),
  };
}

/**
 * Allaqachon yuborilgan qator — stolga yana taom qo'shilganda.
 *
 * Server PATCH da barcha qatorlarni qaytadan narxlaydi, shuning uchun
 * avvalgi qatorlarning o'lchami ham qayta yuborilishi kerak. U tushib
 * qolsa, stolga ikkinchi marta biror narsa qo'shilishi bilan avval
 * yozilgan "Katta" taomlar jimgina asosiy narxga tushib qolardi.
 */
export function sentItemToOrderItem(raw: any): OutgoingOrderItem {
  const label = String(raw?.selectedSize?.label ?? raw?.selectedSize ?? '').trim();
  return {
    productId: raw?.productId,
    name: raw?.name,
    price: Number(raw?.price) || 0,
    quantity: Number(raw?.quantity) || 1,
    note: raw?.note || raw?.notes || '',
    // Saboy belgisi qayta yuborilishi SHART: stolga ikkinchi marta taom
    // qo'shilganda server barcha qatorlarni qaytadan yozadi, va belgi
    // yuborilmasa avvalgi saboy qatorlar jimgina oddiy qatorga aylanardi.
    ...(raw?.takeaway === true ? { takeaway: true } : {}),
    ...(label ? { selectedSize: { label } } : {}),
  };
}

/**
 * Serverning buyurtma id sini o'zlashtirish.
 *
 * Kassa buyurtmani avval O'ZIDA yaratadi va unga tasodifiy id beradi —
 * internet yo'q bo'lsa ham stol ochilishi kerak. Server esa qabul qilganda
 * o'zining id sini beradi.
 *
 * Ilgari kassa o'sha mahalliy id bilan qolib ketardi va keyingi har bir
 * amalni — to'lov, taom qo'shish, yopish — server tanimaydigan manzilga
 * yuborardi. Loglarda bu `PATCH /api/orders/<uuid> -> 400` bo'lib ko'rinardi:
 * stol kassada yopilgandek ko'rinar, serverda esa ochiq va to'lanmagan
 * bo'lib qolaverardi.
 *
 * `idempotencyKey` mahalliy id bo'lib qoladi, ya'ni qayta yuborish baribir
 * ikkinchi buyurtma yaratmaydi.
 */
export async function adoptServerId(
  res: Response,
  target: { id: string; dailyNumber?: number },
): Promise<void> {
  try {
    const created = await res.clone().json();
    if (created?.id) target.id = String(created.id);
    if (Number(created?.dailyNumber) > 0) target.dailyNumber = Number(created.dailyNumber);
  } catch {
    // Javobni o'qib bo'lmadi — mahalliy id qoladi va sinxronizatsiya
    // navbati keyin to'g'rilaydi. Bu yerda xato tashlash stolni yopilmay
    // qoldirardi.
  }
}
