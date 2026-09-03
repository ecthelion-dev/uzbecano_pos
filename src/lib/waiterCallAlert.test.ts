import { describe, it, expect } from 'vitest';
import { newWaiterCalls } from './waiterCallAlert';

/**
 * Ovoz faqat YANGI chaqiruvda chiqishi kerak.
 *
 * Har so'rovda chalinsa, javobsiz chaqiruv beshinchi daqiqada kassirni
 * ilovaning ovozini butunlay o'chirishga majbur qiladi — keyingi chaqiruvlar
 * esa jimgina o'tadi. Ya'ni bu mantiqning buzilishi funksiyani o'chirishga
 * teng, va buni faqat smena o'rtasida sezish mumkin bo'lardi.
 */
describe('yangi chaqiruvlar', () => {
  it('birinchi chaqiruvni yangi deb biladi', () => {
    expect(newWaiterCalls([], ['Bar 1'])).toEqual(['Bar 1']);
  });

  it('turgan chaqiruvni qayta yangi demaydi', () => {
    expect(newWaiterCalls(['Bar 1'], ['Bar 1'])).toEqual([]);
  });

  it('turganlar orasidan faqat yangisini ajratadi', () => {
    expect(newWaiterCalls(['Bar 1'], ['Bar 1', 'Hovli 2'])).toEqual(['Hovli 2']);
  });

  it('chaqiruv yopilib qayta kelsa yangi deb biladi', () => {
    const afterResolve = newWaiterCalls(['Bar 1'], []);
    expect(afterResolve).toEqual([]);
    expect(newWaiterCalls([], ['Bar 1'])).toEqual(['Bar 1']);
  });

  it('katta-kichik harf va bo\'shliq farqini yangi deb hisoblamaydi', () => {
    // Server "Bar 1", kassa "bar 1" deb yozishi mumkin — bitta chaqiruv
    // ikki marta chalinardi.
    expect(newWaiterCalls(['Bar 1'], [' bar 1 '])).toEqual([]);
  });

  it('bitta so\'rovda takrorlangan stolni bir marta beradi', () => {
    expect(newWaiterCalls([], ['Bar 1', 'bar 1'])).toEqual(['Bar 1']);
  });

  it('bo\'sh nomlarni tashlab yuboradi', () => {
    expect(newWaiterCalls([], ['', '   '])).toEqual([]);
  });
});
