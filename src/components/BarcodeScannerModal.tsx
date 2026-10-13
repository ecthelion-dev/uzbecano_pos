import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import type { TranslationKey } from '../lib/i18n/dictionaries/uz';
import { cameraErrorKey } from './QrScannerModal';

/** Kadrlar orasidagi tanaffus — har kadrni o'qish sekin kassada protsessorni band qiladi. */
const SCAN_INTERVAL_MS = 150;

/**
 * Bir xil kod shuncha vaqt ichida qayta xabar qilinmaydi.
 *
 * Kamera bitta kodni soniyada o'nlab marta o'qiydi. Cheklov bo'lmasa bitta
 * skanerlash o'ttizta savatga qo'shilish bo'lardi. Ikki dona bir xil tovar
 * kerak bo'lsa, kassir kodni keyingi safar ko'rsatadi.
 */
const SAME_CODE_COOLDOWN_MS = 2000;

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
  /** Oxirgi skanerlangan, lekin menyuda topilmagan kod. */
  unknownCode?: string | null;
  /** Faqat administratorga beriladi: noma'lum kodni admin panelda qo'shish. */
  onAddUnknown?: (code: string) => void;
}

/**
 * Kamera orqali tovarning shtrix-kodini o'qiydi (telefon, planshet).
 *
 * Promo-kod skaneri (`QrScannerModal`) bu ishga yaramaydi: `jsQR` faqat QR
 * o'qiydi, savdo kodlari (EAN/UPC/Code 128) esa chiziqli. iPhone Safari da
 * brauzerning `BarcodeDetector` i ham yo'q, shuning uchun ZXing ishlatiladi.
 * U faqat oyna ochilganda yuklanadi — kassa ishga tushishi sekinlashmasin.
 *
 * Oyna ochiq qoladi: kassir bir necha tovarni ketma-ket skanerlaydi.
 * Natijani (savatga qo'shildi / topilmadi) chaqiruvchi xabar sifatida chiqaradi.
 * USB skaner kerak emas — u klaviatura kabi yozadi va alohida ishlaydi.
 */
export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onDetected,
  onClose,
  unknownCode,
  onAddUnknown,
}) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let isCancelled = false;
    let reader: { reset(): void } | null = null;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorKey('scanner.unsupported');
        setIsStarting(false);
        return;
      }
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        if (isCancelled) return;

        // Faqat savdo kodlari: ro'yxat tor bo'lsa noto'g'ri kod o'qish ehtimoli kamayadi.
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const instance = new BrowserMultiFormatReader(hints, SCAN_INTERVAL_MS);
        reader = instance;
        const video = videoRef.current;
        if (!video) return;

        await instance.decodeFromConstraints(
          { video: { facingMode: 'environment' }, audio: false },
          video,
          (result) => {
            // Kod topilmagan kadrlar xato bilan keladi — bu odatiy holat.
            if (isCancelled || !result) return;
            const code = result.getText();
            const now = Date.now();
            const last = lastScanRef.current;
            if (last && last.code === code && now - last.at < SAME_CODE_COOLDOWN_MS) return;

            lastScanRef.current = { code, at: now };
            setLastCode(code);
            onDetectedRef.current(code);
          },
        );
        if (!isCancelled) setIsStarting(false);
      } catch (error) {
        if (isCancelled) return;
        setErrorKey(cameraErrorKey(error));
        setIsStarting(false);
      }
    };

    start();
    return () => {
      isCancelled = true;
      // Kamerani bo'shatadi: aks holda iPhone da yorug'lik chirog'i yonib qoladi.
      reader?.reset();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">{t('scanner.barcodeTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {!errorKey && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Shtrix-kod keng: ramka ham keng, kvadrat emas. */}
              <div className="h-1/3 w-5/6 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
            </div>
          )}
          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        {errorKey ? (
          <p className="text-xs font-semibold text-rose-600 text-center">{t(errorKey)}</p>
        ) : (
          <div className="space-y-1 text-center">
            <p className="text-xs text-slate-500">{t('scanner.barcodeHint')}</p>
            {lastCode && (
              <p className="text-xs font-mono font-semibold text-slate-700">
                {t('scanner.barcodeLast', { code: lastCode })}
              </p>
            )}
          </div>
        )}

        {unknownCode && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2 text-center">
            <p className="text-xs font-semibold text-amber-700">{t('toast.barcodeUnknown', { code: unknownCode })}</p>
            {onAddUnknown && (
              <button
                type="button"
                onClick={() => onAddUnknown(unknownCode)}
                className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold active:scale-95 transition-colors cursor-pointer"
              >
                {t('scanner.addProduct')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
