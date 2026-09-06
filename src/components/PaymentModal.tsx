import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Check, CreditCard, Delete, X } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { splitPayment } from '../lib/payment';

interface PaymentModalProps {
  show: boolean;
  tableName: string;
  grandTotal: number;
  /** Yopish — `cash` va `card` yig'indisi har doim `grandTotal` ga teng. */
  onConfirm: (cash: number, card: number) => void;
  onClose: () => void;
}

/**
 * To'lov oynasi.
 *
 * Ilgari to'lov turi savat panelida uchta tugma bilan OLDINDAN tanlanardi:
 * "Naqd", "Karta", "Aralash". Ikkita muammosi bor edi. Birinchisi — tanlov
 * hisob yig'ilayotgan paytda, ya'ni hali pul olinmagan paytda qilinardi va
 * kassir uni yopish oldidan qayta tekshirmasdi. Ikkinchisi — "Aralash"
 * alohida rejim edi: kassir uni tanlab, keyin ikkita maydonni to'ldirardi.
 *
 * Endi tur UMUMAN tanlanmaydi — u SUMMADAN kelib chiqadi. Kassir naqd
 * qancha olganini yozadi, qolgani o'zi kartaga o'tadi:
 *
 *   naqd = jami  → "naqd"
 *   naqd = 0     → "karta"
 *   oraliqda     → "aralash"
 *
 * Shuning uchun "Aralash" tugmasi yo'q: aralash to'lov — alohida rejim
 * emas, shunchaki to'liq bo'lmagan naqd.
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  tableName,
  grandTotal,
  onConfirm,
  onClose,
}) => {
  const t = useT();
  /** Naqd summasi, matn ko'rinishida. Bo'sh — hali hech narsa terilmagan. */
  const [cashInput, setCashInput] = useState<string>('');

  // Har ochilishda toza boshlanadi: oldingi stolning summasi qolib ketsa,
  // kassir uni sezmay tasdiqlashi mumkin.
  useEffect(() => {
    if (show) setCashInput(String(grandTotal));
  }, [show, grandTotal]);

  // Bo'lish qoidasi lib/payment.ts da — chek ham, server ham shu bitta
  // hisobni ko'rishi uchun.
  const { cash, card, method } = splitPayment(grandTotal, Number(cashInput));
  const isMixed = method === 'aralash';

  const handleKey = useCallback((key: string) => {
    setCashInput((prev) => {
      if (key === 'C') return '';
      if (key === 'DEL') return prev.slice(0, -1);
      if (key === '000' || key === '00') return prev ? prev + key : prev;
      if (prev.length >= 10) return prev;
      // Boshidagi keraksiz nol yig'ilib qolmasin: "0" dan keyin raqam
      // terilsa, u o'rnini bosadi.
      return prev === '0' ? key : prev + key;
    });
  }, []);

  const confirm = useCallback(() => onConfirm(cash, card), [cash, card, onConfirm]);

  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('DEL');
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') confirm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, handleKey, confirm, onClose]);

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

          {/*
            To'liq to'lovning ikki holati — bir bosishda. Bular rejim emas,
            shunchaki naqd maydonini to'ldirish yo'li: "Karta" naqdni nolga
            tushiradi, "Naqd" esa jami summaga ko'taradi.
          */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCashInput(String(grandTotal))}
              className={`py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                cash === grandTotal
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-4 h-4" /> {t('common.cash')}
            </button>
            <button
              onClick={() => setCashInput('0')}
              className={`py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                cash === 0
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" /> {t('common.card')}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {t('payment.cashTaken')}
              </span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">{money(cash)}</span>
            </div>

            {/*
              Qolgan summa har doim ko'rinib turadi — aralash to'lovda ham,
              to'liq naqdda ham. Kassir "kartaga qancha o'tdi" degan savolga
              hisoblab emas, qarab javob berishi kerak.
            */}
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
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '000', '0', 'DEL'].map((k) => (
              <button
                key={k}
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
        </div>

        <div className="px-4 pb-4 pt-1">
          <button
            onClick={confirm}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> {t('cart.payAndClose')}
          </button>
        </div>
      </div>
    </div>
  );
};
