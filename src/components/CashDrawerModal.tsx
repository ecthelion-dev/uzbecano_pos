import React, { useState } from 'react';
import { Wallet, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { CashTransaction } from '../types';

interface CashDrawerModalProps {
  show: boolean;
  transactions: CashTransaction[];
  currentWaiterName: string;
  onAddTransaction: (type: 'kirim' | 'chiqim', amount: number, note: string) => void;
  onClose: () => void;
}

export const CashDrawerModal: React.FC<CashDrawerModalProps> = ({
  show,
  transactions,
  currentWaiterName,
  onAddTransaction,
  onClose,
}) => {
  const [type, setType] = useState<'kirim' | 'chiqim'>('chiqim');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const totalKirim = transactions.filter(t => t.type === 'kirim').reduce((sum, t) => sum + t.amount, 0);
  const totalChiqim = transactions.filter(t => t.type === 'chiqim').reduce((sum, t) => sum + t.amount, 0);
  const netCashChange = totalKirim - totalChiqim;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Summani to'g'ri kiriting!");
      return;
    }
    if (!note.trim()) {
      setError("Xarajat yoki kirim sababini kiriting!");
      return;
    }

    onAddTransaction(type, numAmount, note.trim());
    setAmount('');
    setNote('');
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
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Kassa Kirim va Chiqim Harakatlari</h3>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Mayda pul olish, kassa inkasatsiyasi va xarajatlar</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-semibold px-2 cursor-pointer">×</button>
        </div>

        {/* Stats Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
            <p className="text-[11px] font-medium text-emerald-700">Jami Kirim (+)</p>
            <p className="text-base font-bold text-emerald-900 mt-0.5">+{totalKirim.toLocaleString()} so'm</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
            <p className="text-[11px] font-medium text-rose-700">Jami Chiqim (-)</p>
            <p className="text-base font-bold text-rose-900 mt-0.5">-{totalChiqim.toLocaleString()} so'm</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <p className="text-[11px] font-medium text-slate-500">Sof Farq</p>
            <p className={`text-base font-bold mt-0.5 ${netCashChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {netCashChange >= 0 ? '+' : ''}{netCashChange.toLocaleString()} so'm
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-2xl space-y-3">
          <p className="font-bold text-xs text-slate-900">Yangi Harakat Qo'shish</p>

          {error && (
            <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('chiqim')}
              className={`py-3 sm:py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                type === 'chiqim' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" /> Kassa Chiqim (Xarajat)
            </button>
            <button
              type="button"
              onClick={() => setType('kirim')}
              className={`py-3 sm:py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                type === 'kirim' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Kassa Kirim (To'lov)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Summa (masalan: 50000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              placeholder="Sababi (masalan: Mayda pul olish...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
          >
            SAQLASH
          </button>
        </form>

        {/* History */}
        <div className="space-y-2 overflow-y-auto max-h-48 pr-1 shrink-0">
          <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Bugungi Harakatlar Tarixi</h4>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Bugun kassa harakatlari qayd etilmagan</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${t.type === 'kirim' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'kirim'
                        ? <span className="flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" /> KIRIM</span>
                        : <span className="flex items-center gap-1"><MinusCircle className="w-3.5 h-3.5" /> CHIQIM</span>
                      }
                    </span>
                    <span className="font-semibold text-slate-900">{t.note}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {new Date(t.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} • {t.createdBy}
                  </p>
                </div>
                <span className={`font-bold text-sm ${t.type === 'kirim' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {t.type === 'kirim' ? '+' : '-'}{t.amount.toLocaleString()} so'm
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
