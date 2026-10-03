import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
function renderModal(selected: DBOrder | null = chek, orders: DBOrder[] = [chek]) {
  const onSelectArchiveOrder = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <LanguageProvider>
      <ArchiveModal
        show
        orders={orders}
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

/**
 * Xulosa qatori.
 *
 * Avval har bir ko'rsatkich o'z chipiga ega edi — yettita chip ekranni ikki
 * qatorga bosib, asosiy savol ("kunlik tushum qancha") oxirida qolardi.
 */
describe('Arxiv xulosasi', () => {
  const qaytarilgan: DBOrder = {
    ...chek,
    id: 'o2',
    tableNumber: 'Stol 07',
    total: 840_000,
    refunded: true,
    refundReason: 'Mijoz rad etdi',
  };
  const qarz: DBOrder = {
    ...chek,
    id: 'o3',
    tableNumber: 'Stol 09',
    total: 6_000,
    subtotal: 6_000,
    paymentMethod: 'qarz',
  };

  /**
   * Xulosa qatorining o'zi.
   *
   * "Qaytarilgan" so'zi ro'yxatdagi chek kartasida ham bor (belgi sifatida),
   * shuning uchun umumiy qidiruvda ikki marta topiladi. "JAMI" yorlig'i esa
   * faqat shu qatorda chiqadi — undan boshlab chegaralaymiz.
   */
  function xulosaBar() {
    return screen.getByText(uz('common.total')).parentElement!.parentElement!;
  }

  it('JAMI birinchi chiqadi, tarkibi undan keyin', () => {
    renderModal(null, [chek]);
    const matn = xulosaBar().textContent || '';

    expect(matn).toContain(uz('common.total'));
    expect(matn.indexOf(uz('common.total'))).toBeLessThan(matn.indexOf(uz('common.cashLabel')));
    expect(matn.indexOf(uz('common.cashLabel'))).toBeLessThan(matn.indexOf(uz('common.cardLabel')));
  });

  /*
   * Nolga teng bo'lgan ko'rsatkich ekranni band qilmasin: qaytarilgan
   * chek yo'q kunda "qaytarilgan" yozuvi chiqsa, kassa undan kelib chiqib
   * kunlik tushumni kamaygan deb o'ylaydi.
   */
  it('nolga teng bo‘lgan ko‘rsatkichlar umuman chiqmaydi', () => {
    renderModal(null, [chek]);
    const bar = within(xulosaBar());

    expect(bar.queryByText(uz('archive.refundedShort'))).toBeNull();
    expect(bar.queryByText(uz('archive.debtPendingSummary'))).toBeNull();
    expect(bar.queryByText(uz('archive.debtCollectedSummary'))).toBeNull();
  });

  it('qaytarilgan va qarz bo‘lsa ular ko‘rinadi', () => {
    renderModal(null, [chek, qaytarilgan, qarz]);
    const bar = within(xulosaBar());

    expect(bar.getByText(new RegExp(uz('archive.refundedShort')))).toBeInTheDocument();
    expect(bar.getByText(uz('archive.debtPendingSummary'))).toBeInTheDocument();
    // Qaytarilgan summa manfiy belgi bilan ko'rinadi — tushumdan ayiriladi.
    expect(bar.getByText(new RegExp(`−${(840_000).toLocaleString()}`))).toBeInTheDocument();
  });
});
