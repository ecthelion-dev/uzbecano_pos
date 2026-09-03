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

/**
 * Diqqat tortadigan qisqa signal.
 *
 * Ovoz fayl emas, WebAudio bilan yasaladi: bitta bipni yetkazish uchun
 * ilovaga binar asset qo'shish va uni yuklanishini kutish ortiqcha.
 *
 * Ikkita qisqa nota — bitta bip xo'jalik shovqinida yo'qoladi, uzun signal
 * esa bezovta qiladi. Brauzer foydalanuvchi hech narsa bosmaguncha ovozni
 * bloklashi mumkin; kassada kirish paytida bosilgan bo'ladi, lekin baribir
 * hech narsa otmasligi kerak — chaqiruv ekranda ham ko'rinadi.
 */
export function playCallChime(): void {
  try {
    const Ctx: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;

    for (const [at, freq] of [[0, 880], [0.18, 1175]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Boshi va oxiri yumshoq: keskin uzilish "chirq" bo'lib eshitiladi.
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + at + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.16);
    }

    // Kontekst ochiq qolsa qurilma har chaqiruvda bittasini to'playdi.
    window.setTimeout(() => { void ctx.close().catch(() => undefined); }, 800);
  } catch {
    // Ovoz chiqmadi. Chaqiruv ekranda baribir ko'rinadi.
  }
}
