import React from 'react';
import { Grid, Calendar } from 'lucide-react';
import { TableCard, type TableItemData } from './TableCard';

export interface POSTablesViewProps {
  t: (key: any, options?: any) => string;
  tables: TableItemData[];
  filteredTables: TableItemData[];
  areas: string[];
  activeArea: string;
  allAreasLabel?: string;
  onSelectArea: (area: string) => void;
  onSelectTable: (tableNumber: string) => void;
  onOpenReservationModal: () => void;
}

export const POSTablesView: React.FC<POSTablesViewProps> = ({
  t,
  tables,
  filteredTables,
  areas,
  activeArea,
  allAreasLabel = 'Barchasi',
  onSelectArea,
  onSelectTable,
  onOpenReservationModal,
}) => {
  return (
    <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 overflow-y-auto pr-1 min-h-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-2">
      {/* Top Bar for Tables */}
      <div className="flex items-center justify-between bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 shadow-xs flex-wrap sm:flex-nowrap gap-2">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" /> {t('table.layout')}
        </h2>
        <div className="w-full sm:w-auto flex items-center justify-between gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-medium">
          <span className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 bg-emerald-50 px-2 sm:px-3 py-1 rounded-lg text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> {t('table.free')}
          </span>
          <span className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 bg-orange-50 px-2 sm:px-3 py-1 rounded-lg text-orange-700 border border-orange-200 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span> {t('table.busy')}
          </span>
          <span className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 bg-purple-50 px-2 sm:px-3 py-1 rounded-lg text-purple-700 border border-purple-200 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span> {t('table.reserved')}
          </span>
          <button
            type="button"
            onClick={onOpenReservationModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{t('table.reservation')}</span>
          </button>
        </div>
      </div>

      {/* Area Zone Filters */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
        {areas.map((area) => {
          const areaCount = tables.filter((tb) => area === allAreasLabel || tb.area === area).length;
          const occupiedCount = tables.filter(
            (tb) => (area === allAreasLabel || tb.area === area) && tb.status === 'band'
          ).length;
          return (
            <button
              key={area}
              onClick={() => onSelectArea(area)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 sm:gap-2 border whitespace-nowrap shadow-2xs cursor-pointer ${
                activeArea === area
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{area === allAreasLabel ? t('table.allAreas') : area}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeArea === area ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {areaCount}
              </span>
              {occupiedCount > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-orange-500"
                  title={t('table.occupiedCount', { n: occupiedCount })}
                />
              )}
            </button>
          );
        })}
      </div>

      {tables.length === 0 ? (
        /* Tables come from the cafe's own floor plan now, so an empty one
           is a real state and needs to say what to do about it. */
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">{t('table.none')}</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Admin panelga kiring va &quot;Stollar&quot; bo&apos;limidan kafengizdagi stollarni
            qo&apos;shing. Kassa ekrani va QR kodlar shu ro&apos;yxatdan oladi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {filteredTables.map((tbl) => (
            <TableCard key={tbl.id} table={tbl} onSelect={onSelectTable} />
          ))}
        </div>
      )}
    </div>
  );
};
