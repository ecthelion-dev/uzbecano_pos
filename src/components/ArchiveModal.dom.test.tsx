import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchiveModal } from './ArchiveModal';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { translate } from '../lib/i18n/translate';
import type { DBOrder } from '../types';

/** Ekrandagi yozuv lug'atdan olinadi — test ham o'sha manbadan o'qiydi. */
const uz = (key: string) => translate('uz', key as never);

const chek: DBOrder = {
  id: 'o1',
  tableNumber: 'Stol 04',
  total: 720_000,
  subtotal: 720_000,
  status: 'served',
  paymentMethod: 'naqd',
  closedAt: '2026-10-03T11:22:00.000Z',
  closedBy: 'Dilsora',
  items: [{ id: 'i1', name: 'Tandir (1 kg)', price: 240_000, quantity: 3, total: 720_000 }],
};

/** `selectedArchiveOrder` berilgan holda modalni ochadi. */
function renderModal(selected: DBOrder | null = chek) {
  const onSelectArchiveOrder = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <LanguageProvider>
      <ArchiveModal
        show
        orders={[chek]}
        archiveSearch=""
        selectedArchiveOrder={selected}
        onSearchChange={vi.fn()}
        onSelectArchiveOrder={onSelectArchiveOrder}
        onClose={onClose}
        onPrint={vi.fn()}
      />
    </LanguageProvider>,
  );
  return { onSelectArchiveOrder, onClose, ...utils };
}

describe('ArchiveModal', () => {
  it('yopiq holatda hech narsa chiqmaydi', () => {
    const { container } = render(
      <LanguageProvider>
        <ArchiveModal
          show={false}
          orders={[chek]}
          archiveSearch=""
          selectedArchiveOrder={chek}
          onSearchChange={vi.fn()}
          onSelectArchiveOrder={vi.fn()}
          onClose={vi.fn()}
          onPrint={vi.fn()}
        />
      </LanguageProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  /*
   * Regressiya: bitta oynada ikki xil "ortga" yo'li bor edi — sarlavhadagi ×
   * ham, "Ro'yxatga qaytish" tugmasi ham. Bittasi oynani yopardi, ikkinchisi
   * faqat ro'yxatga qaytarardi: kassir nima bosishidan qat'i nazar natijani
   * oldindan bilmasdi. Endi bitta tugma bor va u har doim bir pog'ona orqaga
   * oladi.
   */
  it('chek ko‘rinishida × ro‘yxatga qaytaradi, oynani yopmaydi', () => {
    const { onSelectArchiveOrder, onClose } = renderModal(chek);

    fireEvent.click(screen.getByRole('button', { name: uz('archive.backToList') }));

    expect(onSelectArchiveOrder).toHaveBeenCalledWith(null);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ro‘yxatda × oynani yopadi', () => {
    const { onSelectArchiveOrder, onClose } = renderModal(null);

    fireEvent.click(screen.getByRole('button', { name: uz('common.close') }));

    expect(onClose).toHaveBeenCalled();
    expect(onSelectArchiveOrder).not.toHaveBeenCalled();
  });

  /*
   * Fon ustiga bosish ham "bekor qilish" deb o'qiladi — u ham xuddi shu
   * tugma bilan bir xil ish qilishi kerak, aks holda yana bir "ortga" yo'li
   * paydo bo'ladi.
   */
  it('fon ustiga bosish ham xuddi shu ishi qiladi', () => {
    const { onSelectArchiveOrder, onClose, container } = renderModal(chek);

    /*
     * Oyna kartasining O'ZIGA bosish ataylab to'xtatiladi (stopPropagation) —
     * shuning uchun fon qatlamining o'zi bosiladi.
     */
    fireEvent.click(container.firstChild!);

    expect(onSelectArchiveOrder).toHaveBeenCalledWith(null);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('chek ko‘rinishida faqat bitta "ortga" yo‘li qoladi', () => {
    renderModal(chek);

    expect(screen.getAllByRole('button', { name: uz('archive.backToList') })).toHaveLength(1);
    // Eski alohida tugmada matn ko'rinardi; u olib tashlandi.
    expect(screen.queryByText(new RegExp(uz('archive.backToList')))).toBeNull();
  });
});
