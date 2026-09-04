import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DBOrder } from '../types';
import { useT, useLocale } from '../lib/i18n/LanguageProvider';
import { monthName } from '../lib/i18n/months';
import type { Locale } from '../lib/i18n/locales';

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

/**
 * "25 avgust 2026 11:30" — brauzer lokaliga bog'liq bo'lmasin uchun qo'lda.
 *
 * Oy nomlari `i18n/months.ts` da: chek ham xuddi shu ro'yxatdan oladi, ya'ni
 * bitta kunning sanasi hisobotda va chekda bir xil yoziladi.
 */
function fmtDateTime(d: Date | null, locale: Locale, withTime = true): string {
  if (!d || isNaN(d.getTime())) return '—';
  const date = `${d.getDate()} ${monthName(locale, d.getMonth())} ${d.getFullYear()}`;
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
  const t = useT();
  const { locale } = useLocale();

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
        const name = it.product?.name || it.name || t('print.unnamed');
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
      waiterLabel: waiters.size === 1 ? [...waiters][0] : t('print.allWaiters'),
    };
  }, [data, t]);

  if (!data) return null;

  /* Valyuta lug'atda, lug'at esa hook ichida — shuning uchun yordamchi
     komponent ichida yasaladi, modul ko'lamida emas. */
  const money = (v: number) => `${v.toLocaleString()} ${t('common.currency')}`;

  // Lenta uzunligi pul: hisobot body ga to'g'ridan-to'g'ri chiqadi, logotip yo'q
  // (termoprinterda u baribir dog' bo'lib chiqadi), manzil va telefon ham yo'q —
  // bu ichki hisobot, mijozga berilmaydi.
  return createPortal(
    <div id="thermal-print-area" className="period-report hidden print:block text-slate-900 print-receipt-container font-['Outfit']">
      <div className="w-full bg-white text-slate-900 space-y-2">
        {/* Sarlavha */}
        <div className="text-center pt-1 space-y-1">
          <img
            src={cafeLogo || '/favicon.png'}
            alt={cafeName}
            /* Termoprinter rasmni nuqtalarga aylantiradi — juda kichigi dog'
               bo'lib chiqadi, shuning uchun 48px. */
            className="w-12 h-12 object-contain mx-auto"
          />
          <h2 className="text-sm font-black tracking-wide text-slate-900 print-text-dark">
            {t('print.report')} — {fmtDateTime(data.from, locale, false)}
          </h2>
        </div>

        {/* Davr ma'lumotlari */}
        <div className="space-y-0.5 pb-1.5 border-b border-dashed border-slate-900">
          <InfoRow label={t('print.cafe')} value={cafeName || 'ORDERPLUS'} />
          <InfoRow label={t('print.waiter')} value={report.waiterLabel} />
          <InfoRow label={t('print.periodFrom')} value={fmtDateTime(data.from, locale)} />
          <InfoRow label={t('print.periodTo')} value={fmtDateTime(data.to, locale)} />
          {data.printedBy && <InfoRow label={t('print.printedBy')} value={data.printedBy} />}
        </div>

        {/* Sotilgan taomlar */}
        <div className="space-y-0.5 pb-1.5 border-b-2 border-slate-900">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[10px] font-black text-slate-900 print-text-dark uppercase border-b border-slate-300 pb-1">
            <span>{t('print.colName')}</span>
            <span className="text-right w-7">{t('print.colQty')}</span>
            <span className="text-right w-12">{t('print.colPrice')}</span>
            <span className="text-right w-14">{t('print.colSum')}</span>
          </div>

          {report.rows.length === 0 ? (
            <div className="text-[11px] font-medium text-slate-700 print-text-dark py-2 text-center">
              {t('print.noSales')}
            </div>
          ) : (
            report.rows.map((row, idx) => (
              <div
                key={`${row.name}-${row.price}-${idx}`}
                className="report-row grid grid-cols-[1fr_auto_auto_auto] gap-x-1.5 text-[10px] font-semibold text-slate-900 print-text-dark py-0.5 border-b border-slate-200/70"
              >
                <span className="leading-snug break-words">{row.name}</span>
                <span className="text-right w-7">{row.qty}</span>
                <span className="text-right w-12">{row.price.toLocaleString()}</span>
                <span className="text-right w-14 font-bold">{row.sum.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        {/* Yakuniy hisob */}
        <div className="report-summary space-y-0.5 pb-1.5 border-b border-dashed border-slate-900">
          <TotalRow label={t('print.orderCount')} value={t('common.countItems', { n: report.orderCount })} />
          <TotalRow label={t('print.itemsTotal')} value={money(report.itemsSubtotal)} />
          {report.serviceFee > 0 && (
            <TotalRow label={t('print.serviceFee')} value={money(report.serviceFee)} />
          )}
          <TotalRow label={t('print.discounts')} value={money(report.discount)} />
          {report.refundedCount > 0 && (
            <TotalRow
              label={t('print.refundedCount', { n: report.refundedCount })}
              value={`−${money(report.refunded)}`}
            />
          )}
        </div>

        <TotalRow label={t('print.revenue')} value={money(report.paid)} strong />

        <div className="report-summary space-y-0.5 pt-1 border-t border-dashed border-slate-900">
          <TotalRow label={t('print.cashPayments')} value={money(report.cash)} />
          <TotalRow label={t('print.cardPayments')} value={money(report.card)} />
        </div>

        <div className="text-center text-[10px] font-medium text-slate-600 print-text-dark pt-1">
          {fmtDateTime(new Date(), locale)} · OrderPlus POS
        </div>
      </div>
    </div>,
    document.body
  );
};
