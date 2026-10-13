import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { translate } from '../lib/i18n/translate';

/**
 * Kutubxona (ZXing) soxta: kamera ham, dekodlash ham testda yo'q. Soxta
 * o'quvchi tomosha qiluvchining funksiyasini saqlab qo'yadi va test
 * "kamera kodni o'qidi" deb o'sha funksiyani chaqiradi.
 */
const zxing = vi.hoisted(() => ({
  decodeFromConstraints: vi.fn(),
  reset: vi.fn(),
  hints: null as Map<number, unknown> | null,
  emit: (_text: string | null, _error?: Error) => {},
}));

vi.mock('@zxing/library', () => {
  class BrowserMultiFormatReader {
    constructor(hints: Map<number, unknown>) {
      zxing.hints = hints;
    }
    decodeFromConstraints(...args: unknown[]) {
      return zxing.decodeFromConstraints(...args);
    }
    reset() {
      zxing.reset();
    }
  }
  return {
    BrowserMultiFormatReader,
    DecodeHintType: { POSSIBLE_FORMATS: 2, TRY_HARDER: 3 },
    BarcodeFormat: { EAN_13: 1, EAN_8: 2, UPC_A: 3, UPC_E: 4, CODE_128: 5, CODE_39: 6 },
  };
});

/** Ekrandagi yozuv lug'atdan olinadi — test ham o'sha manbadan o'qiydi. */
const uz = (key: string) => translate('uz', key as never);

function renderModal() {
  const onDetected = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <LanguageProvider>
      <BarcodeScannerModal onDetected={onDetected} onClose={onClose} />
    </LanguageProvider>,
  );
  return { onDetected, onClose, ...utils };
}

beforeEach(() => {
  zxing.decodeFromConstraints.mockReset().mockImplementation(async (_c, _v, callback) => {
    zxing.emit = (text, error) => callback(text === null ? undefined : { getText: () => text }, error);
  });
  zxing.reset.mockReset();
  zxing.hints = null;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BarcodeScannerModal', () => {
  it('orqa kamerani ochadi va faqat savdo shtrix-kodlarini qidiradi', async () => {
    renderModal();

    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalledTimes(1));
    expect(zxing.decodeFromConstraints.mock.calls[0][0]).toEqual({
      video: { facingMode: 'environment' },
      audio: false,
    });
    // QR emas: ro'yxat tor bo'lsa noto'g'ri kod o'qish ehtimoli kamayadi.
    expect(zxing.hints?.get(2)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('o‘qilgan kodni bir marta xabar qiladi va ekranda ko‘rsatadi', async () => {
    const { onDetected } = renderModal();
    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalled());

    zxing.emit('4780001234567');

    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith('4780001234567');
    expect(await screen.findByText(/4780001234567/)).toBeTruthy();
  });

  /*
   * Kamera bir kodni soniyada o'nlab marta o'qiydi. Cheklov bo'lmasa bitta
   * skanerlash 30 ta savatga qo'shilish bo'lardi.
   */
  it('bir xil kod qisqa vaqtda qayta xabar qilinmaydi, keyin esa qilinadi', async () => {
    const { onDetected } = renderModal();
    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalled());

    zxing.emit('4780001234567');
    zxing.emit('4780001234567');
    zxing.emit('4780001234567');
    expect(onDetected).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 3000);
    zxing.emit('4780001234567');
    expect(onDetected).toHaveBeenCalledTimes(2);
  });

  it('boshqa kod kutmasdan xabar qilinadi', async () => {
    const { onDetected } = renderModal();
    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalled());

    zxing.emit('4780001234567');
    zxing.emit('5449000000996');

    expect(onDetected).toHaveBeenCalledTimes(2);
    expect(onDetected).toHaveBeenLastCalledWith('5449000000996');
  });

  it('kod topilmagan kadrlar (dekodlash xatosi) e‘tiborga olinmaydi', async () => {
    const { onDetected } = renderModal();
    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalled());

    zxing.emit(null, new Error('NotFoundException'));

    expect(onDetected).not.toHaveBeenCalled();
    expect(screen.queryByText(uz('scanner.failed'))).toBeNull();
  });

  it('kameraga ruxsat berilmasa tushunarli xabar chiqadi', async () => {
    zxing.decodeFromConstraints.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    renderModal();

    expect(await screen.findByText(uz('scanner.denied'))).toBeTruthy();
  });

  it('kamera API si yo‘q qurilmada shuni aytadi', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });

    renderModal();

    expect(await screen.findByText(uz('scanner.unsupported'))).toBeTruthy();
    expect(zxing.decodeFromConstraints).not.toHaveBeenCalled();
  });

  it('oyna yopilganda kamerani bo‘shatadi', async () => {
    const { unmount } = renderModal();
    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalled());

    unmount();

    expect(zxing.reset).toHaveBeenCalled();
  });

  /*
   * Noma'lum kod: administrator darhol menyuga qo'sha oladi (narxni faqat u
   * qo'yadi), qolgan xodim faqat xabarni ko'radi.
   */
  it('noma‘lum kodda administratorga "qo‘shish" tugmasi chiqadi', async () => {
    const onAddUnknown = vi.fn();
    render(
      <LanguageProvider>
        <BarcodeScannerModal onDetected={vi.fn()} onClose={vi.fn()} unknownCode="2145UZ" onAddUnknown={onAddUnknown} />
      </LanguageProvider>,
    );

    expect(screen.getByText(translate('uz', 'toast.barcodeUnknown' as never, { code: '2145UZ' }))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: uz('scanner.addProduct') }));

    expect(onAddUnknown).toHaveBeenCalledWith('2145UZ');
  });

  it('administrator bo‘lmasa faqat xabar, tugma yo‘q', async () => {
    render(
      <LanguageProvider>
        <BarcodeScannerModal onDetected={vi.fn()} onClose={vi.fn()} unknownCode="2145UZ" />
      </LanguageProvider>,
    );

    expect(screen.getByText(translate('uz', 'toast.barcodeUnknown' as never, { code: '2145UZ' }))).toBeTruthy();
    expect(screen.queryByRole('button', { name: uz('scanner.addProduct') })).toBeNull();
  });

  it('Escape oynani yopadi', async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(zxing.decodeFromConstraints).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
