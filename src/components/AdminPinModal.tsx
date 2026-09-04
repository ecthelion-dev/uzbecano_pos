import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../constants';
import { verifyCachedPin } from '../lib/offlineAuth';
import { useT } from '../lib/i18n/LanguageProvider';

const ELEVATED_ROLES = ['admin', 'cafe_admin', 'platform_admin', 'manager'];

interface AdminPinModalProps {
  show: boolean;
  cafeId: string;
  title?: string;
  /**
   * Tasdiqlangan amal. Rahbarning sessiya tokeni bilan chaqiriladi — chaqiruvchi
   * uni serverga `X-Approval-Token` sifatida yuboradi, aks holda backend bu
   * amalni oddiy ofitsiantning o'zboshimchaligidan ajrata olmaydi.
   */
  onConfirm: (approvalToken?: string) => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  show,
  cafeId,
  title,
  onConfirm,
  onClose,
}) => {
  const t = useT();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!show) return null;

  const handleKey = async (val: string) => {
    if (checking) return;
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
        // Manager/admin-level PIN is verified live against the server whenever
        // there is one. Offline the only fallback is a PBKDF2 hash cached on
        // this till when that manager last signed in here — a regular waiter's
        // own PIN still cannot self-approve the overrides this modal gates.
        setChecking(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: nextPin, cafeId }),
          });
          const data = await res.json().catch(() => ({} as any));
          const isValid = res.ok && data.success && ELEVATED_ROLES.includes(String(data.role || '').toLowerCase());
          if (isValid) {
            // approvalToken — shu amal uchun beriladigan qisqa muddatli token.
            // Eski serverda u yo'q, shuning uchun sessiya tokeni zaxira.
            onConfirm(data.approvalToken || data.token);
            setPin('');
            onClose();
          } else {
            setError(t('admin.pinWrong'));
            setTimeout(() => setPin(''), 400);
          }
        } catch {
          // Server yo'q. Shu qurilmada oldin kirgan rahbarning keshdagi PIN
          // hashi bilan tekshiramiz — oddiy ofitsiantning kodi qabul
          // qilinmaydi, ya'ni u o'z vozvratini o'zi tasdiqlay olmaydi.
          let result = null;
          try {
            result = await verifyCachedPin(cafeId, nextPin, { requireElevated: true });
          } catch { /* WebCrypto yo'q */ }

          if (result && result.status === 'ok') {
            // Keshdagi rahbar tokeni. Navbatga qo'yilgan so'rov aloqa
            // tiklanganda shu token bilan ketadi; muddati o'tgan bo'lsa
            // server uni rad etadi va amal jurnalda tasdiqsiz qolmaydi.
            onConfirm(result.token);
            setPin('');
            onClose();
          } else if (result && result.status === 'locked') {
            const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
            setError(`Ko'p marta xato kiritildi. ${minutes} daqiqadan keyin urinib ko'ring`);
            setTimeout(() => setPin(''), 1200);
          } else {
            setError("Aloqa yo'q. Faqat shu kassada kirgan rahbar PIN kodi qabul qilinadi");
            setTimeout(() => setPin(''), 900);
          }
        } finally {
          setChecking(false);
        }
      }
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 sm:p-6 max-w-xs w-full shadow-2xl flex flex-col items-center gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-rose-600">
            <Lock className="w-4 h-4" />
            <h3 className="font-bold text-xs text-slate-900">{t('admin.pinTitle')}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-semibold">×</button>
        </div>

        <p className="text-xs text-slate-600 font-medium text-center">{title ?? t('admin.pinDefault')}</p>

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

        <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] sm:max-w-[220px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
            <button
              key={key}
              disabled={checking}
              onClick={() => handleKey(key)}
              className={`h-14 sm:h-11 rounded-xl font-semibold text-base transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
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
