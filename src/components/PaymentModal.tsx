import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Check, CreditCard, Delete, PenLine, X } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { splitPayment } from '../lib/payment';
import { CashEntry, entryAmount, presetEntry, pressKey } from '../lib/cashInput';
import { DebtCustomerInfo } from '../types';

interface PaymentModalProps {
  show: boolean;
  tableName: string;
  grandTotal: number;
  /** Yopish — `cash` va `card` yig'indisi har doim `grandTotal` ga teng. */
  onConfirm: (cash: number, card: number) => void;
  onDebt?: (debtInfo: DebtCustomerInfo) => void;
  onClose: () => void;
}

/**
 * To'lov oynasi.
 *
 * To'lov usullari: Naqd, Karta (aralash summa kiritish bilan), yoki Qarzga yopish.
 * Qarz tanlanganda mijoz ma'lumotlari kiritiladigan forma chiqadi va buyurtma
 * qarz usuli bilan yopiladi.
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  tableName,
  grandTotal,
  onConfirm,
  onDebt,
  onClose,
}) => {
  const t = useT();
  const [payMode, setPayMode] = useState<'payment' | 'debt'>('payment');
  /** Naqd maydoni. Terish qoidalari lib/cashInput.ts da. */
  const [entry, setEntry] = useState<CashEntry>(() => presetEntry(grandTotal));

  // Qarz formasi maydonlari
  const [debtName, setDebtName] = useState('');
  const [debtPhone, setDebtPhone] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtNote, setDebtNote] = useState('');

  // Har ochilishda toza boshlanadi: oldingi stolning summasi qolib ketsa,
  // kassir uni sezmay tasdiqlashi mumkin.
  useEffect(() => {
    if (show) {
      setEntry(presetEntry(grandTotal));
      setPayMode('payment');
      setDebtName('');
      setDebtPhone('');
      setDebtDueDate('');
      setDebtNote('');
    }
  }, [show, grandTotal]);

  // Kassir TERGAN summa — chekdan katta ham bo'lishi mumkin.
  const entered = entryAmount(entry);

  // Bo'lish qoidasi lib/payment.ts da — chek ham, server ham shu bitta
  // hisobni ko'rishi uchun. Naqd bu yerda chek summasiga siqiladi.
  const { cash, card, method } = splitPayment(grandTotal, entered);
  const isMixed = method === 'aralash';

  // Chekdan ortiq olingan naqd — qaytim. Uni ko'rsatmasak, kassir 100 000
  // berilgan 70 000 lik chekda maydonda 70 000 ni ko'rib, qaytimni o'zi
  // hisoblashiga to'g'ri kelardi.
  const change = Math.max(0, entered - grandTotal);

  const handleKey = useCallback((key: string) => {
    setEntry((prev) => pressKey(prev, key));
  }, []);

  const confirm = useCallback(() => onConfirm(cash, card), [cash, card, onConfirm]);

  const confirmDebt = useCallback(() => {
    const trimmed = debtName.trim();
    if (!trimmed) return;
    if (onDebt) {
      onDebt({
        name: trimmed,
        phone: debtPhone.trim() || undefined,
        amount: grandTotal,
        dueDate: debtDueDate || undefined,
        note: debtNote.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }
  }, [debtName, debtPhone, debtDueDate, debtNote, grandTotal, onDebt]);

  useEffect(() => {
    if (!show) return;
    if (payMode !== 'payment') {
      const onEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onEsc);
      return () => window.removeEventListener('keydown', onEsc);
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('DEL');
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') confirm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, payMode, handleKey, confirm, onClose]);

  if (!show) return null;

  const money = (n: number) => `${n.toLocaleString()} ${t('common.currency')}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col max-h-[95dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-base">{t('payment.title')}</h2>
            <p className="text-xs text-slate-400 truncate">{tableName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('common.totalUpper')}
            </span>
            <span className="text-xl font-bold text-slate-900">{money(grandTotal)}</span>
          </div>

          {/* To'lov usullari: Naqd, Karta, Qarz */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setPayMode('payment');
                setEntry(presetEntry(grandTotal));
              }}
              className={`h-12 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                payMode === 'payment' && entered === grandTotal
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-4 h-4 shrink-0" />
              <span>{t('common.cash')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPayMode('payment');
                setEntry(presetEntry(0));
              }}
              className={`h-12 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                payMode === 'payment' && entered === 0
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>{t('common.card')}</span>
            </button>
            <button
              type="button"
              onClick={() => setPayMode('debt')}
              className={`h-12 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                payMode === 'debt'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <PenLine className="w-4 h-4 shrink-0" />
              <span>{t('payment.debt')}</span>
            </button>
          </div>

          {payMode === 'payment' ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('payment.cashTaken')}
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">{money(entered)}</span>
                </div>

                {change > 0 ? (
                  <div className="flex items-center justify-between rounded-xl px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-800">
                    <span className="text-xs font-semibold">{t('payment.change')}</span>
                    <span className="text-sm font-bold tabular-nums">{money(change)}</span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                      isMixed
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-xs font-semibold">{t('payment.toCard')}</span>
                    <span className="text-sm font-bold tabular-nums">{money(card)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '000', '0', 'DEL'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKey(k)}
                    className={`h-12 rounded-xl text-base font-bold border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                      k === 'DEL'
                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {k === 'DEL' ? <Delete className="w-4 h-4" /> : k}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2.5 py-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('cart.debtCustomerName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="Masalan: Alisher aka"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('cart.debtCustomerPhone')}
                </label>
                <input
                  type="tel"
                  value={debtPhone}
                  onChange={(e) => setDebtPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('cart.debtDueDate')}
                </label>
                <input
                  type="date"
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('cart.debtNote')}
                </label>
                <input
                  type="text"
                  value={debtNote}
                  onChange={(e) => setDebtNote(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-1">
          {payMode === 'payment' ? (
            <button
              type="button"
              onClick={confirm}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {t('cart.payAndClose')}
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmDebt}
              disabled={!debtName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {t('cart.debtClose')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
