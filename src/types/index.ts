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
  tableNumber: string;
  total: number;
  status: string;
  waiterName?: string;
  items?: any;
  subtotal?: number;
  serviceFee?: number;
  closedAt?: string;
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
  tableNumber: string;
  waiterName: string;
  items: any[];
  time: string;
  timestamp?: string;
}

export interface CashTransaction {
  id: string;
  type: 'kirim' | 'chiqim';
  amount: number;
  note: string;
  createdAt: string;
  createdBy: string;
}
