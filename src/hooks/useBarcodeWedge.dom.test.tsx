import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useBarcodeWedge } from './useBarcodeWedge';

/** Hook'ni sinaladigan kichik komponent. */
function Harness(props: { enabled: boolean; onScan: (code: string) => void }) {
  useBarcodeWedge(props.enabled, props.onScan);
  return <input aria-label="qidiruv" />;
}

/** Skaner kabi: belgilar 10 ms oraliqda, oxirida Enter. */
function scan(code: string, target: Window | Element = window) {
  for (const ch of code) {
    fireEvent.keyDown(target, { key: ch });
    vi.setSystemTime(Date.now() + 10);
  }
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  target.dispatchEvent(enter);
  return enter;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBarcodeWedge', () => {
  it('USB skaner kodini o‘qib, Enter ni boshqa joyga o‘tkazmaydi', () => {
    const onScan = vi.fn();
    render(<Harness enabled onScan={onScan} />);

    const enter = scan('4780001234567');

    expect(onScan).toHaveBeenCalledWith('4780001234567');
    expect(enter.defaultPrevented).toBe(true);
  });

  it('o‘chirilgan bo‘lsa (menyu ekrani emas) hech narsa qilmaydi', () => {
    const onScan = vi.fn();
    render(<Harness enabled={false} onScan={onScan} />);

    scan('4780001234567');

    expect(onScan).not.toHaveBeenCalled();
  });

  /*
   * Kassir qidiruv yoki promo maydoniga yozayotganda tugmalar o'sha maydonga
   * tegishli: skaner ushlab qolsa, matn yo'qolib qolardi.
   */
  it('matn maydoniga yozilayotganda aralashmaydi', () => {
    const onScan = vi.fn();
    const { getByLabelText } = render(<Harness enabled onScan={onScan} />);

    scan('4780001234567', getByLabelText('qidiruv'));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('Ctrl/Cmd bilan bosilgan tugmalar kodga qo‘shilmaydi', () => {
    const onScan = vi.fn();
    render(<Harness enabled onScan={onScan} />);

    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    scan('4780001234567');

    expect(onScan).toHaveBeenCalledWith('4780001234567');
  });
});
