import React from 'react';
import {
  ShoppingBag,
  X,
  Send,
  CheckCircle2,
  Printer,
  Shuffle,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { CartItem } from '../types';
import { CartItemRow } from './CartItemRow';
import { KitchenItemRow } from './KitchenItemRow';
import { useT } from '../lib/i18n/LanguageProvider';

interface POSCartSidebarProps {
  selectedTable: string;
  activeTableOrderItems: any[];
  cart: CartItem[];
  onRemoveKitchenItem: (index: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNote: (productId: string, note: string) => void;
  paymentMethod: 'naqd' | 'karta' | 'aralash';
  onSelectPaymentMethod: (pm: 'naqd' | 'karta' | 'aralash') => void;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  serviceFeePercent: number;
  serviceFee: number;
  grandTotal: number;
  onSendToKitchen: () => void;
  onCloseTable: () => void;
  onOpenReceiptPreview: () => void;
  onOpenTableMove: () => void;
  /* Telefonda savat pastdan chiquvchi panel bo'lib ochiladi — uni yopish uchun. */
  onCloseMobile?: () => void;
}

export const POSCartSidebar: React.FC<POSCartSidebarProps> = ({
  selectedTable,
  activeTableOrderItems,
  cart,
  onRemoveKitchenItem,
  onUpdateQuantity,
  onUpdateNote,
  paymentMethod,
  onSelectPaymentMethod,
  subtotal,
  discountPercent,
  discountAmount,
  serviceFeePercent,
  serviceFee,
  grandTotal,
  onSendToKitchen,
  onCloseTable,
  onOpenReceiptPreview,
  onOpenTableMove,
  onCloseMobile,
}) => {
  const t = useT();
  return (
    <div className="w-full lg:w-[435px] shrink-0 bg-white text-slate-900 rounded-t-3xl lg:rounded-2xl p-3.5 sm:p-5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:pb-5 flex flex-col shadow-[0_-8px_30px_rgba(15,23,42,0.25)] lg:shadow-md border border-slate-200 max-h-[88dvh] lg:max-h-none lg:h-[calc(100vh-120px)] overflow-hidden animate-slideUp lg:animate-none">
      {/* Drawer tutqichi — telefonda varaq pastdan chiqqanini bildiradi */}
      <div className="lg:hidden mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-slate-300 shrink-0" />
      <div className="flex items-center justify-between gap-2 pb-3 sm:pb-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden w-9 h-9 -ml-1 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:scale-95 transition-transform"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-bold text-sm text-slate-900 truncate">{t('cart.receipt')}</h2>
        </div>
        <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm shrink-0">
          {selectedTable}
        </span>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3 pr-1.5">
        {activeTableOrderItems.length === 0 && cart.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-medium">{t('cart.empty')}</p>
            <p className="text-[10px] text-slate-400 mt-1">{t('cart.emptyHint')}</p>
          </div>
        ) : (
          <>
            {/* Already Sent Items */}
            {activeTableOrderItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-orange-600 tracking-wider uppercase">
                    {t('cart.sentItems')}
                  </p>
                </div>
                {activeTableOrderItems.map((item: any, idx: number) => (
                  <KitchenItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    onRemove={onRemoveKitchenItem}
                  />
                ))}
              </div>
            )}

            {/* New Draft Items */}
            {cart.length > 0 && (
              <div className="space-y-2 pt-1">
                {activeTableOrderItems.length > 0 && (
                  <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase border-t border-slate-100 pt-2">
                    {t('cart.newItems')}
                  </p>
                )}
                {cart.map((item) => (
                  <CartItemRow
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onUpdateNote={onUpdateNote}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Calculations & Discounts */}
      <div className="pt-3 border-t border-slate-200 space-y-2 shrink-0">
        {/* Payment Method Selector */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{t('cart.paymentType')}</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'naqd', label: t('common.cash'), icon: <Banknote className="w-4 h-4" /> },
              { id: 'karta', label: t('common.card'), icon: <CreditCard className="w-4 h-4" /> },
              { id: 'aralash', label: t('common.mixed'), icon: <Shuffle className="w-4 h-4" /> },
            ].map((pm) => (
              <button
                key={pm.id}
                onClick={() => onSelectPaymentMethod(pm.id as any)}
                className={`py-3 sm:py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  paymentMethod === pm.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {pm.icon}
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between text-xs text-slate-500 font-medium pt-1">
          <span>{t('cart.itemsTotal')}</span>
          <span className="text-slate-900 font-medium">{subtotal.toLocaleString()} {t('common.currency')}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 font-semibold">
            <span>Chegirma ({discountPercent}%):</span>
            <span>-{discountAmount.toLocaleString()} {t('common.currency')}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>{t('cart.serviceFee', { p: serviceFeePercent })}</span>
          <span className="text-slate-900 font-medium">{serviceFee.toLocaleString()} {t('common.currency')}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
          <span>{t('common.totalUpper')}</span>
          <span className="text-[#0F172A] text-lg">{grandTotal.toLocaleString()} {t('common.currency')}</span>
        </div>

        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSendToKitchen()}
              disabled={cart.length === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold p-2 rounded-2xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex flex-col items-center justify-center text-center gap-1 cursor-pointer h-16 sm:h-16"
            >
              <Send className="w-4 h-4" />
              <span>{t('cart.sendToKitchen')}</span>
            </button>

            <button
              onClick={() => onCloseTable()}
              disabled={activeTableOrderItems.length === 0 && cart.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold p-2 rounded-2xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex flex-col items-center justify-center text-center gap-1 cursor-pointer h-16 sm:h-16"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('cart.payAndClose')}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onOpenReceiptPreview}
              disabled={activeTableOrderItems.length === 0 && cart.length === 0}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold py-3 sm:py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-500" /> {t('cart.printReceipt')}
            </button>
            <button
              onClick={onOpenTableMove}
              disabled={activeTableOrderItems.length === 0}
              className="bg-orange-50 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed text-orange-700 font-semibold py-3 sm:py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-orange-200 transition-colors cursor-pointer active:scale-95"
            >
              <Shuffle className="w-4 h-4 text-orange-600" /> {t('cart.moveTable')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
