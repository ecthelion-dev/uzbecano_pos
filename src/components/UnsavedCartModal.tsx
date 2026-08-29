import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { CartItem } from '../types';

interface UnsavedCartModalProps {
  show: boolean;
  tableNumber: string;
  cart: CartItem[];
  subtotal: number;
  onConfirm: () => void;
  onClose: () => void;
}

export const UnsavedCartModal: React.FC<UnsavedCartModalProps> = ({
  show,
  tableNumber,
  cart,
  subtotal,
  onConfirm,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600 shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                Yuborilmagan taomlar bor!
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Stol: <span className="font-semibold text-slate-700">{tableNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Savatchada oshxonaga yuborilmagan taomlar mavjud. Ular avtomatik tarzda oshxonaga yuborilib, to'lov qilinadi va stol yopilsinmi?
        </p>

        {/* Cart items preview */}
        {cart.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-44 overflow-y-auto divide-y divide-slate-200/60 space-y-1.5">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-800 truncate block">
                    {item.product.name}
                  </span>
                  {(item.selectedVariant || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                    <span className="text-[11px] text-slate-400 block">
                      {[item.selectedVariant?.name, ...(item.selectedAddons || []).map(a => a.name)].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-medium text-slate-600">{item.quantity} x </span>
                  <span className="font-bold text-slate-900">
                    {((Number(item.product.price) + (item.selectedVariant?.priceModifier || 0) + (item.selectedAddons || []).reduce((s, a) => s + (a.price || 0), 0)) * item.quantity).toLocaleString()} so'm
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center text-xs font-bold text-slate-900 pt-2 border-t border-slate-300/80 mt-1">
              <span>Savat summasi:</span>
              <span className="text-orange-600 font-extrabold">{subtotal.toLocaleString()} so'm</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer active:scale-95 text-center"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            className="flex-[1.5] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-1.5 text-center"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Tasdiqlash va Yopish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
