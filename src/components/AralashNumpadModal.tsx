import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, CreditCard, X, Check, Delete } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';

interface AralashNumpadModalProps {
  show: boolean;
  activeField: 'cash' | 'card';
  grandTotal: number;
  initialCash: number;
  initialCard: number;
  onSave: (cash: number, card: number) => void;
  onClose: () => void;
}

export const AralashNumpadModal: React.FC<AralashNumpadModalProps> = ({
  show,
  activeField: initialActiveField,
  grandTotal,
  initialCash,
  initialCard,
  onSave,
  onClose,
}) => {
  const t = useT();
  const [selectedField, setSelectedField] = useState<'cash' | 'card'>(initialActiveField);
  const [inputVal, setInputVal] = useState<string>('');

  useEffect(() => {
    if (show) {
      setSelectedField(initialActiveField);
      const val = initialActiveField === 'cash' ? initialCash : initialCard;
      setInputVal(val > 0 ? val.toString() : '');
    }
  }, [show, initialActiveField, initialCash, initialCard]);

  // Only auto-fill other field when user has explicitly entered something
  const hasInput = inputVal !== '' && inputVal !== '0';
  const currentNum = Math.max(0, Math.min(grandTotal, Number(inputVal) || 0));
  const otherNum = hasInput ? Math.max(0, grandTotal - currentNum) : 0;

  const cashAmount = selectedField === 'cash' ? currentNum : otherNum;
  const cardAmount = selectedField === 'card' ? currentNum : otherNum;

  const handleKey = useCallback((key: string) => {
    setInputVal((prev) => {
      if (key === 'C') return '';
      if (key === 'DEL') return prev.slice(0, -1);
      if (key === '000') return prev ? prev + '000' : '';
      if (key === '00') return prev ? prev + '00' : '';
      if (prev.length >= 10) return prev;
      return prev + key;
    });
  }, []);

  const handleQuick = (amt: number) => {
    const num = Math.max(0, Math.min(grandTotal, amt));
    setInputVal(num.toString());
  };

  const handleFieldSwitch = (field: 'cash' | 'card') => {
    if (field === selectedField) return;
    setSelectedField(field);
    const val = field === 'cash' ? cashAmount : cardAmount;
    setInputVal(val > 0 ? val.toString() : '');
  };

  const handleConfirm = () => {
    onSave(cashAmount, cardAmount);
    onClose();
  };

  // Keyboard events
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
      } else if (e.key === 'Backspace') {
        handleKey('DEL');
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, handleKey, cashAmount, cardAmount]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-t-3xl sm:rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-100 animate-scaleUp max-h-[92dvh] pb-[env(safe-area-inset-bottom)] sm:pb-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{t('mixed.title')}</h3>
            <p className="text-xs text-slate-500 font-medium">{t('mixed.totalDue')} <span className="font-semibold text-slate-900">{grandTotal.toLocaleString()} {t('common.currency')}</span></p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-3 bg-slate-100/70 grid grid-cols-2 gap-2 border-b border-slate-200/60">
          <button
            type="button"
            onClick={() => handleFieldSwitch('cash')}
            className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedField === 'cash'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>{t('common.cashLabel')} {cashAmount.toLocaleString()}</span>
          </button>

          <button
            type="button"
            onClick={() => handleFieldSwitch('card')}
            className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedField === 'card'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{t('common.cardLabel')} {cardAmount.toLocaleString()}</span>
          </button>
        </div>

        {/* Display */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-center space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {selectedField === 'cash' ? `💵 ${t('mixed.cashAmount')}` : `💳 ${t('mixed.cardAmount')}`}
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {currentNum.toLocaleString()} <span className="text-sm font-semibold text-slate-500">{t('common.currency')}</span>
          </div>
          <div className="text-xs font-semibold text-slate-600">
            {selectedField === 'cash' ? t('mixed.viaCard') : t('mixed.viaCash')}{' '}
            <span className="font-bold text-blue-700">
              {otherNum.toLocaleString()} {t('common.currency')}
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="px-3 pt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleQuick(Math.round(grandTotal / 2))}
            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold px-3 py-2 rounded-md shrink-0 transition-colors active:scale-95"
          >
            50% / 50%
          </button>
          <button
            type="button"
            onClick={() => handleQuick(grandTotal)}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-md shrink-0 transition-colors"
          >
            {t('mixed.full')}
          </button>
          {[10000, 20000, 50000, 100000, 200000].map((amt) => (
            amt < grandTotal && (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuick(amt)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-md shrink-0 transition-colors"
              >
                {(amt / 1000)}k
              </button>
            )
          ))}
        </div>

        {/* Touch Keypad */}
        <div className="p-3 grid grid-cols-4 gap-1.5">
          {['1', '2', '3'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleKey(d)}
              className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold py-4 sm:py-3 rounded-lg text-base transition-all active:scale-95 cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKey('DEL')}
            className="bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 font-bold py-4 sm:py-3 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>

          {['4', '5', '6'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleKey(d)}
              className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold py-4 sm:py-3 rounded-lg text-base transition-all active:scale-95 cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKey('C')}
            className="bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-800 font-bold py-4 sm:py-3 rounded-lg text-sm transition-all active:scale-95 cursor-pointer"
          >
            C
          </button>

          {['7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleKey(d)}
              className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold py-4 sm:py-3 rounded-lg text-base transition-all active:scale-95 cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleConfirm}
            className="row-span-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 rounded-lg text-sm shadow-md shadow-emerald-600/30 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-6 h-6" />
            <span className="text-xs">{t('mixed.ready')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleKey('0')}
            className="col-span-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold py-4 sm:py-3 rounded-lg text-base transition-all active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleKey('000')}
            className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-4 sm:py-3 rounded-lg text-xs transition-all active:scale-95 cursor-pointer"
          >
            000
          </button>
        </div>
      </div>
    </div>
  );
};
