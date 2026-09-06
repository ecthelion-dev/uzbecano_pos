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
    ...(label ? { selectedSize: { label } } : {}),
  };
}
