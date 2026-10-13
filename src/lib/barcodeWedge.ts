/** Skaner belgilari orasidagi eng uzun tanaffus. Skaner 5–30 ms, odam 100 ms dan sekin. */
export const WEDGE_MAX_GAP_MS = 50;

/** Eng qisqa kod. Undan qisqasi tasodifiy tugma bosish bo'lishi mumkin. */
export const WEDGE_MIN_LENGTH = 4;

export interface WedgeReader {
  /** Bosilgan tugmani beradi; skaner kodi tugagan bo'lsa (Enter) kodni qaytaradi. */
  push(key: string, at: number): string | null;
}

/**
 * USB skaner (klaviatura kabi yozadigan) kodini odam terishidan ajratadi.
 *
 * Skaner belgilarni juda tez yozib, oxirida Enter bosadi. Faqat shu tezlikda
 * kelgan ketma-ketlik kod hisoblanadi: aks holda kassirning har bir Enter
 * bosishi "skanerlangan kod" bo'lib qolardi. Shift kabi modifikatorlar
 * (harfli kodlarda katta harf uchun) e'tiborga olinmaydi.
 */
export function createWedgeReader(
  maxGapMs: number = WEDGE_MAX_GAP_MS,
  minLength: number = WEDGE_MIN_LENGTH,
): WedgeReader {
  let buffer = '';
  let lastAt = Number.NEGATIVE_INFINITY;

  return {
    push(key, at) {
      if (key === 'Enter') {
        const code = buffer;
        const isFast = at - lastAt <= maxGapMs;
        buffer = '';
        lastAt = Number.NEGATIVE_INFINITY;
        return code.length >= minLength && isFast ? code : null;
      }
      // Bitta belgidan uzun nom — modifikator yoki boshqaruv tugmasi (Shift, Tab).
      if (key.length !== 1) return null;

      // Uzun tanaffusdan keyin yangi kod boshlanadi: kassir tasodifan bosgan
      // belgilar skaner kodining boshiga yopishmasin.
      buffer = at - lastAt <= maxGapMs ? buffer + key : key;
      lastAt = at;
      return null;
    },
  };
}
