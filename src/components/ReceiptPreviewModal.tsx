import React, { useMemo } from 'react';
import { Printer, Banknote, CreditCard, PenLine } from 'lucide-react';
import { DBWaiter } from '../types';
import { useT } from '../lib/i18n/LanguageProvider';

interface ReceiptPreviewModalProps {
  show: boolean;
  selectedTable: string;
  currentWaiter: DBWaiter | null;
  activeTableOrderItems: any[];
  cart: any[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod?: string;
  cashAmount?: number;
  cardAmount?: number;
  serviceFee: number;
  grandTotal: number;
  cafeName?: string;
  cafeLogo?: string;
  cafeAddress?: string;
  cafePhone?: string;
  receiptHeader?: string;
  onClose: () => void;
  onPrint: () => void;
}

/*
 * Chek TANASI ham tarjima qilinadi.
 *
 * Ilgari bu yerda teskarisi yozilgan edi: tana qog'ozning aynan o'zi, qog'oz
 * esa o'zbekcha qolsin degan. Xulosa noto'g'ri chiqqan — kassir ruscha
 * ishlab, mijozga o'zbekcha chek uzatardi. To'g'ri yechim qog'ozni o'zbekcha
 * qoldirish emas, uni ham tanlangan tilga o'tkazish edi; endi `printer.ts`
 * xuddi shu `print.*` kalitlarini ishlatadi, ya'ni bu oynadagi ko'rinish
 * qo'lga chiqadigan qog'oz bilan bir xil.
 *
 * Kafe o'zi yozadigan narsalar (nomi, manzili, taom nomlari) tarjima
 * qilinmaydi: ular ma'lumot.
 */
export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  show,
  selectedTable,
  currentWaiter,
  activeTableOrderItems,
  cart,
  subtotal,
  discountPercent = 0,
  discountAmount = 0,
  paymentMethod = 'naqd',
  cashAmount,
  cardAmount,
  serviceFee,
  grandTotal,
  cafeName,
  cafeLogo,
  cafeAddress,
  cafePhone,
  receiptHeader,
  onClose,
  onPrint,
}) => {
  const t = useT();
  if (!show) return null;

  /* Bazadagi qiymat ("naqd"/"karta"/"aralash") — ekranga o'sha emas, tarjimasi chiqadi. */
  const payLabel =
    paymentMethod === 'karta' ? t('common.card')
    : paymentMethod === 'aralash' ? t('common.mixed')
    : t('common.cash');

  const combinedItems = useMemo(() => [
    ...activeTableOrderItems,
    ...cart.map(c => ({ name: c.product.name, price: c.product.price, quantity: c.quantity, note: c.note }))
  ], [activeTableOrderItems, cart]);

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-orange-500" /> {t('receipt.preview')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-semibold">×</button>
        </div>

        {/* Thermal Receipt Paper Effect */}
        <div id="printable-receipt" className="bg-amber-50/40 p-4 sm:p-6 rounded-2xl border border-amber-200/60 font-mono text-sm text-slate-800 space-y-3.5 shadow-inner">
          <div className="text-center space-y-1.5 border-b border-dashed border-slate-400 pb-3">
            <div className="flex flex-col items-center justify-center gap-1">
              {cafeLogo ? (
                <img src={cafeLogo} alt={cafeName} className="w-12 h-12 rounded-xl object-contain mx-auto" />
              ) : (
                <img src="/favicon.png" alt="OrderPlus" className="w-10 h-10 object-contain mx-auto" />
              )}
              <h4 className="font-bold text-xl text-slate-900 tracking-wider uppercase">{cafeName || 'ORDERPLUS RESTORAN'}</h4>
            </div>
            {receiptHeader && (
              <p className="text-xs text-orange-600 font-bold">{receiptHeader}</p>
            )}
            {cafeAddress && <p className="text-xs text-slate-600 font-medium">{cafeAddress}</p>}
            {cafePhone && <p className="text-xs text-slate-600 font-medium">{cafePhone.startsWith('Tel') ? cafePhone : `Tel: ${cafePhone}`}</p>}
            {currentWaiter?.name && (
              <p className="text-xs text-slate-900 font-bold mt-1">{t('print.waiter')}: {currentWaiter.name}</p>
            )}
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-slate-800 border-b border-dashed border-slate-400 pb-2">
            <span className="font-bold text-sm">{selectedTable}</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold text-xs uppercase">
              {payLabel} • {t('archive.paid')}
            </span>
            <span>{new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Items List */}
          <div className="space-y-2 border-b border-dashed border-slate-400 pb-3 pt-1 max-h-56 overflow-y-auto pr-1">
            {combinedItems.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-2">{t('receipt.noItems')}</p>
            ) : (
              combinedItems.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start text-xs pb-1 border-b border-slate-100 last:border-b-0">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-600 font-medium">{item.quantity} x {(item.price || 0).toLocaleString()} {t('common.currency')}</p>
                    {item.note && (
                      <p className="text-xs font-semibold text-amber-900 mt-0.5"><PenLine className="w-3 h-3 inline mr-0.5" />{t('print.note')}: {item.note}</p>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} {t('common.currency')}</span>
                </div>
              ))
            )}
          </div>

          {/* Calculations */}
          <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-2.5 text-xs font-medium">
            <div className="flex justify-between text-slate-700">
              <span>{t('print.itemsSubtotal')}</span>
              <span className="font-semibold">{subtotal.toLocaleString()} {t('common.currency')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>{t('print.discountPct', { n: discountPercent })}:</span>
                <span>-{discountAmount.toLocaleString()} {t('common.currency')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-700">
              <span>{t('print.serviceFeePct', { n: 10 })}:</span>
              <span className="font-semibold">{serviceFee.toLocaleString()} {t('common.currency')}</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-dashed border-slate-400 pt-2.5 mt-1 text-xs font-medium">
            <div className="flex justify-between font-bold text-base text-slate-900 pb-1">
              <span>{t('archive.totalPaid')}</span>
              <span className="text-[#0F172A] text-lg">{grandTotal.toLocaleString()} {t('common.currency')}</span>
            </div>
            {paymentMethod === 'aralash' ? (
              <>
                <div className="flex justify-between text-slate-700">
                  <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> {t('common.cashLabel')}</span>
                  <span className="font-semibold">{(cashAmount ?? Math.round(grandTotal / 2)).toLocaleString()} {t('common.currency')}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {t('common.cardLabel')}</span>
                  <span className="font-semibold">{(cardAmount ?? grandTotal - Math.round(grandTotal / 2)).toLocaleString()} {t('common.currency')}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-700">
                <span>{t('print.payMethod')}:</span>
                <span className="font-semibold uppercase flex items-center gap-1">
                  {paymentMethod === 'karta'
                    ? <><CreditCard className="w-3.5 h-3.5" /> {t('common.card')}</>
                    : <><Banknote className="w-3.5 h-3.5" /> {t('common.cash')}</>}
                </span>
              </div>
            )}
          </div>

          <div className="text-center pt-2 text-xs text-slate-500 font-sans">
            <p className="font-medium">{t('print.thanksVisit')}</p>
            <p className="text-[10px] mt-0.5 text-slate-400">OrderPlus POS v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => {
              onClose();
              onPrint();
            }}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 sm:py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> {t('common.print')}
          </button>
          <button
            onClick={onClose}
            className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 sm:py-2.5 rounded-xl text-xs transition-colors cursor-pointer active:scale-95"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
