import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReservationModal } from './ReservationModal';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { translate } from '../lib/i18n/translate';
import type { DBReservation } from '../types';

/** Ekrandagi yozuv lug'atdan olinadi — test ham o'sha manbadan o'qiydi. */
const uz = (key: string) => translate('uz', key as never);

const tableDefs = [
  { number: 'Stol 01', area: 'Zal' },
  { number: 'Stol 02', area: 'Zal' },
];

const booking = (over: Partial<DBReservation>): DBReservation => ({
  id: 'r-1',
  tableNumber: 'Stol 01',
  customerName: 'Ali Valiyev',
  customerPhone: '+998901112233',
  guestCount: 4,
  reservedTime: '2026-10-01T15:00:00.000Z',
  status: 'CONFIRMED',
  createdAt: '2026-09-30T09:00:00.000Z',
  ...over,
});

function renderModal(props: Partial<React.ComponentProps<typeof ReservationModal>> = {}) {
  const onCreateReservation = vi.fn().mockResolvedValue(true);
  const onCancelReservation = vi.fn();
  const onOpenTable = vi.fn();
  const onClose = vi.fn();

  const utils = render(
    <LanguageProvider>
      <ReservationModal
        show
        tableDefs={tableDefs}
        reservations={[]}
        defaultTableNumber="Stol 02"
        onCreateReservation={onCreateReservation}
        onCancelReservation={onCancelReservation}
        onOpenTable={onOpenTable}
        onClose={onClose}
        {...props}
      />
    </LanguageProvider>,
  );

  return { onCreateReservation, onCancelReservation, onOpenTable, onClose, ...utils };
}

describe('ReservationModal', () => {
  it('yopiq holatda hech nima chiqarmaydi', () => {
    const { container } = renderModal({ show: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("stol tanlash sukut bo'yicha berilgan stolni ko'rsatadi", () => {
    renderModal();
    expect(screen.getByRole('combobox')).toHaveValue('Stol 02');
  });

  it("ism bo'sh bo'lsa bron qilinmaydi va xato ko'rinadi", async () => {
    const { onCreateReservation, onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('reservation.create')) }));

    await waitFor(() => {
      expect(screen.getByText(uz('reservation.customerName'))).toBeInTheDocument();
    });
    expect(onCreateReservation).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("to'ldirilgan forma serverga to'g'ri yuboriladi", async () => {
    const { onCreateReservation, onClose } = renderModal();

    fireEvent.change(screen.getByPlaceholderText(uz('reservation.namePlaceholder')), {
      target: { value: '  Dilnoza Karimova  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(uz('reservation.phonePlaceholder')), {
      target: { value: ' +998 90 123 45 67 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+' }));

    /*
     * "Ertaga" kalendar oynasida: avval sana maydoni bosiladi.
     *
     * Ertangi kun kerak, chunki sukut bo'yicha vaqt "hozir + 1 soat" — 23:00
     * atrofida u o'tmishda qolib, modal hakli ravishda rad etardi.
     */
    fireEvent.click(screen.getByRole('button', { name: /\d{2}\.\d{2}\.\d{4}/ }));
    fireEvent.click(screen.getByRole('button', { name: uz('reservation.tomorrow') }));

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('reservation.create')) }));

    await waitFor(() => expect(onCreateReservation).toHaveBeenCalledTimes(1));
    const payload = onCreateReservation.mock.calls[0][0];

    expect(payload.tableNumber).toBe('Stol 02');
    // Bo'shliqlar kesiladi: serverga "  Dilnoza " ketmasin.
    expect(payload.customerName).toBe('Dilnoza Karimova');
    expect(payload.customerPhone).toBe('+998 90 123 45 67');
    // Sukut 2 kishi edi, "+" bosilgach 3.
    expect(payload.guestCount).toBe(3);
    // Izoh yozilmagan — maydon umuman yuborilmaydi.
    expect(payload.notes).toBeUndefined();

    const sent = new Date(payload.reservedTime);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(Number.isNaN(sent.getTime())).toBe(false);
    expect(sent.getDate()).toBe(tomorrow.getDate());
    expect(sent.getTime()).toBeGreaterThan(Date.now());

    // Muvaffaqiyatli bron oynani yopadi.
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('server rad etsa oyna ochiq qoladi', async () => {
    // Diqqat: `renderModal` qaytaradigan sukut mock emas, shu yerda
    // yaratilgan mock tekshiriladi — aks holda hech qachon chaqirilmagan
    // "spy" ustida tekshiruv o'tkazilardi.
    const radEtadi = vi.fn().mockResolvedValue(false);
    const { onClose } = renderModal({ onCreateReservation: radEtadi });

    fireEvent.change(screen.getByPlaceholderText(uz('reservation.namePlaceholder')), {
      target: { value: 'Ali' },
    });
    fireEvent.click(screen.getByRole('button', { name: /\d{2}\.\d{2}\.\d{4}/ }));
    fireEvent.click(screen.getByRole('button', { name: uz('reservation.tomorrow') }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('reservation.create')) }));

    await waitFor(() => expect(radEtadi).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ReservationModal — ro\'yxatlar', () => {
  it("faol va tarix ro'yxatlari ajratiladi", async () => {
    renderModal({
      reservations: [
        booking({ id: 'r-1', customerName: 'Faol Mijoz', status: 'CONFIRMED' }),
        booking({ id: 'r-2', customerName: 'Bekor Mijoz', status: 'CANCELLED' }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('reservation.tabActive')) }));

    await waitFor(() => expect(screen.getByText(/Faol Mijoz/)).toBeInTheDocument());
    expect(screen.queryByText(/Bekor Mijoz/)).toBeNull();

    // Tarixda esa faqat bekor qilingani ko'rinadi.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('reservation.tabHistory')) }));

    await waitFor(() => expect(screen.getByText(/Bekor Mijoz/)).toBeInTheDocument());
    expect(screen.queryByText(/Faol Mijoz/)).toBeNull();
    expect(screen.getByText(uz('reservation.statusCancelled'))).toBeInTheDocument();
  });

  it("bekor qilish va stolni ochish to'g'ri chaqiriladi", async () => {
    const { onCancelReservation, onOpenTable, onClose } = renderModal({
      reservations: [booking({ id: 'r-9' })],
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('reservation.tabActive')) }));

    fireEvent.click(await screen.findByTitle(uz('reservation.cancel')));
    expect(onCancelReservation).toHaveBeenCalledWith('r-9');

    fireEvent.click(screen.getByTitle(uz('reservation.openTable')));
    expect(onOpenTable).toHaveBeenCalledWith('Stol 01', 'r-9');
    expect(onClose).toHaveBeenCalled();
  });
});
