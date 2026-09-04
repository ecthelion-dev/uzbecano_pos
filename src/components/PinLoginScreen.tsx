import React, { useState } from 'react';
import { Building2, Settings, Check, X } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';

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
  const t = useT();
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
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col items-center justify-center p-4 py-[calc(1rem+env(safe-area-inset-top))] font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      {/*
        * Kartochka yo'q: na fon, na chegara, na soya.
        *
        * Oq to'rtburchak oq doiralarni o'rab turardi va ikkalasi bir xil
        * rangda bo'lgani uchun chegarasi shunchaki qo'shimcha chiziq bo'lib
        * ko'rinardi. Endi doiralar to'g'ridan-to'g'ri `slate-100` fonda
        * turadi — ular bilan fon orasidagi farq oq ustidagidan kattaroq,
        * ya'ni tugmalar aslida yaxshiroq ajraladi.
        *
        * `p-5` qoladi: u endi ko'rinmaydigan qutining ichki chekkasi emas,
        * tor telefonda kontentni ekran chetiga yopishtirmaydigan oraliq.
        */}
      <div className="p-5 max-w-[288px] w-full flex flex-col items-center gap-3.5 relative">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center w-full">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="OrderPlus" className="w-9 h-9 object-contain" />
            <h1 className="text-lg font-bold tracking-wider text-slate-900">
              ORDER<span className="text-orange-500">PLUS</span>
            </h1>
          </div>

          {/* Current Cafe Badge */}
          <button
            onClick={() => {
              setInputCafeId(currentCafeId);
              setShowCafeModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-full text-[11px] font-medium border border-slate-200 transition-all cursor-pointer group"
          >
            <Building2 className="w-3.5 h-3.5 text-orange-500" />
            <span className="truncate max-w-[170px]">{cafeName || currentCafeId}</span>
            <Settings className="w-3 h-3 text-slate-400 group-hover:text-orange-500 transition-colors ml-0.5" />
          </button>

          <p className="text-xs text-slate-500 font-medium">{t('login.pinPrompt')}</p>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex items-center justify-center gap-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pinInput.length > i
                  ? 'bg-orange-500 border-orange-500 scale-110'
                  : 'border-slate-300 bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* Error Alert */}
        {pinError && (
          <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-center animate-pulse w-full">
            {pinError}
          </div>
        )}

        {/*
          * Raqamlar — to'liq doira.
          *
          * `aspect-square` bo'lmasa balandlik qat'iy, eni esa katakdan
          * kelardi: `rounded-full` o'shanda doira emas, yonboshiga cho'zilgan
          * tabletka chiqarardi. Endi ikkalasi tenglashadi va shakl ekran
          * kengligidan qat'i nazar doira bo'lib qoladi.
          *
          * Yon tomoni ~72px.
          *
          * Bir vaqtlar 85px edi va o'shanda klaviatura kartochkaning 58%
          * balandligini egallardi — jami 635px, noutbuk ekraniga zo'rg'a
          * sig'adigan darajada. Keyin 64px ga tushirildi, endi esa 72px:
          * kartochkaning kengligi o'zgarmaydi, chunki ichida bo'sh joy bor
          * edi. To'rt qator bo'lgani uchun bu yerdagi har bir piksel
          * balandlikda to'rt marta hisoblanadi — shuning uchun o'lcham
          * o'zgarishi shu bitta sondan boshqariladi.
          */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[236px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
            <button
              key={key}
              onClick={() => onPinKey(key)}
              className={`aspect-square rounded-full font-bold text-xl transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                key === 'C'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-sm'
                  : key === 'DEL'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-orange-400'
              }`}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-3 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-500">
          <span>OrderPlus POS</span>
          <button
            onClick={() => {
              setInputCafeId(currentCafeId);
              setShowCafeModal(true);
            }}
            className="text-orange-600 hover:text-orange-700 underline cursor-pointer text-[10px]"
          >
            {t('login.changeCafe')}
          </button>
        </div>
      </div>

      {/* Change Cafe Modal */}
      {showCafeModal && (
        <div
          onClick={() => setShowCafeModal(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Building2 className="w-5 h-5 text-orange-500" />
                <span>{t('login.cafeSetup')}</span>
              </div>
              <button
                onClick={() => setShowCafeModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCafe} className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1.5">
                  {t('login.cafeIdLabel')}
                </label>
                <input
                  type="text"
                  value={inputCafeId}
                  onChange={(e) => setInputCafeId(e.target.value)}
                  placeholder={t('login.cafePlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none transition-colors"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {t('login.cafeIdHint')}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCafeModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('common.save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
