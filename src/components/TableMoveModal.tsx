import React, { useState } from 'react';
import { Shuffle, ArrowRight, Merge, AlertCircle, X } from 'lucide-react';
import { DBOrder } from '../types';
import { useT } from '../lib/i18n/LanguageProvider';

interface TableMoveModalProps {
  show: boolean;
  currentTable: string;
  /** The cafe's own floor plan, passed in rather than compiled in. */
  tableDefs: { number: string; area: string }[];
  orders: DBOrder[];
  onMoveTable: (sourceTable: string, targetTable: string, isMerge: boolean) => void;
  onClose: () => void;
}

export const TableMoveModal: React.FC<TableMoveModalProps> = ({
  show,
  currentTable,
  tableDefs,
  orders,
  onMoveTable,
  onClose,
}) => {
  const t = useT();
  const [targetTable, setTargetTable] = useState<string>('');
  const [isMerge, setIsMerge] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const availableTables = tableDefs.filter(t => t.number !== currentTable);

  const handleSubmit = () => {
    setError(null);
    if (!targetTable) {
      setError(t('table.pickTarget'));
      return;
    }

    const targetHasActiveOrder = orders.some(o => o.tableNumber === targetTable && o.status !== 'served');

    if (isMerge && !targetHasActiveOrder) {
      setError(t('table.mergeNeedsBusy', { table: targetTable }));
      return;
    }

    onMoveTable(currentTable, targetTable, isMerge);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-8 max-w-xl w-full shadow-2xl flex flex-col gap-4 sm:gap-6 border border-slate-200 max-h-[92dvh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="bg-orange-100 p-2 sm:p-3 rounded-2xl text-orange-600 shadow-sm shrink-0">
              <Shuffle className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-2xl text-slate-900 tracking-tight">{t('table.moveTitle')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{currentTable} buyurtmasini boshqa stolga o'tkazish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {error && (
          <div className="text-rose-700 text-sm font-semibold bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 sm:space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsMerge(false)}
              className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isMerge ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>{t('table.move')}</span>
            </button>
            <button
              onClick={() => setIsMerge(true)}
              className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isMerge ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Merge className="w-4 h-4" />
              <span>{t('table.merge')}</span>
            </button>
          </div>

          {/* Table Select */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t('table.moveTarget')}</label>
            <select
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
            >
              <option value="">{t('table.selectTable')}</option>
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
          <div className="bg-amber-50/80 border-2 border-amber-200 p-4 rounded-2xl text-xs text-amber-950 font-medium space-y-1">
            <p>ℹ️ {isMerge ? t('table.mergeHint') : t('table.moveHint')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base shadow-lg shadow-orange-500/20 transition-all cursor-pointer active:scale-98"
          >
            {isMerge ? 'BIRLASHTIRISH' : 'KO\'CHIRISH'}
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base transition-colors cursor-pointer active:scale-95"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
