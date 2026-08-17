import React from 'react';
import { Building2 } from 'lucide-react';

interface PinLoginScreenProps {
  pinInput: string;
  pinError: string | null;
  onPinKey: (val: string) => void;
  connectedCafeName?: string;
  onOpenConnect?: () => void;
}

export const PinLoginScreen: React.FC<PinLoginScreenProps> = ({
  pinInput,
  pinError,
  onPinKey,
  connectedCafeName,
  onOpenConnect,
}) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans antialiased text-slate-100 selection:bg-orange-500 selection:text-white">
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="OrderPlus" className="w-10 h-10 object-contain" />
            <h1 className="text-xl font-bold tracking-wider text-white">
              ORDER<span className="text-orange-500">PLUS</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">Offitsiant PIN kodini kiriting</p>

          {connectedCafeName && (
            <button
              onClick={onOpenConnect}
              type="button"
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/80 hover:bg-slate-700 text-orange-400 text-xs font-semibold border border-slate-600 cursor-pointer transition-all"
              title="Kafeni o'zgartirish"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{connectedCafeName}</span>
              <span className="text-[10px] text-slate-400">⚙️</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pinInput.length > i
                  ? 'bg-orange-500 border-orange-500 scale-110 shadow-md shadow-orange-500/50'
                  : 'border-slate-600 bg-slate-700/50'
              }`}
            />
          ))}
        </div>

        {pinError && (
          <div className="text-rose-400 text-xs font-semibold bg-rose-950/50 border border-rose-800/50 px-3 py-1.5 rounded-xl text-center animate-pulse">
            {pinError}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
            <button
              key={key}
              onClick={() => onPinKey(key)}
              className={`h-14 rounded-2xl font-bold text-lg transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                key === 'C'
                  ? 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50 text-sm'
                  : key === 'DEL'
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 text-sm'
                  : 'bg-slate-700/70 hover:bg-slate-700 text-white border border-slate-600/60 hover:border-orange-500/50'
              }`}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>

        <div className="text-center pt-2 border-t border-slate-700/60 w-full flex items-center justify-between">
          <p className="text-[10px] text-slate-400">PIN kodlar Admin panelidan sozlanadi</p>
          {onOpenConnect && (
            <button
              onClick={onOpenConnect}
              type="button"
              className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
            >
              Kafe ulanishi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
