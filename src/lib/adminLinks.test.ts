import { describe, it, expect } from 'vitest';
import { canManageProducts, newProductAdminUrl } from './adminLinks';

describe('newProductAdminUrl', () => {
  it('admin panelni kod yozilgan "yangi mahsulot" bilan ochadi', () => {
    expect(newProductAdminUrl('2145UZ')).toBe('https://orderplus.uz/admin?newProductBarcode=2145UZ');
  });

  it('URL ga xavfli belgilar kodlanib qo‘yiladi', () => {
    expect(newProductAdminUrl('A&B=1')).toBe('https://orderplus.uz/admin?newProductBarcode=A%26B%3D1');
  });
});

/*
 * Narxni faqat administrator belgilaydi. Ofitsiant noma'lum tovarni o'zi
 * qo'sha olsa, narxni ham o'zi qo'yib, istagan summaga sotardi.
 */
describe('canManageProducts', () => {
  it('kafe administratori (kassada "manager") qo‘sha oladi', () => {
    expect(canManageProducts('manager')).toBe(true);
    expect(canManageProducts('cafe_admin')).toBe(true);
  });

  it('ofitsiant, kassir yoki noma‘lum rol qo‘sha olmaydi', () => {
    expect(canManageProducts('waiter')).toBe(false);
    expect(canManageProducts('cashier')).toBe(false);
    expect(canManageProducts(undefined)).toBe(false);
  });
});
