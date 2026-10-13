import React, { lazy, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LazyModal } from './LazyModal';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { translate } from '../lib/i18n/translate';

const uz = (key: string) => translate('uz', key as never);

/** Yuklanishi qo'lda boshqariladigan lazy komponent. */
function deferredModal() {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => { resolve = r; });
  const Modal = lazy(async () => {
    await gate;
    return { default: () => <div>modal ichi</div> };
  });
  return { Modal, release: resolve };
}

function renderLazy(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('LazyModal', () => {
  it('hech ochilmagan bo\'lsa bolani render qilmaydi', () => {
    const { Modal } = deferredModal();

    renderLazy(<LazyModal open={false} onClose={vi.fn()}><Modal /></LazyModal>);

    expect(screen.queryByText('modal ichi')).toBeNull();
    expect(screen.queryByText(uz('common.loading'))).toBeNull();
  });

  it('bo\'lak kelguncha yuklanish belgisini, keyin modalni ko\'rsatadi', async () => {
    const { Modal, release } = deferredModal();

    renderLazy(<LazyModal open onClose={vi.fn()}><Modal /></LazyModal>);
    expect(screen.getByText(uz('common.loading'))).toBeTruthy();

    release();
    expect(await screen.findByText('modal ichi')).toBeTruthy();
    expect(screen.queryByText(uz('common.loading'))).toBeNull();
  });

  it('bo\'lak yuklanmasa faqat xabar chiqaradi — qolgan ekran joyida qoladi', async () => {
    const Broken = lazy(() => Promise.reject(new Error('Loading chunk 7 failed')));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderLazy(
      <div>
        <p>kassa ekrani</p>
        <LazyModal open onClose={vi.fn()}><Broken /></LazyModal>
      </div>,
    );

    expect(await screen.findByText(uz('lazy.loadFailed'))).toBeTruthy();
    expect(screen.getByText('kassa ekrani')).toBeTruthy();
    errorSpy.mockRestore();
  });

  it('xato xabaridagi "Yopish" onClose ni chaqiradi', async () => {
    const Broken = lazy(() => Promise.reject(new Error('Loading chunk 7 failed')));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();

    renderLazy(<LazyModal open onClose={onClose}><Broken /></LazyModal>);
    await screen.findByText(uz('lazy.loadFailed'));
    fireEvent.click(screen.getByRole('button', { name: uz('common.close') }));

    expect(onClose).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('yopilgandan keyin ham o\'rnatilgan qoladi — ichki holat saqlanadi', async () => {
    function CounterBody() {
      const [n, setN] = useState(0);
      return <button onClick={() => setN(n + 1)}>soni {n}</button>;
    }
    const Counter = lazy(async () => ({ default: CounterBody }));
    const ui = (open: boolean) => (
      <LanguageProvider>
        <LazyModal open={open} onClose={vi.fn()}><Counter /></LazyModal>
      </LanguageProvider>
    );

    const { rerender } = render(ui(true));
    fireEvent.click(await screen.findByText('soni 0'));
    rerender(ui(false));
    rerender(ui(true));

    expect(screen.getByText('soni 1')).toBeTruthy();
  });
});
