import React from 'react';
import { Bell } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';

export interface TableItemData {
  id: string;
  number: string;
  area: string;
  status: 'band' | 'bosh';
  total: number;
  hasWaiterCall?: boolean;
}

interface TableCardProps {
  table: TableItemData;
  onSelect: (tableNumber: string) => void;
}

export const TableCard: React.FC<TableCardProps> = React.memo(({
  table,
  onSelect,
}) => {
  const t = useT();
  return (
    <div
      onClick={() => onSelect(table.number)}
      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer group active:scale-98 relative ${
        table.hasWaiterCall
          ? table.status === 'band'
            ? 'bg-[#1E2021] text-white border-amber-500 ring-2 ring-amber-400 animate-pulse shadow-lg shadow-amber-500/20'
            : 'bg-white text-slate-800 border-amber-500 ring-2 ring-amber-400 animate-pulse shadow-lg shadow-amber-500/20'
          : table.status === 'band'
          ? 'bg-[#1E2021] border-[#2A2D2F] text-white hover:border-orange-500'
          : 'bg-white border-slate-200 text-slate-800 hover:border-orange-400'
      }`}
    >
      <div className="flex justify-between items-center gap-1 min-w-0">
        <span className={`font-bold text-xs sm:text-sm md:text-base tracking-tight truncate whitespace-nowrap ${table.status === 'band' ? 'text-white' : 'text-slate-900'}`}>
          {table.number}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {table.hasWaiterCall && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce" title={t('table.waiterCall')}>
              <Bell className="w-3 h-3 fill-white" />
            </span>
          )}
          {/*
            Tor va tracking'siz: yorliq "shrink-0", ya'ni joy yetmasa stol
            NOMI qisqaradi. "СВОБОДЕН" "BOSH" dan uzun va 1280px ekranda
            "Hovli 1" ni "Ho..." ga aylantirib qo'yardi — o'lchab ko'rilgan:
            nomga 44px kerak, 37px qolardi. Tracking va ichki bo'shliqni
            olib tashlash o'sha 7px ni qaytaradi.
          */}
          <span
            className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
              table.status === 'band'
                ? 'bg-orange-500 text-white'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {table.status === 'band' ? t('table.busy') : t('table.free')}
          </span>
        </div>
      </div>

      {table.status === 'band' ? (
        <div className="bg-[#2A2D2F] p-1.5 sm:p-2 rounded-xl border border-[#3A3E41] flex items-center justify-between gap-1 min-w-0">
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium shrink-0">{t('common.total')}</span>
          {/* Valyuta nomi ataylab yozilmaydi: kartochka tor va "so'm" summani
              qirqib, "15,000 s..." qilib qo'yardi — ya'ni birlik uchun eng
              kerakli narsa, raqamning o'zi yo'qolardi. */}
          <span className="text-[11px] sm:text-xs text-white font-bold truncate whitespace-nowrap">{table.total.toLocaleString()}</span>
        </div>
      ) : (
        <div className="py-0.5 min-w-0">
          <p className="text-[10px] text-slate-400 font-medium truncate whitespace-nowrap">{table.area}</p>
        </div>
      )}
    </div>
  );
});
