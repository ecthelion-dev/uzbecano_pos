import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import type { TranslationKey } from '../lib/i18n/dictionaries/uz';
import { promoCodeFromScan } from '../lib/promo';

/** Kadrlar orasidagi tanaffus — har kadrni o'qish sekin kassada protsessorni band qiladi. */
const SCAN_INTERVAL_MS = 150;
/** Tanib olish uchun kadr shu kenglikka kichraytiriladi. */
const SCAN_WIDTH = 480;

interface QrScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

function cameraErrorKey(error: unknown): TranslationKey {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'scanner.denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'scanner.noCamera';
  return 'scanner.failed';
}

/**
 * Kamera orqali promo-kod QR ini o'qiydi.
 *
 * Windows'dagi WebView2 da `BarcodeDetector` yo'q, shuning uchun kadrlar
 * jsQR bilan o'qiladi. Kutubxona faqat oyna ochilganda yuklanadi — kassa
 * ishga tushishi sekinlashmasin. USB skaner kerak emas: u klaviatura kabi
 * yozadi va promo maydonining o'ziga tushadi.
 */
export const QrScannerModal: React.FC<QrScannerModalProps> = ({ onDetected, onClose }) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [isStarting, setIsStarting] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [isNotPromo, setIsNotPromo] = useState(false);

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
    let stream: MediaStream | null = null;
    let timer: number | undefined;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorKey('scanner.unsupported');
        setIsStarting(false);
        return;
      }
      try {
        const { default: jsQR } = await import('jsqr');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const video = videoRef.current;
        if (isCancelled || !video) return;

        video.srcObject = stream;
        await video.play();
        setIsStarting(false);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const tick = () => {
          if (isCancelled || !ctx) return;
          if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            const scale = Math.min(1, SCAN_WIDTH / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
            if (result?.data) {
              const code = promoCodeFromScan(result.data);
              if (code) {
                onDetectedRef.current(code);
                return;
              }
              setIsNotPromo(true);
            }
          }
          timer = window.setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch (error) {
        if (isCancelled) return;
        setErrorKey(cameraErrorKey(error));
        setIsStarting(false);
      }
    };

    start();
    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
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
          <h3 className="text-sm font-bold text-slate-900">{t('scanner.title')}</h3>
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

        <div className="relative aspect-square w-full max-w-full overflow-hidden rounded-xl bg-slate-900">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {!errorKey && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="aspect-square w-2/3 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
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
          <p className={`text-xs text-center ${isNotPromo ? 'font-semibold text-amber-600' : 'text-slate-500'}`}>
            {t(isNotPromo ? 'scanner.notPromo' : 'scanner.hint')}
          </p>
        )}
      </div>
    </div>
  );
};
