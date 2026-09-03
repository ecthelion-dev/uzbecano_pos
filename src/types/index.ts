export interface ProductVariant {
  name: string;
  price: number;
}

export interface ProductAddon {
  name: string;
  price: number;
}

export interface DBProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  description?: string;
  isAvailable?: boolean;
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  sizes?: any;
}

export interface DBCategory {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  cafeId?: string;
}

export interface CartItem {
  product: DBProduct;
  quantity: number;
  note?: string;
  selectedVariant?: ProductVariant;
  selectedAddons?: ProductAddon[];
}

export interface DBOrder {
  id: string;
  /**
   * Chekdagi kunlik tartib raqami — serverdan keladi.
   *
   * Oflayn yaratilgan buyurtmada u serverga yetguncha bo'lmaydi; o'shanda
   * chekka id ning oxiri bosiladi. Kassa bu raqamni o'zi hisoblamaydi:
   * ikkinchi kassa qo'shilgan kuni raqamlar takrorlanib ketardi.
   */
  dailyNumber?: number | null;
  /**
   * Buyurtma qayerdan kelgani: `'pos'` — kassa yoki panel, `'qr'` — mijoz
   * o'z telefonidan yuborgan.
   *
   * Ixtiyoriy: eski serverda bu maydon yo'q, o'shanda kassa hech narsa chop
   * etmaydi. Taxmin qilinmaydi — bilinmagan buyurtmani oshxonaga yubormagan
   * ma'qul, aks holda kassir tasdiqlagan har bir buyurtma ikki marta chiqadi.
   */
  source?: string;
  tableNumber: string;
  total: number;
  status: string;
  waiterName?: string;
  items?: any;
  subtotal?: number;
  serviceFee?: number;
  closedAt?: string;
  /** To'lovni qabul qilgan xodim — serverda qayd etiladi, klientda emas. */
  closedBy?: string;
  createdAt?: string;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod?: 'naqd' | 'karta' | 'aralash';
  cashAmount?: number;
  cardAmount?: number;
  refunded?: boolean;
  refundReason?: string;
  refundedAt?: string;
  refundedBy?: string;
}

export interface DBWaiter {
  id: string;
  name: string;
  // Never persisted client-side — PIN is verified server-side only.
  pinCode?: string;
  role?: string;
}

export interface KitchenSlipData {
  /**
   * Kvitansiya qaysi buyurtmaga tegishli.
   *
   * Telefonda chop etib bo'lmaydi — kvitansiya chop etish navbatiga
   * yoziladi va navbat buyurtmaga havola bilan ishlaydi. Oflayn
   * yaratilgan buyurtmada id hali serverda yo'q, o'shanda navbatga
   * yozilmaydi ham.
   */
  orderId?: string;
  tableNumber: string;
  waiterName: string;
  items: any[];
  time: string;
  timestamp?: string;
  /** Kunlik tartib raqami — har kuni birdan boshlanadi. */
  slipNumber?: number;
}

export interface CashTransaction {
  id: string;
  type: 'kirim' | 'chiqim';
  amount: number;
  note: string;
  createdAt: string;
  createdBy: string;
}
