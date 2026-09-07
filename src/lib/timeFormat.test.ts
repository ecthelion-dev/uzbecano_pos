import { describe, it, expect } from 'vitest';
import { formatClock, formatDateClock, normalizeTimeText } from './timeFormat';

/**
 * Soat 24 soatlik bo'lishi shart.
 *
 * Qurilma ingliz tiliga sozlangan bo'lsa `toLocaleTimeString` "3:04 PM"
 * qaytaradi — kassir uchun bu qo'shimcha o'ylash, hisobot oralig'i uchun esa
 * yarim kunlik xato.
 */
describe('soat formati', () => {
  it('tushdan keyingi vaqtni 24 soatlik ko\'rsatadi', () => {
    expect(formatClock(new Date('2026-09-07T15:04:00'))).toBe('15:04');
  });

  it('AM/PM hech qachon chiqmaydi', () => {
    for (const iso of ['2026-09-07T15:04:00', '2026-09-07T03:04:00', '2026-09-07T00:30:00']) {
      expect(formatClock(new Date(iso))).not.toMatch(/[AP]M/i);
      expect(formatDateClock(new Date(iso))).not.toMatch(/[AP]M/i);
    }
  });

  it('ertalab va kechqurunni ajratadi', () => {
    expect(formatClock(new Date('2026-09-07T03:04:00'))).toBe('03:04');
    expect(formatClock(new Date('2026-09-07T15:04:00'))).toBe('15:04');
  });

  it('yarim tun 00 bo\'ladi, 24 emas', () => {
    expect(formatClock(new Date('2026-09-07T00:30:00'))).toBe('00:30');
  });

  it('buzuq qiymatda zaxira matn qaytadi', () => {
    expect(formatClock('yaroqsiz', '—')).toBe('—');
    expect(formatDateClock(null)).toBe('—');
  });
});

/**
 * Hisobot oralig'iga qo'lda yoziladigan vaqt.
 *
 * Bu maydon savdo hisobotining chegarasini belgilaydi: noto'g'ri o'qilsa
 * kassir bir kunlik savdoni boshqa kunniki bilan qo'shib yuboradi.
 */
describe('qo\'lda yozilgan vaqt', () => {
  it('faqat soat yozilsa daqiqani nolga qo\'yadi', () => {
    expect(normalizeTimeText('8')).toBe('08:00');
    expect(normalizeTimeText('23')).toBe('23:00');
  });

  it('to\'rt raqamni soat va daqiqaga ajratadi', () => {
    expect(normalizeTimeText('0830')).toBe('08:30');
    expect(normalizeTimeText('2359')).toBe('23:59');
  });

  it('ikki nuqtali yozuvni ham tushunadi', () => {
    expect(normalizeTimeText('08:30')).toBe('08:30');
  });

  it('chegaradan chiqqan qiymatni chegaraga qaytaradi', () => {
    // "25:00" ni qabul qilib yuborsa, oraliq keyingi kunga sakrab ketardi.
    expect(normalizeTimeText('2500')).toBe('23:00');
    expect(normalizeTimeText('0899')).toBe('08:59');
  });

  it('bo\'sh maydonga zaxira qiymat qo\'yadi', () => {
    // Oraliqsiz so'rov butun bazani tortib olardi.
    expect(normalizeTimeText('')).toBe('00:00');
    expect(normalizeTimeText(null, '23:59')).toBe('23:59');
  });
});
