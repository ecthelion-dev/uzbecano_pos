import { describe, it, expect } from 'vitest';
import { formatClock, formatDateClock, maskTimeText, normalizeTimeText } from './timeFormat';

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
    expect(normalizeTimeText('9999')).toBe('23:59');
    expect(normalizeTimeText('25:99')).toBe('23:59');
  });

  it('harf aralashgan yozuvdan faqat raqamni oladi', () => {
    // Maydon endi harfni umuman yozdirmaydi, lekin normalizatsiya baribir
    // ehtiyot chorasi: qandaydir yo'l bilan tushib qolgan harf ham
    // chekni sana oralig'idan tashqariga chiqarib yubormasligi kerak.
    expect(normalizeTimeText('s324242')).toBe('23:42');
    expect(normalizeTimeText('abc')).toBe('00:00');
  });

  it('bo\'sh maydonga zaxira qiymat qo\'yadi', () => {
    // Oraliqsiz so'rov butun bazani tortib olardi.
    expect(normalizeTimeText('')).toBe('00:00');
    expect(normalizeTimeText(null, '23:59')).toBe('23:59');
  });
});

/**
 * Yozish paytidagi filtr — controlled input harf yozdirmasligi shart.
 *
 * `s324242` ekranda ko'rinib qolgani aynan shundan: `onChange` xom qiymatni
 * to'g'ridan-to'g'ri holatga yozardi. Bu funksiya har bosishda chaqiriladi.
 */
describe('yozish paytidagi niqob', () => {
  it('raqam bo\'lmagan belgini o\'tkazmaydi', () => {
    expect(maskTimeText('s324242')).toBe('32:42');
    expect(maskTimeText('abc')).toBe('');
  });

  it('ikkinchi raqamdan keyin ":" ni o\'zi qo\'yadi', () => {
    expect(maskTimeText('0')).toBe('0');
    expect(maskTimeText('09')).toBe('09');
    expect(maskTimeText('093')).toBe('09:3');
    expect(maskTimeText('0930')).toBe('09:30');
  });

  it('to\'rt raqamdan oshganini kesadi', () => {
    expect(maskTimeText('093099')).toBe('09:30');
  });

  it('diapazonni bu yerda cheklamaydi — bu normalizeTimeText ishi', () => {
    // Kassir "9" ni yozayotganda "23:59" ga sakrab qolsa, hali tugallanmagan
    // yozuvni to'siq deb his qiladi.
    expect(maskTimeText('99')).toBe('99');
  });

  it('bo\'sh qiymatda bo\'sh qaytadi', () => {
    expect(maskTimeText('')).toBe('');
    expect(maskTimeText(null)).toBe('');
  });
});
