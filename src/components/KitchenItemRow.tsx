import React from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';

interface KitchenItemRowProps {
  item: any;
  index: number;
  onRemove: (index: number) => void;
}

export const KitchenItemRow: React.FC<KitchenItemRowProps> = React.memo(({
  item,
  index,
  onRemove,
}) => {
  const t = useT();
  const price = Number(item.price) || 0;
  const qty = Number(item.quantity) || 1;
  const total = price * qty;

  return (
    <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-200/70 space-y-1">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-2">
          <p className="font-bold text-xs text-slate-900">{item.name}</p>
          <p className="text-[10px] text-slate-500 font-medium">
            {qty} ta x {price.toLocaleString()} so'm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">
            {total.toLocaleString()} so'm
          </span>
          <button
            onClick={() => onRemove(index)}
            title={t('kitchen.cancelNeedsPin')}
            className="text-rose-400 hover:text-rose-600 hover:bg-rose-100 p-1 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {item.note && (
        <p className="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300/60 px-2 py-0.5 rounded-md inline-block">
          <PenLine className="w-3 h-3 inline mr-0.5" />
          {item.note}
        </p>
      )}
    </div>
  );
});
