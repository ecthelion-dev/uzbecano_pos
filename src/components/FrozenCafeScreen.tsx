import React from 'react';
import { Lock, RotateCw, ExternalLink } from 'lucide-react';

interface FrozenCafeScreenProps {
  cafeName: string;
  onRefresh: () => void;
}

export const FrozenCafeScreen: React.FC<FrozenCafeScreenProps> = ({ cafeName, onRefresh }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl text-white space-y-5 animate-scaleUp">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <div className="inline-block px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2">
            Muzlatilgan
          </div>
          <h2 className="text-xl font-black text-white">Kassa Vaqtincha Muzlatilgan</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            <strong className="text-white font-semibold">{cafeName}</strong> restorani uchun abonent to'lov muddati yakunlangan.
            Kassani faollashtirish uchun admin panelingizga kiring va to'lovni amalga oshiring.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={onRefresh}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
          >
            <RotateCw className="w-4 h-4" />
            <span>Qayta tekshirish (Yangilash)</span>
          </button>
          <a
            href="https://orderplus.uz/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Admin Panelga O'tish (To'lov Qilish)</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://t.me/orderplus_admin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
          >
            <span>Telegram Qo'llab-quvvatlash</span>
          </a>
        </div>
      </div>
    </div>
  );
};
