import React, { useState } from 'react';
import { Shuffle, ArrowRight, Merge, AlertCircle, X } from 'lucide-react';
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
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl flex flex-col gap-6 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shadow-sm">
              <Shuffle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-900 tracking-tight">Stolni Ko'chirish / Birlashtirish</h3>
              <p className="text-sm text-slate-500 font-semibold mt-0.5">{currentTable} buyurtmasini boshqa stolga o'tkazish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="text-rose-700 text-sm font-bold bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsMerge(false)}
              className={`py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isMerge ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>Ko'chirish (Move)</span>
            </button>
            <button
              onClick={() => setIsMerge(true)}
              className={`py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isMerge ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Merge className="w-4 h-4" />
              <span>Birlashtirish (Merge)</span>
            </button>
          </div>

          {/* Table Select */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">Qaysi stolga o'tkazilsin?</label>
            <select
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
            >
              <option value="">Stolni tanlang...</option>
              {availableTables.map((t) => {
                const isBand = orders.some(o => o.tableNumber === t.number && o.status !== 'served');
                return (
                  <option key={t.number} value={t.number}>
                    {t.number} ({t.area}) {isBand ? '● Band' : '○ Bo\'sh'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Info Notice */}
          <div className="bg-amber-50/80 border-2 border-amber-200 p-4 rounded-2xl text-xs text-amber-950 font-semibold space-y-1">
            <p>ℹ️ {isMerge ? 'Ikki stoldagi taomlar va jami summa bitta stolga jamlanadi.' : 'Buyurtma to\'liqligicha yangi stolga ko\'chiriladi.'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            {isMerge ? 'BIRLASHTIRISH' : 'KO\'CHIRISH'}
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl text-base transition-colors cursor-pointer"
          >
            BEKOR QILISH
          </button>
        </div>
      </div>
    </div>
  );
};
