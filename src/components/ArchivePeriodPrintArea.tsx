import React, { useMemo } from 'react';
import { DBOrder } from '../types';

export interface PeriodPrintData {
  orders: DBOrder[];
  /** "Bugun", "Kecha", "Barchasi" yoki tanlangan oraliq matni. */
  periodLabel: string;
  printedBy: string;
}

interface ArchivePeriodPrintAreaProps {
  data: PeriodPrintData | null;
  cafeName: string;
  cafeLogo: string;
  cafeAddress: string;
  cafePhone: string;
}

function itemCount(items: any): number {
  if (!items) return 0;
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function payLabel(ord: any): string {
  if (ord.paymentMethod === 'karta') return 'Karta';
  if (ord.paymentMethod === 'aralash') return 'Aralash';
  return 'Naqd';
}

/**
 * Tanlangan davrdagi barcha cheklarning bitta lentaga sig'adigan hisoboti.
 * Qaytarilgan cheklar tushumga qo'shilmaydi — ular alohida qatorda ko'rsatiladi,
 * aks holda qog'ozdagi "JAMI" kassadagi haqiqiy pulga to'g'ri kelmaydi.
 */
export const ArchivePeriodPrintArea: React.FC<ArchivePeriodPrintAreaProps> = ({
  data,
  cafeName,
  cafeLogo,
  cafeAddress,
  cafePhone,
}) => {
  const totals = useMemo(() => {
    let cash = 0;
    let card = 0;
    let refunded = 0;
    let refundedCount = 0;

    (data?.orders || []).forEach((ord: any) => {
      const tot = Number(ord.total) || 0;
      if (ord.refunded) {
        refunded += tot;
        refundedCount += 1;
        return;
      }
      if (ord.paymentMethod === 'aralash') {
        cash += Number(ord.cashAmount) || 0;
        card += Number(ord.cardAmount) || 0;
      } else if (ord.paymentMethod === 'karta') {
        card += tot;
      } else {
        cash += tot;
      }
    });

    return { cash, card, refunded, refundedCount, net: cash + card };
  }, [data]);

  if (!data) return null;

  const rows = [...data.orders].sort((a: any, b: any) => {
    const ta = a.closedAt ? new Date(a.closedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const tb = b.closedAt ? new Date(b.closedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return ta - tb;
  });

  return (
    <div id="thermal-print-area" className="period-report hidden print:block text-slate-900 print-receipt-container font-['Outfit']">
      <div className="w-full bg-white p-0.5 text-slate-900 space-y-2.5">
        {/* Sarlavha */}
        <div className="text-center border-b border-dashed border-slate-900 pb-2 space-y-1">
          <div className="flex flex-col items-center justify-center gap-0.5 pt-0.5">
            {cafeLogo ? (
              <img src={cafeLogo} alt={cafeName} className="w-8 h-8 object-contain rounded-lg mx-auto" />
            ) : (
              <img src="/favicon.png" alt="OrderPlus" className="w-7 h-7 object-contain mx-auto" />
            )}
            <h2 className="text-base font-black tracking-wider uppercase text-slate-900 print-text-dark">
              {cafeName || 'ORDERPLUS'}
            </h2>
          </div>
          {cafeAddress && (
            <p className="text-[10px] font-medium text-slate-700 print-text-dark leading-tight">{cafeAddress}</p>
          )}
          {cafePhone && (
            <p className="text-[10px] font-medium text-slate-600 print-text-dark">Tel: {cafePhone}</p>
          )}
          <div className="text-xs font-black pt-1 text-slate-900 print-text-dark uppercase tracking-wide">
            Cheklar hisoboti
          </div>
          <div className="text-[10px] font-semibold text-slate-700 print-text-dark">{data.periodLabel}</div>
          <div className="text-[10px] font-medium text-slate-600 print-text-dark">
            Chop etildi: {new Date().toLocaleString('uz-UZ')}
          </div>
          {data.printedBy && (
            <div className="text-[10px] font-semibold text-slate-700 print-text-dark">Kassir: {data.printedBy}</div>
          )}
        </div>

        {/* Cheklar ro'yxati */}
        <div className="space-y-1.5 border-b border-dashed border-slate-900 pb-2">
          <div className="flex justify-between font-bold text-[10px] text-slate-900 print-text-dark uppercase border-b border-slate-200 pb-1">
            <span>VAQT / STOL</span>
            <span>SUMMA</span>
          </div>

          {rows.length === 0 ? (
            <div className="text-[11px] font-medium text-slate-700 print-text-dark py-2 text-center">
              Bu davrda yopilgan chek yo&apos;q
            </div>
          ) : (
            rows.map((ord: any, idx: number) => {
              const when = ord.closedAt ? new Date(ord.closedAt) : (ord.createdAt ? new Date(ord.createdAt) : null);
              return (
                <div key={ord.id || idx} className="report-row flex justify-between items-start border-b border-slate-200/80 pb-1 pt-0.5">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 print-text-dark text-xs leading-snug">
                      {when ? when.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      {'  '}
                      {ord.tableNumber}
                    </div>
                    <div className="text-[10px] font-medium text-slate-800 print-text-dark mt-0.5">
                      #{String(ord.id || '').slice(-6)} · {itemCount(ord.items)} ta · {payLabel(ord)}
                      {ord.waiterName ? ` · ${ord.waiterName}` : ''}
                    </div>
                    {ord.refunded && (
                      <div className="text-[10px] font-bold text-slate-900 print-text-dark mt-0.5">
                        QAYTARILGAN{ord.refundReason ? `: ${ord.refundReason}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 print-text-dark whitespace-nowrap">
                    {ord.refunded ? '−' : ''}{(Number(ord.total) || 0).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Yakuniy hisob */}
        <div className="space-y-1 text-xs border-b border-dashed border-slate-900 pb-2">
          <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
            <span>Cheklar soni:</span>
            <span>{rows.length - totals.refundedCount} ta</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
            <span>Naqd:</span>
            <span>{totals.cash.toLocaleString()} so&apos;m</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
            <span>Karta:</span>
            <span>{totals.card.toLocaleString()} so&apos;m</span>
          </div>
          {totals.refundedCount > 0 && (
            <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
              <span>Qaytarilgan ({totals.refundedCount} ta):</span>
              <span>−{totals.refunded.toLocaleString()} so&apos;m</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-sm font-black text-slate-900 print-text-dark uppercase">
          <span>Jami tushum:</span>
          <span>{totals.net.toLocaleString()} so&apos;m</span>
        </div>

        <div className="text-center text-[10px] font-medium text-slate-600 print-text-dark pt-1.5">
          OrderPlus POS
        </div>
      </div>
    </div>
  );
};
