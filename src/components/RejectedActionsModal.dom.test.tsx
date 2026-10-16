import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RejectedActionsModal } from './RejectedActionsModal';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { stampRejection, type FailedAction } from '../lib/failedActions';

/*
 * 2026-10-16: mavjud bo'lmagan chekning to'lovi "Tushunarli" dan keyin ham
 * ro'yxatda abadiy turdi, "Barchasini qayta yuborish" esa uni qayta
 * yuborib, yana xato qilib qaytarardi.
 */
const payment = (acknowledgedAt?: number): FailedAction => ({
  ...stampRejection(
    { kind: 'patch', qid: 'q-pay', orderId: 'phantom', label: 'finalize_payment', body: { status: 'served' } } as any,
    404,
    'Buyurtma topilmadi',
    1,
  ),
  ...(acknowledgedAt ? { acknowledgedAt } : {}),
});

function setup(items: FailedAction[]) {
  const props = {
    items,
    onAcknowledge: vi.fn(),
    onRetry: vi.fn(),
    onRetryAll: vi.fn(),
    onDiscard: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <LanguageProvider>
      <RejectedActionsModal {...props} />
    </LanguageProvider>,
  );
  return props;
}

describe('Serverga o‘tmagan amallar oynasi', () => {
  it('ko‘rilgan to‘lovni ro‘yxatdan olib tashlash mumkin', () => {
    const props = setup([payment(5)]);

    fireEvent.click(screen.getByText('O‘chirish'));

    expect(props.onDiscard).toHaveBeenCalledWith('q-pay');
  });

  it('ko‘rilmagan yozuvda olib tashlash yo‘q — avval "Tushunarli"', () => {
    setup([payment()]);
    expect(screen.queryByText('O‘chirish')).toBeNull();
    expect(screen.getByText('Tushunarli')).toBeTruthy();
  });

  it('hammasi ko‘rilgan bo‘lsa "Barchasini qayta yuborish" ko‘rinmaydi', () => {
    setup([payment(5)]);
    expect(screen.queryByText('Barchasini qayta yuborish')).toBeNull();
  });
});
