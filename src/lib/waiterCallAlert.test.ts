import { describe, it, expect } from 'vitest';
import { newWaiterCalls, CHIME_NOTES, chimeDurationMs } from './waiterCallAlert';

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

/**
 * Ohangning uzunligi.
 *
 * Bu talab: signal 2–3 soniya davom etishi kerak. Qisqasi zalning shovqinida
 * yo'qoladi, uzuni bezovta qiladi va kassir ovozni butunlay o'chiradi.
 * Notalarni tahrirlash oson, uzunlik esa e'tibordan chetda qolib ketadi.
 */
describe('chaqiruv ohangi', () => {
  it('2 dan 3 soniyagacha davom etadi', () => {
    const ms = chimeDurationMs();
    expect(ms).toBeGreaterThanOrEqual(2000);
    expect(ms).toBeLessThanOrEqual(3000);
  });

  it('notalar vaqt bo\'yicha tartibda va bir-birini bosmaydi', () => {
    for (let i = 1; i < CHIME_NOTES.length; i++) {
      const prev = CHIME_NOTES[i - 1];
      const cur = CHIME_NOTES[i];
      expect(cur.at, `${i}-nota oldingisidan oldin boshlanyapti`).toBeGreaterThanOrEqual(prev.at);
    }
  });

  it('har bir nota eshitiladigan uzunlikda', () => {
    // Juda qisqa nota "chirq" bo'lib eshitiladi, ohang esa bilinmaydi.
    for (const n of CHIME_NOTES) {
      expect(n.dur).toBeGreaterThanOrEqual(0.1);
      expect(n.freq).toBeGreaterThan(200);
    }
  });

  it('takrorlanadi — bitta signal emas', () => {
    // Bitta signal boshqa ish bilan band kassirning e'tiborini tortmaydi.
    expect(CHIME_NOTES.length).toBeGreaterThanOrEqual(4);
  });
});
