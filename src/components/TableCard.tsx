import React from 'react';
import { Bell, Lock, CloudOff, Bookmark } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { formatClock } from '../lib/timeFormat';
import type { DBReservation } from '../types';

export interface TableItemData {
  id: string;
  number: string;
  area: string;
  status: 'band' | 'bosh' | 'bron';
  total: number;
  hasWaiterCall?: boolean;
  /**
   * Buyurtma BOSHQA qurilmada yig'ilayotgan bo'lsa — kim yig'ayotgani.
   *
   * Bunday stolni ochib bo'lmaydi: ikkinchi savat ham yuborilsa, stolda
   * ikkita ochiq chek paydo bo'ladi va ulardan biri hech qachon yopilmay
   * qoladi — kassada esa bittasigina ko'rinadi.
   */
  heldBy?: string;
  /**
   * Chek yuborilgan, lekin serverga hali yetmagan.
   *
   * 2026-09-16: kassada uchta stol band, adminkada ikkita buyurtma edi —
   * uchinchisining cheki navbatda turardi va buni ekrandan bilib
   * bo'lmasdi. Ikkita xodim ikki xil ro'yxatga qarab bir-birini aybladi.
   */
  unsynced?: boolean;
  reservation?: DBReservation | null;
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
          : table.unsynced
          ? // Sarg'ish hoshiya — chek serverga yetmagan. Chaqiruvdan farqli
            // o'laroq miltillamaydi: bu shoshilinch emas, lekin ko'rinib
            // turishi shart, aks holda adminka bilan farq tushuntirilmay
            // qoladi va xodimlar bir-birini ayblaydi.
            'bg-[#1E2021] border-amber-500 ring-1 ring-amber-500/60 text-white'
          : table.status === 'band'
          ? 'bg-[#1E2021] border-[#2A2D2F] text-white hover:border-orange-500'
          : table.status === 'bron'
          ? 'bg-[#1E2021] border-purple-500/80 ring-1 ring-purple-500/50 text-white hover:border-purple-400'
          : 'bg-white border-slate-200 text-slate-800 hover:border-orange-400'
      }`}
    >
      <div className="flex justify-between items-center gap-1 min-w-0">
        {table.heldBy && (
          <span
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center shadow-sm"
            title={t('table.heldBy', { name: table.heldBy })}
          >
            <Lock className="w-3 h-3" />
          </span>
        )}
        <span className={`font-bold text-xs sm:text-sm md:text-base tracking-tight truncate whitespace-nowrap ${table.status === 'band' || table.status === 'bron' ? 'text-white' : 'text-slate-900'}`}>
          {table.number}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {table.unsynced && (
            <span
              className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm"
              title={t('table.unsynced')}
            >
              <CloudOff className="w-3 h-3" />
            </span>
          )}
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
                : table.status === 'bron'
                ? 'bg-purple-600 text-white'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {table.status === 'band'
              ? t('table.busy')
              : table.status === 'bron'
              ? t('table.reserved')
              : t('table.free')}
          </span>
        </div>
      </div>

      {table.status === 'band' ? (
        <div className="bg-[#2A2D2F] p-1.5 sm:p-2 rounded-xl border border-[#3A3E41] flex items-center justify-between gap-1 min-w-0">
          {/*
            Ikonka yetarli emas: kassa sensorli ekran, ustiga olib borish
            yo'q, ya'ni tooltipni hech kim ko'rmaydi. Yozuv "Jami" o'rnini
            egallaydi — summaning o'zi joyida qoladi.
          */}
          <span
            className={`text-[9px] sm:text-[10px] font-medium shrink-0 truncate ${
              table.unsynced ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            {table.unsynced
              ? t('table.unsyncedShort')
              : table.heldBy || t('common.total')}
          </span>
          {/* Valyuta nomi ataylab yozilmaydi: kartochka tor va "so'm" summani
              qirqib, "15,000 s..." qilib qo'yardi — ya'ni birlik uchun eng
              kerakli narsa, raqamning o'zi yo'qolardi. */}
          <span className="text-[11px] sm:text-xs text-white font-bold truncate whitespace-nowrap">{table.total.toLocaleString()}</span>
        </div>
      ) : table.status === 'bron' && table.reservation ? (
        <div className="bg-[#2A2D2F] p-1.5 sm:p-2 rounded-xl border border-purple-500/30 flex items-center justify-between gap-1 min-w-0">
          <span className="text-[9px] sm:text-[10px] font-medium text-purple-300 truncate">
            {table.reservation.customerName}
          </span>
          <span className="text-[10px] sm:text-[11px] text-purple-200 font-bold shrink-0 whitespace-nowrap">
            {formatClock(table.reservation.reservedTime)}
          </span>
        </div>
      ) : (
        <div className="py-0.5 min-w-0">
          <p className="text-[10px] text-slate-400 font-medium truncate whitespace-nowrap">{table.area}</p>
        </div>
      )}
    </div>
  );
});
