import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePosShortcuts, type PosShortcutHandlers } from './usePosShortcuts';

/** Hook'ni sinaladigan kichik komponent: hook faqat div ichida ishlaydi. */
function Harness(props: { handlers: PosShortcutHandlers }) {
  usePosShortcuts(props.handlers);
  return (
    <div>
      <input aria-label="izoh" />
      <textarea aria-label="matn" />
    </div>
  );
}

function setup() {
  const handlers: PosShortcutHandlers = {
    onTables: vi.fn(),
    onMenu: vi.fn(),
    toggleArchive: vi.fn(),
    toggleShiftReport: vi.fn(),
    onEscape: vi.fn(),
  };
  render(<Harness handlers={handlers} />);
  return handlers;
}

describe('usePosShortcuts', () => {
  it('F1 va F2 bo\'limni almashtiradi', () => {
    const h = setup();

    fireEvent.keyDown(window, { key: 'F1' });
    expect(h.onTables).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'F2' });
    expect(h.onMenu).toHaveBeenCalledTimes(1);
  });

  it('F3 va F4 oynalarni ochadi/yopadi (toggle)', () => {
    const h = setup();

    fireEvent.keyDown(window, { key: 'F3' });
    fireEvent.keyDown(window, { key: 'F3' });
    expect(h.toggleArchive).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: 'F4' });
    expect(h.toggleShiftReport).toHaveBeenCalledTimes(1);
  });

  it('Escape barcha ochiq oynalarni yopishga chaqiradi', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(h.onEscape).toHaveBeenCalledTimes(1);
  });

  it('boshqa tugmalar hech nima qilmaydi', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(h.onTables).not.toHaveBeenCalled();
    expect(h.onEscape).not.toHaveBeenCalled();
  });

  /*
   * Matn terilayotganda tugmalar ishlamasligi kerak: kassir izohga "F1"
   * deb yozsa yoki ESC bilan tahrirni bekor qilmoqchi bo'lsa, bo'lim
   * almashib ketmasin. Ilgari bu qoida faqat App.tsx ichida yashar edi va
   * hech qanday test u bilan bog'lanmagan edi.
   */
  it('input va textarea ichida tugmalar ishlamaydi', () => {
    const h = setup();

    const input = screen.getByLabelText('izoh');
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(window, { key: 'F1' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(h.onTables).not.toHaveBeenCalled();
    expect(h.onEscape).not.toHaveBeenCalled();

    const textarea = screen.getByLabelText('matn');
    textarea.focus();
    fireEvent.keyDown(window, { key: 'F2' });
    expect(h.onMenu).not.toHaveBeenCalled();
  });

  it('tinglovchi har renderda qayta ulanmaydi', () => {
    // Handler'lar har renderda yangi obyekt bo'ladi. Ref ishlatilmasa
    // tinglovchi har renderda o'chib-qayta ulanardi va o'sha paytda
    // bosilgan tugma yo'qolib qolishi mumkin edi.
    const addSpy = vi.spyOn(window, 'addEventListener');
    const handlers = {
      onTables: vi.fn(),
      onMenu: vi.fn(),
      toggleArchive: vi.fn(),
      toggleShiftReport: vi.fn(),
      onEscape: vi.fn(),
    };
    const { rerender } = render(<Harness handlers={handlers} />);
    const afterMount = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;

    rerender(<Harness handlers={{ ...handlers }} />);
    rerender(<Harness handlers={{ ...handlers }} />);

    expect(addSpy.mock.calls.filter(([type]) => type === 'keydown').length).toBe(afterMount);
    addSpy.mockRestore();
  });
});
