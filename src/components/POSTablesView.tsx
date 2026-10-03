import React from 'react';
import { Grid, Calendar, Wine, Home, Umbrella, Layers } from 'lucide-react';
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

type TableStatus = 'bosh' | 'band' | 'bron';

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
  const statusCounts = React.useMemo(() => {
    const counts: Record<TableStatus, number> = { bosh: 0, band: 0, bron: 0 };
    for (const tb of filteredTables) counts[tb.status] += 1;
    return counts;
  }, [filteredTables]);

  /*
    Bu qator endi filtr emas, faqat ko'rsatkich: kassa zalga bir qarashda
    qancha stol bo'sh, qancha band ekanini biladi. Filtrlash zonalar
    paneli orqali bo'ladi (kassir stolni ko'zi bilan izlagani tezroq).
  */
  const LEGEND: { id: TableStatus; label: string; dot: string }[] = [
    { id: 'bosh', label: t('table.statFree'), dot: 'bg-emerald-500' },
    { id: 'band', label: t('table.statBusy'), dot: 'bg-brand-500' },
    { id: 'bron', label: t('table.statReserved'), dot: 'bg-red-600' },
  ];

  /*
    Stollar zonalar bo'yicha bo'linadi: kassa xodimi "Bar" degan tugmani
    bosganda butun zonalarni ko'rmasdan kerak stollarni topadi. Zonalar
    ro'yxati App'dan keladi (serverdagi xaotaga mos), shuning uchun
    bu yerda qat'iy zona ro'yxati emas — kelgan nom bo'yicha guruhlanadi.
  */
  const areaIcon = (area: string) => {
    const a = area.toLowerCase();
    if (a.includes('bar') || a.includes('bars')) return Wine;
    if (a.includes('hovli') || a.includes('zal') || a.includes('hall') || a.includes('ichki')) return Home;
    if (a.includes('terras') || a.includes('terrace') || a.includes('tashqi') || a.includes('ochiq')) return Umbrella;
    return Layers;
  };

  const groupedByArea = React.useMemo(() => {
    const map = new Map<string, TableItemData[]>();
    for (const tb of filteredTables) {
      const key = tb.area || '';
      const list = map.get(key);
      if (list) list.push(tb);
      else map.set(key, [tb]);
    }
    return Array.from(map.entries()).map(([area, list]) => ({ area, list }));
  }, [filteredTables]);

  return (
    <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-y-auto pr-1 min-h-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-2">
      {/* Sarlavha + bron tugmasi */}
      {/*
        Telefonda sarlavha o'z qatorida, zonalar + holat + bron esa BITTA
        qatorda (sig'masa yon tomonga suriladi). Avval ular 3 qatorga
        sinib, ro'yxatni ekranning yarmigacha pastga itarardi. Kompyuterda
        `sm:contents` o'rami yo'qoladi va hammasi eskicha bir qatorda.
      */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
        <h1 className="h-11 text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
            <Grid className="w-4 h-4" />
          </span>
          {t('table.layout')}
        </h1>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 sm:contents">
          {/*
            Zonalar sarlavha yonida, bitta qatorga sig'dirilgan kartalar
            ko'rinishida — ular endi nafaqat filtr, balki stollarning qaysi
            qismda turganini ko'rsatadi. "Barchasi" birinchi bo'lib, chunki
            kassa birinchi urinishda butun zaxirani ko'rmoqchi.
          */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:overflow-x-auto sm:no-scrollbar sm:max-w-full">
            {areas.map((area) => {
              const areaCount = tables.filter((tb) => area === allAreasLabel || tb.area === area).length;
              return (
                <button
                  key={area}
                  onClick={() => onSelectArea(area)}
                  className={`h-11 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border shadow-xs whitespace-nowrap cursor-pointer ${
                    activeArea === area
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:text-brand-700'
                  }`}
                >
                  <span>{area === allAreasLabel ? t('table.allAreas') : area}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums leading-none ${
                      activeArea === area ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {areaCount}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:ml-auto sm:flex-wrap">
            {/* Holat ko'rsatkichlari — bosilmaydi, faqat ma'lumot. */}
            <div className="flex items-center gap-2 sm:gap-3 h-11 bg-white border border-slate-200 rounded-xl px-2.5 sm:px-4 shadow-xs">
              {LEGEND.map((f) => (
                <span
                  key={f.id}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 whitespace-nowrap"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.dot}`} />
                  {f.label}
                  <span className="text-[10px] font-bold tabular-nums text-slate-400">
                    {statusCounts[f.id]}
                  </span>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenReservationModal}
              aria-label={t('table.reservation')}
              className="flex items-center justify-center gap-1.5 sm:gap-2 h-11 w-11 sm:w-auto sm:px-4 bg-brand-500 hover:bg-brand-600 active:scale-98 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('table.reservation')}</span>
            </button>
          </div>
        </div>
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
      ) : filteredTables.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-500">{t('table.none')}</p>
        </div>
      ) : (
        /* Har zona o'z sarlavhasi bilan: stol nomlari o'zlarida zona yozmaydi,
           "Bar 3" desagina zona ham aytiladi, lekin "3" desagina nima
           ko'rinmaydi. Sarlavhadagi ikonka va "N ta stol" yozuvi esa
           kassaga bu qator nima ekanini bir qarashda aytadi. */
        <div className="flex flex-col gap-6">
          {groupedByArea.map(({ area, list }) => {
            const Icon = areaIcon(area);
            return (
              <section key={area || 'no-area'} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs text-brand-500 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {area || t('table.allAreas')}
                  </h2>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                    {t('table.sectionCount', { n: list.length })}
                  </span>
                  <span className="flex-1 h-px bg-slate-200/80" aria-hidden="true" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                  {list.map((tbl) => (
                    <TableCard key={tbl.id} table={tbl} onSelect={onSelectTable} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
