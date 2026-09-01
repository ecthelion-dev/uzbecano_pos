import React from 'react';
import { PenLine } from 'lucide-react';
import { KitchenSlipData } from '../types';

/**
 * Oshxona kvitansiyasining qog'ozdagi ko'rinishi.
 *
 * Ilgari bu markup modal ichida turardi va kassir "Chop etish" tugmasini
 * bosishi kerak edi. Endi buyurtma tasdiqlanishi bilan chek o'zi ketadi,
 * shuning uchun blok ekranda ko'rinmaydi — u faqat brauzer orqali chop
 * etish yo'lida (ESC/POS ishlamaganda) qog'ozga tushadi.
 *
 * `hidden print:block` juftligi mijoz cheki bilan bir xil: ekranda yo'q,
 * chop etishda bor. Qaysi biri qog'ozga tushishini `body.printing-kitchen`
 * klassi hal qiladi — index.css dagi qoidalarga qarang.
 */
export const KitchenPrintArea: React.FC<{ data: KitchenSlipData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div id="kitchen-print-area" className="hidden print:block font-mono text-slate-900">
      <div className="text-center border-b border-dashed border-slate-900 pb-2 space-y-1">
        <h4 className="font-bold text-base tracking-wider uppercase text-slate-900 print-text-dark">*** OSHXONA BUYURTMASI ***</h4>
        <p className="text-xs text-slate-800 print-text-dark font-semibold">{data.tableNumber} • {data.time}</p>
        {data.waiterName && (
          <p className="text-xs text-slate-800 print-text-dark font-medium">Offitsiant: {data.waiterName}</p>
        )}
      </div>

      <div className="space-y-2 border-b border-dashed border-slate-900 py-2">
        {data.items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-200/80 pb-1 last:border-b-0">
            <div className="min-w-0 pr-2">
              <p className="font-bold text-sm text-slate-900 print-text-dark">{item.name}</p>
              {item.note && (
                <p className="text-xs font-semibold text-amber-950 print-text-dark"><PenLine className="w-3 h-3 inline mr-0.5" />Izoh: {item.note}</p>
              )}
            </div>
            <span className="font-bold text-base text-slate-900 print-text-dark whitespace-nowrap">x{item.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
