import React, { useState } from 'react';
import { Wallet, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { CashTransaction } from '../types';
import { useT } from '../lib/i18n/LanguageProvider';
import { cashCategoryLabel, normalizeCategory, MAX_CATEGORY_LENGTH } from '../lib/cashCategories';
import { amountValue, digitsOnly, formatAmount } from '../lib/amountInput';

interface CashDrawerModalProps {
  show: boolean;
  transactions: CashTransaction[];
  /** Ilgari ishlatilgan turkum nomlari — tugma bo'lib chiqadi. */
  knownCategories: string[];
  currentWaiterName: string;
  onAddTransaction: (category: string, amount: number, note: string) => void;
  onClose: () => void;
}

export const CashDrawerModal: React.FC<CashDrawerModalProps> = ({
  show,
  transactions,
  knownCategories,
  currentWaiterName,
  onAddTransaction,
  onClose,
}) => {
  const t = useT();
  // Nomni kassirning o'zi yozadi. Turkumsiz yozuvdan bir oydan keyin foyda
  // yo'q: "sutga qancha ketdi" degan savolga izohlarni jamlab javob berib
  // bo'lmaydi, shuning uchun maydon majburiy.
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  /*
   * Faqat chiqim. "Kirim" tugmasi olib tashlandi: kassaga pul savdodan
   * tushadi, ya'ni uni alohida yozib borish o'sha pulni ikki marta sanash
   * bo'lardi.
   */
  const totalChiqim = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = amountValue(amount);
    if (!numAmount || numAmount <= 0) {
      setError(t('drawer.amountInvalid'));
      return;
    }
    const cleanCategory = normalizeCategory(category);
    if (!cleanCategory) {
      setError(t('drawer.needCategory'));
      return;
    }

    onAddTransaction(cleanCategory, numAmount, note.trim());
    setAmount('');
    setNote('');
    // Turkum ATAYLAB tozalanmaydi: ketma-ket bir nechta xarajat kiritilganda
    // ular ko'pincha bir xil turkumda bo'ladi.
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 max-w-lg w-full shadow-2xl flex flex-col gap-3 sm:gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">{t('drawer.title')}</h3>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">{t('drawer.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-semibold px-2 cursor-pointer">×</button>
        </div>

        {/* Bugun kassadan qancha olingani */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-rose-700">{t('drawer.totalExpense')}</p>
          <p className="text-lg font-bold text-rose-900 tabular-nums">
            −{totalChiqim.toLocaleString()} {t('common.currency')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-2xl space-y-3">
          <p className="font-bold text-xs text-slate-900">{t('drawer.addMovement')}</p>

          {error && (
            <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          {/*
            Turkum nomi qo'lda yoziladi. Ilgari beshta qat'iy tugma bor edi
            va ro'yxatga tushmagan xarajat "Boshqa" ga yig'ilardi — ya'ni
            "nimaga ketdi" degan savol aynan o'sha yerda javobsiz qolardi.
          */}
          <input
            type="text"
            maxLength={MAX_CATEGORY_LENGTH}
            placeholder={t('drawer.categoryPlaceholder')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
          />

          {/*
            Ilgari yozilgan nomlar — bir bosishda. Har safar qaytadan terish
            "Sut" va "sut oldik" degan ikkita turkum hosil qilardi va oylik
            jamlanma ikkiga bo'linib ketardi.
          */}
          {knownCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {knownCategories.slice(0, 12).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer active:scale-95 ${
                    normalizeCategory(category).toLocaleLowerCase() === name.toLocaleLowerCase()
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/*
              Matn maydoni, raqam maydoni emas. `type="number"` da sichqoncha
              g'ildiragi qiymatni o'zgartiradi — kassir ro'yxatni aylantirmoqchi
              bo'lib maydon ustidan o'tsa, summa jimgina boshqa bo'lib qolardi.
              `inputMode` telefonda baribir raqam klaviaturasini ochadi.
            */}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={formatAmount(amount)}
                onChange={(e) => setAmount(digitsOnly(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-14 py-2.5 text-lg font-bold tabular-nums text-slate-900 placeholder:text-slate-300 placeholder:font-semibold focus:outline-none focus:border-orange-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                {t('common.currency')}
              </span>
            </div>
            <input
              type="text"
              placeholder={t('drawer.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/*
            Tugmaning o'zi qancha saqlanishini aytadi. Summa maydonda
            terilib, tasdiqlash boshqa joyda bo'lsa, ortiqcha nol
            saqlanganidan keyin ko'zga tashlanardi.
          */}
          <button
            type="submit"
            disabled={amountValue(amount) <= 0 || !normalizeCategory(category)}
            className="w-full font-bold py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white"
          >
            {amountValue(amount) > 0 && normalizeCategory(category)
              ? `${normalizeCategory(category)} · −${formatAmount(amount)} ${t('common.currency')}`
              : t('common.save')}
          </button>
        </form>

        {/* History */}
        <div className="space-y-2 overflow-y-auto max-h-48 pr-1 shrink-0">
          <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">{t('drawer.todayHistory')}</h4>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">{t('drawer.empty')}</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-rose-600 flex items-center gap-1">
                      <MinusCircle className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold text-slate-900">
                      {cashCategoryLabel((tx as any).category || '')}
                    </span>
                    {tx.note && <span className="text-slate-500">· {tx.note}</span>}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {new Date(tx.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} • {tx.createdBy}
                  </p>
                </div>
                <span className="font-bold text-sm text-rose-700 tabular-nums">
                  −{tx.amount.toLocaleString()} {t('common.currency')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
