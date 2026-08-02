import React, { useState } from 'react';
import { Shuffle, ArrowRight, Merge, AlertCircle } from 'lucide-react';
import { DBOrder } from '../types';
import { ALL_TABLE_DEFINITIONS } from '../constants';

interface TableMoveModalProps {
  show: boolean;
  currentTable: string;
  orders: DBOrder[];
  onMoveTable: (sourceTable: string, targetTable: string, isMerge: boolean) => void;
  onClose: () => void;
}

export const TableMoveModal: React.FC<TableMoveModalProps> = ({
  show,
  currentTable,
  orders,
  onMoveTable,
  onClose,
}) => {
  const [targetTable, setTargetTable] = useState<string>('');
  const [isMerge, setIsMerge] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const availableTables = ALL_TABLE_DEFINITIONS.filter(t => t.number !== currentTable);

  const handleSubmit = () => {
    setError(null);
    if (!targetTable) {
      setError("Mo'ljallangan stolni tanlang!");
      return;
    }

    const targetHasActiveOrder = orders.some(o => o.tableNumber === targetTable && o.status !== 'served');

    if (isMerge && !targetHasActiveOrder) {
      setError(`${targetTable}da faol buyurtma yo'q! Birlashtirish uchun stol band bo'lishi kerak.`);
      return;
    }

    onMoveTable(currentTable, targetTable, isMerge);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Stolni Ko'chirish / Birlashtirish</h3>
              <p className="text-[11px] text-slate-500 font-medium">{currentTable} buyurtmasini boshqa stolga o'tkazish</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 cursor-pointer">×</button>
        </div>

        {error && (
          <div className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsMerge(false)}
              className={`py-2 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isMerge ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Ko'chirish (Move)</span>
            </button>
            <button
              onClick={() => setIsMerge(true)}
              className={`py-2 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isMerge ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Merge className="w-3.5 h-3.5" />
              <span>Birlashtirish (Merge)</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700">Qaysi stolga o'tkazilsin?</label>
            <select
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
            >
              <option value="">Stolni tanlang...</option>
              {availableTables.map((t) => {
                const isBand = orders.some(o => o.tableNumber === t.number && o.status !== 'served');
                return (
                  <option key={t.number} value={t.number}>
                    {t.number} ({t.area}) {isBand ? '🔴 Band' : '🟢 Bo\'sh'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 font-semibold space-y-1">
            <p>ℹ️ {isMerge ? 'Ikki stoldagi taomlar va jami summa bitta stolga jamlanadi.' : 'Buyurtma to\'liqligicha yangi stolga ko\'chiriladi.'}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            {isMerge ? 'BIRLASHTIRISH' : 'KO\'CHIRISH'}
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            BEKOR QILISH
          </button>
        </div>
      </div>
    </div>
  );
};
