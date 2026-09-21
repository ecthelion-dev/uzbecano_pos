import React, { useState, useEffect } from 'react';
import { PenLine, X, User, Phone, Calendar, FileText, AlertCircle, Trash2, Check } from 'lucide-react';
import { DebtCustomerInfo } from '../types';
import { useT } from '../lib/i18n/LanguageProvider';

interface DebtCustomerModalProps {
  show: boolean;
  tableName: string;
  grandTotal: number;
  items: Array<{ name: string; quantity: number; price: number; note?: string }>;
  currentDebtCustomer?: DebtCustomerInfo | null;
  onSave: (customer: DebtCustomerInfo) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const DebtCustomerModal: React.FC<DebtCustomerModalProps> = ({
  show,
  tableName,
  grandTotal,
  items,
  currentDebtCustomer,
  onSave,
  onRemove,
  onClose,
}) => {
  const t = useT();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(grandTotal);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      if (currentDebtCustomer) {
        setName(currentDebtCustomer.name || '');
        setPhone(currentDebtCustomer.phone || '');
        setAmount(currentDebtCustomer.amount ?? grandTotal);
        setDueDate(currentDebtCustomer.dueDate || '');
        setNote(currentDebtCustomer.note || '');
      } else {
        setName('');
        setPhone('');
        setAmount(grandTotal);
        setDueDate('');
        setNote('');
      }
      setError(null);
    }
  }, [show, currentDebtCustomer, grandTotal]);

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('cart.debtRequiredName'));
      return;
    }
    const finalAmount = Number(amount) > 0 ? Number(amount) : grandTotal;
    onSave({
      name: name.trim(),
      phone: phone.trim() || undefined,
      amount: finalAmount,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
      createdAt: currentDebtCustomer?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-7 max-w-lg w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600 shadow-sm shrink-0">
              <PenLine className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-xl text-slate-900 tracking-tight">
                {t('cart.debtCustomerTitle')}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {tableName} • {grandTotal.toLocaleString()} {t('common.currency')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="text-rose-700 text-xs sm:text-sm font-semibold bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Mijoz ismi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('cart.debtCustomerName')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t('cart.debtHint')}
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:border-amber-500 focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Telefon raqami */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('cart.debtCustomerPhone')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:border-amber-500 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Qarz summasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('cart.debtAmount')} ({t('common.currency')})
              </label>
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder={String(grandTotal)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-bold focus:bg-white focus:border-amber-500 focus:outline-hidden transition-colors tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* To'lash muddati */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('cart.debtDueDate')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:border-amber-500 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Izoh */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('cart.debtNote')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:border-amber-500 focus:outline-hidden transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Qarzga yozilayotgan mahsulotlar ro'yxati */}
          {items && items.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                {t('cart.debtItems')}
              </p>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 max-h-36 overflow-y-auto space-y-1.5">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-800 font-medium truncate pr-2">
                      {item.name} <span className="text-slate-500">×{item.quantity}</span>
                    </span>
                    <span className="text-slate-900 font-bold shrink-0 tabular-nums">
                      {((item.price || 0) * (item.quantity || 1)).toLocaleString()} {t('common.currency')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Check className="w-4 h-4" /> {t('cart.debtSave')}
            </button>
            {currentDebtCustomer && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> {t('cart.debtRemove')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer active:scale-95"
            >
              {t('common.close')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
