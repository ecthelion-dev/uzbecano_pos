import React from 'react';
import { UtensilsCrossed, Printer } from 'lucide-react';
import { KitchenSlipData } from '../types';

interface KitchenSlipModalProps {
  data: KitchenSlipData | null;
  onClose: () => void;
}

export const KitchenSlipModal: React.FC<KitchenSlipModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-orange-500" /> Oshxona cheki (Dual Print)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">×</button>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 font-mono text-sm text-slate-900 space-y-3">
          <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
            <h4 className="font-black text-base tracking-wider uppercase text-slate-900">*** OSHXONA BUYURTMASI ***</h4>
            <p className="text-xs text-slate-600 font-bold">{data.tableNumber} • {data.time}</p>
            {data.waiterName && (
              <p className="text-xs text-slate-700 font-semibold">Offitsiant: {data.waiterName}</p>
            )}
          </div>

          <div className="space-y-2 border-b border-dashed border-slate-400 pb-3">
            {data.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-200/60 pb-1 last:border-b-0">
                <div>
                  <p className="font-extrabold text-sm text-slate-900">{item.name}</p>
                  {item.note && <p className="text-xs font-bold text-amber-900">✍️ Izoh: {item.note}</p>}
                </div>
                <span className="font-black text-base text-slate-900 bg-orange-100 text-orange-800 px-2 py-0.5 rounded-lg">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => {
              window.print();
              onClose();
            }}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> CHOP ETISH & YOPISH
          </button>
        </div>
      </div>
    </div>
  );
};
