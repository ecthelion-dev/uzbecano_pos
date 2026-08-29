import React, { useState } from 'react';
import { Building2, Settings, Check, X } from 'lucide-react';

interface PinLoginScreenProps {
  pinInput: string;
  pinError: string | null;
  currentCafeId: string;
  cafeName?: string;
  onPinKey: (val: string) => void;
  onChangeCafeId: (newCafeId: string) => void;
}

export const PinLoginScreen: React.FC<PinLoginScreenProps> = ({
  pinInput,
  pinError,
  currentCafeId,
  cafeName,
  onPinKey,
  onChangeCafeId,
}) => {
  const [showCafeModal, setShowCafeModal] = useState(false);
  const [inputCafeId, setInputCafeId] = useState(currentCafeId);

  const handleSaveCafe = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCafeId.trim().toLowerCase();
    if (clean) {
      onChangeCafeId(clean);
      setShowCafeModal(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-4 py-[calc(1rem+env(safe-area-inset-top))] font-sans antialiased text-slate-100 selection:bg-orange-500 selection:text-white">
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-5 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-5 sm:gap-6 relative">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center w-full">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="OrderPlus" className="w-10 h-10 object-contain" />
            <h1 className="text-xl font-bold tracking-wider text-white">
              ORDER<span className="text-orange-500">PLUS</span>
            </h1>
          </div>

          {/* Current Cafe Badge */}
          <button
            onClick={() => {
              setInputCafeId(currentCafeId);
              setShowCafeModal(true);
            }}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-[11px] font-medium border border-slate-600/70 transition-all cursor-pointer group"
          >
            <Building2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="truncate max-w-[170px]">{cafeName || currentCafeId}</span>
            <Settings className="w-3 h-3 text-slate-400 group-hover:text-orange-400 transition-colors ml-0.5" />
          </button>

          <p className="text-xs text-slate-400 font-medium mt-1">Offitsiant PIN kodini kiriting</p>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex items-center justify-center gap-4 py-1">
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

        {/* Error Alert */}
        {pinError && (
          <div className="text-rose-400 text-xs font-semibold bg-rose-950/50 border border-rose-800/50 px-3 py-1.5 rounded-xl text-center animate-pulse w-full">
            {pinError}
          </div>
        )}

        {/* 0-9 Numpad */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
            <button
              key={key}
              onClick={() => onPinKey(key)}
              className={`h-16 sm:h-14 rounded-2xl font-bold text-lg transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
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

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-700/60 w-full flex items-center justify-between text-[11px] text-slate-400">
          <span>OrderPlus POS</span>
          <button
            onClick={() => {
              setInputCafeId(currentCafeId);
              setShowCafeModal(true);
            }}
            className="text-orange-400 hover:text-orange-300 underline cursor-pointer text-[10px]"
          >
            Kafeni o'zgartirish
          </button>
        </div>
      </div>

      {/* Change Cafe Modal */}
      {showCafeModal && (
        <div
          onClick={() => setShowCafeModal(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Building2 className="w-5 h-5 text-orange-500" />
                <span>Kafe / Filialni sozlash</span>
              </div>
              <button
                onClick={() => setShowCafeModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCafe} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Kafe ID (slug):
                </label>
                <input
                  type="text"
                  value={inputCafeId}
                  onChange={(e) => setInputCafeId(e.target.value)}
                  placeholder="masalan: uzbecano, safia"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none transition-colors"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Admin panelda ro'yxatdan o'tgan kafe identifikatorini kiriting.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCafeModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
