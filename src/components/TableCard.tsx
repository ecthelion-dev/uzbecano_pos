import React from 'react';
import { Bell, Lock, CloudOff, Users } from 'lucide-react';
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
  /*
    Holat bir soniyada o'qilishi kerak. Shu uchun karta yengil, yorug' va
    yorliq bir xil o'lchamda: kassir rangni o'zidan emas, yorliqdan
    taniydi. To'q kartalar jam bo'lganda zaal bir xil rasmga aylanardi.
  */
  const shell = table.hasWaiterCall
    ? 'bg-white border-amber-500 ring-2 ring-amber-400 animate-pulse shadow-md shadow-amber-500/20'
    : table.unsynced
    ? // Sarg'ish hoshiya — chek serverga yetmagan. Chaqiruvdan farqli
      // o'laroq miltillamaydi: bu shoshilinch emas, lekin ko'rinib
      // turishi shart, aks holda adminka bilan farq tushuntirilmay
      // qoladi va xodimlar bir-birini ayblaydi.
      'bg-white border-amber-500 ring-1 ring-amber-500/50'
    : table.status === 'band'
    ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
    : table.status === 'bron'
    ? 'bg-brand-50 border-brand-200 hover:border-brand-300'
    : 'bg-white border-slate-200 hover:border-brand-300';

  const badge = table.status === 'band'
    ? 'bg-orange-500 text-white'
    : table.status === 'bron'
    ? 'bg-brand-500 text-white'
    : 'bg-emerald-100 text-emerald-700';

  return (
    <div
      onClick={() => onSelect(table.number)}
      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer group active:scale-98 relative ${shell}`}
    >
      <div className="flex justify-between items-start gap-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {table.heldBy && (
            <span
              className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center shrink-0"
              title={t('table.heldBy', { name: table.heldBy })}
            >
              <Lock className="w-3 h-3" />
            </span>
          )}
          {table.unsynced && (
            <span
              className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0"
              title={t('table.unsynced')}
            >
              <CloudOff className="w-3 h-3" />
            </span>
          )}
          {table.hasWaiterCall && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 animate-bounce" title={t('table.waiterCall')}>
              <Bell className="w-3 h-3 fill-white" />
            </span>
          )}
          <span className="font-bold text-xs sm:text-sm md:text-base tracking-tight text-slate-900 truncate whitespace-nowrap">
            {table.number}
          </span>
        </div>
        <span
          className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${badge}`}
        >
          {table.status === 'band'
            ? t('table.busy')
            : table.status === 'bron'
            ? t('table.reserved')
            : t('table.free')}
        </span>
      </div>

      {table.status === 'band' ? (
        <div className="bg-white/70 p-1.5 sm:p-2 rounded-xl border border-orange-200/70 flex items-center justify-between gap-1 min-w-0">
          {/*
            Ikonka yetarli emas: kassa sensorli ekran, ustiga olib borish
            yo'q, ya'ni tooltipni hech kim ko'rmaydi. Yozuv "Jami" o'rnini
            egallaydi — summaning o'zi joyida qoladi.
          */}
          <span
            className={`text-[9px] sm:text-[10px] font-medium shrink-0 truncate ${
              table.unsynced ? 'text-amber-600 font-bold' : 'text-slate-500'
            }`}
          >
            {table.unsynced
              ? t('table.unsyncedShort')
              : table.heldBy || t('common.total')}
          </span>
          {/* Valyuta nomi ataylab yozilmaydi: kartochka tor va "so'm" summani
              qirqib, "15,000 s..." qilib qo'yardi — ya'ni birlik uchun eng
              kerakli narsa, raqamning o'zi yo'qolardi. */}
          <span className="text-[11px] sm:text-xs text-slate-900 font-bold truncate whitespace-nowrap">{table.total.toLocaleString()}</span>
        </div>
      ) : table.status === 'bron' && table.reservation ? (
        <div className="bg-white/70 p-1.5 sm:p-2 rounded-xl border border-brand-200/70 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-medium text-slate-600 truncate">
              {table.reservation.customerName}
            </span>
            <span className="text-[10px] sm:text-[11px] text-brand-700 font-bold shrink-0 whitespace-nowrap">
              {formatClock(table.reservation.reservedTime)}
            </span>
          </div>
          {/*
            Mehmonlar soni FAQAT bron stollarda. Bo'sh va band stollarda
            mehmon yo'q yoki allaqachon stolga o'tirgan — sono ko'rsatilsa,
            kassir uni noto'g'ri deb o'ylab, bo'sh stolni band deb sanab
            yoki band stolga yangi mehmon qo'shishga urunadi.
          */}
          <span className="text-[10px] sm:text-[11px] font-bold text-brand-700 flex items-center gap-1">
            <Users className="w-3 h-3 shrink-0" />
            {t('table.guests', { n: table.reservation.guestCount })}
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
