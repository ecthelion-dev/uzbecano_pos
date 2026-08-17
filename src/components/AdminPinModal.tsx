import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { DBWaiter } from '../types';

interface AdminPinModalProps {
  show: boolean;
  waiters: DBWaiter[];
  title?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  show,
  waiters,
  title = "Tasdiqlash uchun PIN kodni kiriting",
  onConfirm,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const handleKey = (val: string) => {
    setError(null);
    if (val === 'C') {
      setPin('');
      return;
    }
    if (val === 'DEL') {
      setPin(prev => prev.slice(0, -1));
      return;
    }
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4) {
        // Admin PIN (0000) or any valid staff PIN
        const isValid = nextPin === '0000' || waiters.some(w => String(w.pinCode).trim() === nextPin);
        if (isValid) {
          onConfirm();
          setPin('');
          onClose();
        } else {
          setError("PIN kod noto'g'ri!");
          setTimeout(() => setPin(''), 400);
        }
      }
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl flex flex-col items-center gap-4 border border-slate-200">
        <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-rose-600">
            <Lock className="w-4 h-4" />
            <h3 className="font-bold text-xs text-slate-900">Xavfsizlik Tasdig'i</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-semibold">×</button>
        </div>

        <p className="text-xs text-slate-600 font-medium text-center">{title}</p>

        <div className="flex items-center justify-center gap-3 py-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > i
                  ? 'bg-rose-500 border-rose-500 scale-110'
                  : 'border-slate-300 bg-slate-100'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 w-full max-w-[220px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`h-11 rounded-xl font-semibold text-base transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                key === 'C'
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 text-xs'
                  : key === 'DEL'
                  ? 'bg-slate-100 text-slate-700 border border-slate-200 text-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200'
              }`}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
