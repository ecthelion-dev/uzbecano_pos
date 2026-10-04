import { describe, it, expect } from 'vitest';
import { digitsOnly, formatAmount, amountValue, MAX_AMOUNT_DIGITS } from './amountInput';

describe('pul maydoni', () => {
  it('uchlikka ajratib ko‘rsatadi', () => {
    // 90000 — bir qarashda 9 mingmi, 90 mingmi bilib bo'lmasdi.
    expect(formatAmount('90000')).toBe((90000).toLocaleString());
    expect(formatAmount('900000')).toBe((900000).toLocaleString());
  });

  it('raqam bo‘lmagan belgilarni tashlaydi', () => {
    expect(digitsOnly('90 000')).toBe('90000');
    expect(digitsOnly('90,000 so‘m')).toBe('90000');
    expect(digitsOnly('-90000')).toBe('90000');
    expect(digitsOnly('9e5')).toBe('95');
  });

  it('boshidagi nollar tashlanadi', () => {
    expect(digitsOnly('007')).toBe('7');
    expect(digitsOnly('000')).toBe('');
  });

  it('bo‘sh maydon bo‘sh qoladi', () => {
    expect(formatAmount('')).toBe('');
    expect(amountValue('')).toBe(0);
  });

  it('uzunlik cheklangan', () => {
    const long = digitsOnly('1'.repeat(20));
    expect(long.length).toBe(MAX_AMOUNT_DIGITS);
  });

  it('summa raqam bo‘lib qaytadi', () => {
    expect(amountValue('90 000')).toBe(90000);
    expect(amountValue('abc')).toBe(0);
  });
});
