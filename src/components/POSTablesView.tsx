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

type StatusFilter = 'all' | 'bosh' | 'band' | 'bron';

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
  /*
    Holat filtri maydonni ham kamaytiradi: kassa soragida "band stol
    qayerda?" — o'sha savolga javob bir bosishda topiladi. Filtr zone
    bilan qo'shiladi, ya'ni har ikkalasi ham bir vaqtda qo'llaniladi.
  */
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');

  const statusCounts = React.useMemo(() => {
    const counts = { all: 0, bosh: 0, band: 0, bron: 0 };
    for (const tb of filteredTables) {
      counts.all += 1;
      counts[tb.status] += 1;
    }
    return counts;
  }, [filteredTables]);

  const visibleTables = React.useMemo(
    () => (statusFilter === 'all' ? filteredTables : filteredTables.filter(tb => tb.status === statusFilter)),
    [filteredTables, statusFilter]
  );

  const FILTERS: { id: StatusFilter; label: string; dot: string }[] = [
    { id: 'all', label: t('table.filterAll'), dot: 'bg-slate-400' },
    { id: 'bosh', label: t('table.statFree'), dot: 'bg-emerald-500' },
    { id: 'band', label: t('table.statBusy'), dot: 'bg-orange-500' },
    { id: 'bron', label: t('table.statReserved'), dot: 'bg-brand-500' },
  ];

  const STATS = [
    { label: t('table.statTotal'), value: statusCounts.all, dot: 'bg-slate-400' },
    { label: t('table.statFree'), value: statusCounts.bosh, dot: 'bg-emerald-500' },
    { label: t('table.statBusy'), value: statusCounts.band, dot: 'bg-orange-500' },
    { label: t('table.statReserved'), value: statusCounts.bron, dot: 'bg-brand-500' },
  ];

  return (
    <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-y-auto pr-1 min-h-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-2">
      {/* Sarlavha + bron tugmasi */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
              <Grid className="w-5 h-5" />
            </span>
            {t('table.layout')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 sm:ml-[2.75rem]">{t('table.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onOpenReservationModal}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{t('table.reservation')}</span>
        </button>
      </div>

      {/*
        Ikki filtr (holat va zona) alohida qatorlarda turganida ular
        chalkashdi: ikkalasida ham bir xil "Barchasi" va bir xil hisob
        ko'rinardi, kassa esa bitta "Barchasi" qaysi filtrga tegishli
        bo'lganini ajratolmaydi. Shu sabab bitta qatorga birlashtirildi
        va ajratuvchi chiziq qo'yildi.
      */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            aria-pressed={statusFilter === f.id}
            className={`px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
              statusFilter === f.id
                ? 'bg-brand-500 border-brand-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === f.id ? 'bg-white' : f.dot}`} />
            {f.label}
            <span className={`text-[11px] font-bold tabular-nums ${statusFilter === f.id ? 'text-white/80' : 'text-slate-400'}`}>
              {statusCounts[f.id]}
            </span>
          </button>
        ))}

        <span className="w-px h-6 bg-slate-200 shrink-0" aria-hidden="true" />

        {areas.map((area) => {
          const areaCount = tables.filter((tb) => area === allAreasLabel || tb.area === area).length;
          const occupiedCount = tables.filter(
            (tb) => (area === allAreasLabel || tb.area === area) && tb.status === 'band'
          ).length;
          return (
            <button
              key={area}
              onClick={() => onSelectArea(area)}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-semibold text-xs transition-all flex items-center gap-1.5 sm:gap-2 border whitespace-nowrap cursor-pointer ${
                activeArea === area
                  ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                  : 'bg-transparent text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              <span>{area === allAreasLabel ? t('table.allAreas') : area}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                  activeArea === area ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
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

      {/* Statistika qatori */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-2xl px-3.5 sm:px-4 py-3 flex items-center gap-3 shadow-xs"
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">{s.label}</span>
            <span className="ml-auto text-lg sm:text-xl font-bold text-slate-900 tabular-nums tracking-tight">
              {s.value}
            </span>
          </div>
        ))}
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
      ) : visibleTables.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-500">{t('table.none')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {visibleTables.map((tbl) => (
            <TableCard key={tbl.id} table={tbl} onSelect={onSelectTable} />
          ))}
        </div>
      )}
    </div>
  );
};
