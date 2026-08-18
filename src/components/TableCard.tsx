import React from 'react';

export interface TableItemData {
  id: string;
  number: string;
  area: string;
  status: 'band' | 'bosh';
  total: number;
}

interface TableCardProps {
  table: TableItemData;
  onSelect: (tableNumber: string) => void;
}

export const TableCard: React.FC<TableCardProps> = React.memo(({
  table,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(table.number)}
      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer group active:scale-98 ${
        table.status === 'band'
          ? 'bg-[#1E2021] border-[#2A2D2F] text-white hover:border-orange-500'
          : 'bg-white border-slate-200 text-slate-800 hover:border-orange-400'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className={`font-bold text-base tracking-tight ${table.status === 'band' ? 'text-white' : 'text-slate-900'}`}>
          {table.number}
        </span>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider ${
            table.status === 'band'
              ? 'bg-orange-500 text-white'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {table.status === 'band' ? 'BAND' : 'BOSH'}
        </span>
      </div>

      {table.status === 'band' ? (
        <div className="bg-[#2A2D2F] p-2 rounded-xl border border-[#3A3E41] flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">Jami:</span>
          <span className="text-xs text-white font-bold">{table.total.toLocaleString()} so'm</span>
        </div>
      ) : (
        <div className="py-0.5">
          <p className="text-[10px] text-slate-400 font-medium">{table.area}</p>
        </div>
      )}
    </div>
  );
});
