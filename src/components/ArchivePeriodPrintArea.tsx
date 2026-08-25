import React, { useMemo } from 'react';
import { DBOrder } from '../types';

export interface PeriodPrintData {
  orders: DBOrder[];
  from: Date | null;
  to: Date | null;
  printedBy: string;
}

interface ArchivePeriodPrintAreaProps {
  data: PeriodPrintData | null;
  cafeName: string;
  cafeLogo: string;
  cafeAddress: string;
  cafePhone: string;
}

const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/** "25 avgust 2026 11:30" — brauzer lokaliga bog'liq bo'lmasin uchun qo'lda. */
function fmtDateTime(d: Date | null, withTime = true): string {
  if (!d || isNaN(d.getTime())) return '—';
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return date;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

function parseItems(items: any): any[] {
  if (!items) return [];
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="font-semibold text-slate-700 print-text-dark shrink-0">{label}</span>
      <span className="font-bold text-slate-900 print-text-dark text-right">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? 'text-sm font-black' : 'text-xs font-semibold'}`}>
      <span className="text-slate-800 print-text-dark">{label}</span>
      <span className="text-slate-900 print-text-dark whitespace-nowrap">{value}</span>
    </div>
  );
}

/**
 * Davr hisoboti: cheklar emas, sotilgan taomlar jamlanadi. Bir kunda 40 ta
 * chek bo'lsa, ularni birma-bir chiqarish yarim metr lenta yeydi va hech kim
 * o'qimaydi — kassirga kerakligi "nima sotildi va kassada qancha pul bor".
 * Qaytarilgan cheklar tushumga ham, sotuvga ham kirmaydi.
 */
export const ArchivePeriodPrintArea: React.FC<ArchivePeriodPrintAreaProps> = ({
  data,
  cafeName,
  cafeLogo,
  cafeAddress,
  cafePhone,
}) => {
  const report = useMemo(() => {
    const lines = new Map<string, { name: string; price: number; qty: number; sum: number }>();
    let orderCount = 0;
    let itemsSubtotal = 0;
    let serviceFee = 0;
    let discount = 0;
    let paid = 0;
    let cash = 0;
    let card = 0;
    let refunded = 0;
    let refundedCount = 0;
    let waiters = new Set<string>();

    (data?.orders || []).forEach((ord: any) => {
      const tot = Number(ord.total) || 0;

      if (ord.refunded) {
        refunded += tot;
        refundedCount += 1;
        return;
      }

      orderCount += 1;
      if (ord.waiterName) waiters.add(ord.waiterName);

      parseItems(ord.items).forEach((it: any) => {
        const name = it.product?.name || it.name || 'Nomsiz';
        const price = Number(it.price ?? it.product?.price ?? it.unitPrice ?? 0);
        const qty = Number(it.quantity ?? it.count ?? 1) || 1;
        const sum = Number(it.totalPrice ?? price * qty) || price * qty;

        // O'lchami boshqa taom — narxi ham boshqa, shuning uchun kalitda narx ham bor.
        const key = `${name}__${price}`;
        const prev = lines.get(key);
        if (prev) {
          prev.qty += qty;
          prev.sum += sum;
        } else {
          lines.set(key, { name, price, qty, sum });
        }
        itemsSubtotal += sum;
      });

      serviceFee += Number(ord.serviceFee) || 0;
      discount += Number(ord.discountAmount) || 0;
      paid += tot;

      if (ord.paymentMethod === 'aralash') {
        cash += Number(ord.cashAmount) || 0;
        card += Number(ord.cardAmount) || 0;
      } else if (ord.paymentMethod === 'karta') {
        card += tot;
      } else {
        cash += tot;
      }
    });

    return {
      rows: [...lines.values()].sort((a, b) => b.sum - a.sum),
      orderCount,
      itemsSubtotal,
      serviceFee,
      discount,
      paid,
      cash,
      card,
      refunded,
      refundedCount,
      waiterLabel: waiters.size === 1 ? [...waiters][0] : 'Barcha ofitsiantlar',
    };
  }, [data]);

  if (!data) return null;

  return (
    <div id="thermal-print-area" className="period-report hidden print:block text-slate-900 print-receipt-container font-['Outfit']">
      <div className="w-full bg-white p-0.5 text-slate-900 space-y-2.5">
        {/* Sarlavha */}
        <div className="text-center space-y-1 pb-1">
          <div className="flex flex-col items-center justify-center gap-0.5 pt-0.5">
            {cafeLogo ? (
              <img src={cafeLogo} alt={cafeName} className="w-8 h-8 object-contain rounded-lg mx-auto" />
            ) : (
              <img src="/favicon.png" alt="OrderPlus" className="w-7 h-7 object-contain mx-auto" />
            )}
          </div>
          <h2 className="text-sm font-black tracking-wide text-slate-900 print-text-dark">
            Hisobot — {fmtDateTime(data.from, false)}
          </h2>
        </div>

        {/* Davr ma'lumotlari */}
        <div className="space-y-1 pb-2 border-b border-dashed border-slate-900">
          <InfoRow label="Kafe" value={cafeName || 'ORDERPLUS'} />
          {cafeAddress && <InfoRow label="Manzil" value={cafeAddress} />}
          {cafePhone && <InfoRow label="Tel" value={cafePhone} />}
          <InfoRow label="Ofitsiant" value={report.waiterLabel} />
          <InfoRow label="Boshlanish" value={fmtDateTime(data.from)} />
          <InfoRow label="Tugash" value={fmtDateTime(data.to)} />
          {data.printedBy && <InfoRow label="Chop etdi" value={data.printedBy} />}
        </div>

        {/* Sotilgan taomlar */}
        <div className="space-y-1 pb-2 border-b-2 border-slate-900">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[10px] font-black text-slate-900 print-text-dark uppercase border-b border-slate-300 pb-1">
            <span>Nomi</span>
            <span className="text-right w-8">Soni</span>
            <span className="text-right w-14">Narxi</span>
            <span className="text-right w-16">Jami</span>
          </div>

          {report.rows.length === 0 ? (
            <div className="text-[11px] font-medium text-slate-700 print-text-dark py-2 text-center">
              Bu davrda sotuv bo&apos;lmagan
            </div>
          ) : (
            report.rows.map((row, idx) => (
              <div
                key={`${row.name}-${row.price}-${idx}`}
                className="report-row grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[11px] font-semibold text-slate-900 print-text-dark py-0.5 border-b border-slate-200/70"
              >
                <span className="leading-snug break-words">{row.name}</span>
                <span className="text-right w-8">{row.qty}</span>
                <span className="text-right w-14">{row.price.toLocaleString()}</span>
                <span className="text-right w-16 font-bold">{row.sum.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        {/* Yakuniy hisob */}
        <div className="space-y-1 pb-2 border-b border-dashed border-slate-900">
          <TotalRow label="Buyurtmalar soni" value={`${report.orderCount} ta`} />
          <TotalRow label="Taomlar jami" value={`${report.itemsSubtotal.toLocaleString()} so'm`} />
          {report.serviceFee > 0 && (
            <TotalRow label="Xizmat haqi" value={`${report.serviceFee.toLocaleString()} so'm`} />
          )}
          <TotalRow label="Chegirmalar" value={`${report.discount.toLocaleString()} so'm`} />
          {report.refundedCount > 0 && (
            <TotalRow
              label={`Qaytarilgan (${report.refundedCount} ta)`}
              value={`−${report.refunded.toLocaleString()} so'm`}
            />
          )}
        </div>

        <TotalRow label="JAMI TUSHUM" value={`${report.paid.toLocaleString()} so'm`} strong />

        <div className="space-y-1 pt-1 border-t border-dashed border-slate-900">
          <TotalRow label="Naqd to'lovlar" value={`${report.cash.toLocaleString()} so'm`} />
          <TotalRow label="Karta to'lovlar" value={`${report.card.toLocaleString()} so'm`} />
        </div>

        <div className="text-center text-[10px] font-medium text-slate-600 print-text-dark pt-1.5">
          {fmtDateTime(new Date())} · OrderPlus POS
        </div>
      </div>
    </div>
  );
};
