import { describe, it, expect } from 'vitest';
import { findProductByBarcode, resolveBarcodeScan } from './barcodeLookup';
import type { DBProduct } from '../types';

const product = (id: string, barcode?: string): DBProduct => ({
  id,
  name: `Mahsulot ${id}`,
  category: 'Ichimliklar',
  price: 5000,
  ...(barcode !== undefined ? { barcode } : {}),
});

const suv = product('suv', '4780001234567');
const cola = product('cola', '5449000000996');
const kodsiz = product('kodsiz');

describe('findProductByBarcode', () => {
  it('kod bo‘yicha mahsulotni topadi', () => {
    expect(findProductByBarcode([kodsiz, suv, cola], '5449000000996')).toBe(cola);
  });

  it('skaner qo‘shgan bo‘shliq va Enter ni e‘tiborsiz qoldiradi', () => {
    expect(findProductByBarcode([suv], ' 4780001234567\n')).toBe(suv);
  });

  it('kodi yo‘q mahsulotlar hech qachon mos kelmaydi', () => {
    expect(findProductByBarcode([kodsiz], '')).toBeNull();
    expect(findProductByBarcode([kodsiz], '   ')).toBeNull();
  });

  it('noma‘lum kod uchun null qaytaradi', () => {
    expect(findProductByBarcode([suv, cola], '0000000000000')).toBeNull();
  });

  it('harf-raqamli kodlarda katta-kichik harf farq qilmaydi', () => {
    const p = product('p', 'AB-12x');
    expect(findProductByBarcode([p], 'ab-12X')).toBe(p);
  });

  /*
   * UPC-A (12 raqam) — bu boshiga 0 qo'yilgan EAN-13. Telefon kamerasi uni
   * 12 raqam qilib, USB skaner esa 13 raqam qilib berishi mumkin; bitta
   * mahsulot ikkala yo'l bilan topilishi kerak.
   */
  it('UPC-A (12) va EAN-13 (boshida 0) bir xil kod hisoblanadi', () => {
    const upc = product('upc', '012345678905');
    const ean = product('ean', '0987654321098');
    expect(findProductByBarcode([upc], '0012345678905')).toBe(upc);
    expect(findProductByBarcode([ean], '987654321098')).toBe(ean);
  });

  /*
   * Faqat 12 raqamli kod kengaytiriladi. Qisqa ichki kodlarda (masalan
   * "123" va "0123") boshidagi nolni tashlab yuborish boshqa mahsulotni
   * topib berardi, ya'ni noto'g'ri narxda sotilardi.
   */
  it('qisqa kodlarda boshidagi nol muhim', () => {
    const qisqa = product('q', '123');
    expect(findProductByBarcode([qisqa], '0123')).toBeNull();
  });
});

/*
 * Skanerlash natijasi kassada nima qilish kerakligini hal qiladi. Qaror
 * komponentda emas, shu yerda turadi: u testlanadi va telefon kamerasi bilan
 * USB skaner bir xil yo'ldan o'tadi.
 */
describe('resolveBarcodeScan', () => {
  it('noma‘lum kod — hech narsa qo‘shilmaydi', () => {
    expect(resolveBarcodeScan([suv], '0000000000000')).toEqual({ kind: 'unknown' });
  });

  it('oddiy mahsulot savatga qo‘shiladi, tanlash kerak emas', () => {
    expect(resolveBarcodeScan([suv], '4780001234567')).toEqual({
      kind: 'add',
      product: suv,
      needsChoice: false,
    });
  });

  it('stop-listdagi (isAvailable=false) mahsulot sotilmaydi', () => {
    const toxtagan = { ...suv, isAvailable: false };
    expect(resolveBarcodeScan([toxtagan], '4780001234567')).toEqual({
      kind: 'unavailable',
      product: toxtagan,
    });
  });

  it('isAvailable berilmagan mahsulot sotuvda hisoblanadi', () => {
    const outcome = resolveBarcodeScan([suv], '4780001234567');
    expect(outcome.kind).toBe('add');
  });

  /*
   * Ko'p o'lchamli yoki qo'shimchali mahsulotni bevosita savatga qo'shish
   * noto'g'ri narxda sotardi: avval tanlash oynasi ochilishi kerak.
   */
  it('o‘lcham yoki qo‘shimcha bor bo‘lsa tanlash kerak', () => {
    const katta = { ...suv, variants: [{ name: 'Kichik', price: 5000 }, { name: 'Katta', price: 8000 }] };
    const outcome = resolveBarcodeScan([katta], '4780001234567');
    expect(outcome).toEqual({ kind: 'add', product: katta, needsChoice: true });
  });
});
