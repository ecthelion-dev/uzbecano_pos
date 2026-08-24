import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { CartItem } from '../types';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNote: (productId: string, note: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = React.memo(({
  item,
  onUpdateQuantity,
  onUpdateNote,
}) => {
  return (
    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex-1 pr-2">
          <p className="font-semibold text-xs text-slate-900">{item.product.name}</p>
          <p className="text-[11px] text-orange-600 font-medium mt-0.5">
            {((Number(item.product.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()} so'm
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100/80 rounded-xl p-1 border border-slate-200 shadow-inner shrink-0">
          <button
            onClick={() => onUpdateQuantity(item.product.id, -1)}
            className="w-8 h-8 rounded-lg bg-white text-slate-700 hover:bg-rose-500 hover:text-white active:scale-90 flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>
          <span className="text-sm font-bold w-5 text-center text-slate-900">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.product.id, 1)}
            className="w-8 h-8 rounded-lg bg-white text-slate-700 hover:bg-emerald-500 hover:text-white active:scale-90 flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
      <input
        type="text"
        /* Sarlavhalardan ajralib turmasin: kichik va oddiy shrift. data-compact
           bu maydonni telefondagi 16px qoidasidan chiqaradi. */
        data-compact
        placeholder="Oshxonaga izoh (masalan: piyozsiz, achchiq...)"
        value={item.note || ''}
        onChange={(e) => onUpdateNote(item.product.id, e.target.value)}
        className="w-full text-[11px] font-normal text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all"
      />
    </div>
  );
});
