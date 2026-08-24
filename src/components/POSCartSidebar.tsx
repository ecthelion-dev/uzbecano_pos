import React from 'react';
import {
  ShoppingBag,
  Send,
  CheckCircle2,
  Printer,
  Shuffle,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { CartItem } from '../types';
import { CartItemRow } from './CartItemRow';
import { KitchenItemRow } from './KitchenItemRow';

interface POSCartSidebarProps {
  selectedTable: string;
  activeTableOrderItems: any[];
  cart: CartItem[];
  onRemoveKitchenItem: (index: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNote: (productId: string, note: string) => void;
  paymentMethod: 'naqd' | 'karta' | 'aralash';
  onSelectPaymentMethod: (pm: 'naqd' | 'karta' | 'aralash') => void;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  serviceFeePercent: number;
  serviceFee: number;
  grandTotal: number;
  onSendToKitchen: () => void;
  onCloseTable: () => void;
  onOpenReceiptPreview: () => void;
  onOpenTableMove: () => void;
}

export const POSCartSidebar: React.FC<POSCartSidebarProps> = ({
  selectedTable,
  activeTableOrderItems,
  cart,
  onRemoveKitchenItem,
  onUpdateQuantity,
  onUpdateNote,
  paymentMethod,
  onSelectPaymentMethod,
  subtotal,
  discountPercent,
  discountAmount,
  serviceFeePercent,
  serviceFee,
  grandTotal,
  onSendToKitchen,
  onCloseTable,
  onOpenReceiptPreview,
  onOpenTableMove,
}) => {
  return (
    <div className="w-[435px] shrink-0 bg-white text-slate-900 rounded-2xl p-5 flex flex-col shadow-md border border-slate-200 h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h2 className="font-bold text-sm text-slate-900">Buyurtma Kvitansiyasi</h2>
        </div>
        <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm">
          {selectedTable}
        </span>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3 pr-1.5">
        {activeTableOrderItems.length === 0 && cart.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-medium">Savat bo'sh</p>
            <p className="text-[10px] text-slate-400 mt-1">Menyudan taom tanlang</p>
          </div>
        ) : (
          <>
            {/* Already Sent Items */}
            {activeTableOrderItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-orange-600 tracking-wider uppercase">
                    Oshxonaga yuborilgan taomlar
                  </p>
                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                    Buyurtma keldi
                  </span>
                </div>
                {activeTableOrderItems.map((item: any, idx: number) => (
                  <KitchenItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    onRemove={onRemoveKitchenItem}
                  />
                ))}
              </div>
            )}

            {/* New Draft Items */}
            {cart.length > 0 && (
              <div className="space-y-2 pt-1">
                {activeTableOrderItems.length > 0 && (
                  <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase border-t border-slate-100 pt-2">
                    Yangi qo'shilayotgan taomlar
                  </p>
                )}
                {cart.map((item) => (
                  <CartItemRow
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onUpdateNote={onUpdateNote}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Calculations & Discounts */}
      <div className="pt-3 border-t border-slate-200 space-y-2 shrink-0">
        {/* Payment Method Selector */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">To'lov Turi:</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'naqd', label: 'Naqd', icon: <Banknote className="w-4 h-4" /> },
              { id: 'karta', label: 'Karta', icon: <CreditCard className="w-4 h-4" /> },
              { id: 'aralash', label: 'Aralash', icon: <Shuffle className="w-4 h-4" /> },
            ].map((pm) => (
              <button
                key={pm.id}
                onClick={() => onSelectPaymentMethod(pm.id as any)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  paymentMethod === pm.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {pm.icon}
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between text-xs text-slate-500 font-medium pt-1">
          <span>Jami taomlar:</span>
          <span className="text-slate-900 font-medium">{subtotal.toLocaleString()} so'm</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 font-semibold">
            <span>Chegirma ({discountPercent}%):</span>
            <span>-{discountAmount.toLocaleString()} so'm</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Xizmat haqi ({serviceFeePercent}%):</span>
          <span className="text-slate-900 font-medium">{serviceFee.toLocaleString()} so'm</span>
        </div>
        <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
          <span>JAMI:</span>
          <span className="text-[#0F172A] text-lg">{grandTotal.toLocaleString()} so'm</span>
        </div>

        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSendToKitchen()}
              disabled={cart.length === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold p-2 rounded-2xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex flex-col items-center justify-center text-center gap-1 cursor-pointer h-16"
            >
              <Send className="w-4 h-4" />
              <span>BUYURTMANI TASDIQLASH</span>
            </button>

            <button
              onClick={() => onCloseTable()}
              disabled={activeTableOrderItems.length === 0 && cart.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold p-2 rounded-2xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex flex-col items-center justify-center text-center gap-1 cursor-pointer h-16"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>TO'LOV VA YOPISH</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onOpenReceiptPreview}
              disabled={activeTableOrderItems.length === 0 && cart.length === 0}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" /> CHEK CHIQARISH
            </button>
            <button
              onClick={onOpenTableMove}
              disabled={activeTableOrderItems.length === 0}
              className="bg-orange-50 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed text-orange-700 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-orange-200 transition-colors cursor-pointer"
            >
              <Shuffle className="w-4 h-4 text-orange-600" /> KO'CHIRISH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
