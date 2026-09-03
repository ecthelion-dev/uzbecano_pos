/**
 * Ofitsiant chaqirig'i eshitiladi.
 *
 * Chaqiruv ilgari faqat stol kartochkasida nuqta bo'lib ko'rinardi. Kassir
 * ekranga qaramay turgan bo'lsa — va chaqiruv aynan shunda keladi — mehmon
 * kutib o'tiraverardi. Tugmaning butun ma'nosi eshitilishida.
 */

/**
 * Yangi paydo bo'lgan chaqiruvlar.
 *
 * Ovoz FAQAT yangi chaqiruvda chiqadi. Har so'rovda chalinsa, javobsiz
 * chaqiruv beshinchi daqiqada kassirni ilovaning ovozini butunlay o'chirishga
 * majbur qilardi — keyingi chaqiruvlar esa jimgina o'tardi.
 *
 * Solishtirish nomni normallashtirib qilinadi: server "Bar 1", kassa esa
 * "bar 1" deb yozishi mumkin va o'shanda bitta chaqiruv ikki marta yangi
 * bo'lib ko'rinardi.
 */
export function newWaiterCalls(previous: string[], current: string[]): string[] {
  const seen = new Set(previous.map(norm));
  const out: string[] = [];
  const added = new Set<string>();
  for (const c of current) {
    const key = norm(c);
    if (!key || seen.has(key) || added.has(key)) continue;
    added.add(key);
    out.push(c);
  }
  return out;
}

function norm(s: string): string {
  return String(s ?? '').trim().toLowerCase();
}

/** Bitta nota: qachon boshlanadi, qaysi balandlikda, qancha turadi (soniya). */
export interface ChimeNote {
  at: number;
  freq: number;
  dur: number;
}

/**
 * Chaqiruv ohangi.
 *
 * Uch marta takrorlanadigan ikki notali "din-don". Takrorlanishi ataylab:
 * bitta signal zalning shovqinida yo'qoladi, uzluksiz cho'zilgan ovoz esa
 * bezovta qiladi. Uch marta — kassir boshqa ish bilan band bo'lsa ham
 * boshini ko'tarishga yetadi, lekin hali "o'chir" degani emas.
 *
 * Pastdan yuqoriga: yuqoriga ko'tarilgan ohang savol kabi eshitiladi va
 * javob kutayotgani bilinadi.
 */
export const CHIME_NOTES: ChimeNote[] = [
  { at: 0.00, freq: 784, dur: 0.30 },
  { at: 0.30, freq: 1047, dur: 0.42 },

  { at: 0.90, freq: 784, dur: 0.30 },
  { at: 1.20, freq: 1047, dur: 0.42 },

  { at: 1.80, freq: 784, dur: 0.30 },
  { at: 2.10, freq: 1047, dur: 0.55 },
];

/** Ohang qancha davom etadi, millisekundda. */
export function chimeDurationMs(notes: ChimeNote[] = CHIME_NOTES): number {
  return Math.round(Math.max(...notes.map((n) => n.at + n.dur)) * 1000);
}

/**
 * Chaqiruv ohangini chaladi.
 *
 * Ovoz fayl emas, WebAudio bilan yasaladi: ilovaga binar asset qo'shish va
 * uni yuklanishini kutish bitta signal uchun ortiqcha, va fayl yuklanmay
 * qolsa chaqiruv jimgina o'tardi.
 *
 * Brauzer foydalanuvchi hech narsa bosmaguncha ovozni bloklashi mumkin;
 * kassada kirish paytida bosilgan bo'ladi, lekin baribir hech narsa
 * otmasligi kerak — chaqiruv ekranda ham ko'rinadi.
 */
export function playCallChime(): void {
  try {
    const Ctx: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;

    for (const note of CHIME_NOTES) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Uchburchak to'lqin sof sinusdan ko'ra "qo'ng'iroq"roq eshitiladi va
      // kvadratdek quloqni qichitmaydi.
      osc.type = 'triangle';
      osc.frequency.value = note.freq;

      const t = now + note.at;
      // Tez ko'tarilib, sekin so'nadi — qo'ng'iroq shunday tovush chiqaradi.
      // Keskin uzilish esa "chirq" bo'lib eshitiladi.
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.dur + 0.02);
    }

    // Kontekst ochiq qolsa qurilma har chaqiruvda bittasini to'playdi.
    window.setTimeout(
      () => { void ctx.close().catch(() => undefined); },
      chimeDurationMs() + 400,
    );
  } catch {
    // Ovoz chiqmadi. Chaqiruv ekranda baribir ko'rinadi.
  }
}
