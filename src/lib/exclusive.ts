/**
 * Bir vaqtda bitta bajarilish.
 *
 * Insident (2026-10-05): oshxona cheki ham, to'lov cheki ham ikki marta
 * chiqdi. Server logida bitta stolning to'lovi 1 soniyada UCHTA PATCH
 * yuborgan edi (qolgan barcha yopishlarda bitta). "Tasdiqlash" va "To'lov"
 * tugmalari tarmoq javobini kutayotgan paytda yana bosilsa, funksiya ikkinchi
 * marta ishga tushardi va har bir nusxa o'z chekini bosardi: tugma javob
 * kelguncha ham, savat bo'shaguncha ham bosiladigan holatda turardi.
 *
 * Birinchi chaqiruv tugamaguncha keyingilari JIMGINA o'tkazib yuboriladi
 * (kutib turilmaydi): ikkinchi bosish "yana bir marta" degani emas, balki
 * birinchisi sekin ishlayotgani.
 */
export interface Exclusive {
  <T>(task: () => Promise<T>): Promise<T | undefined>;
  /**
   * Hozirgi bajarilish tugashini kutadi; hech narsa ishlamayotgan bo'lsa
   * darhol qaytadi. Xato bilan tugasa ham bo'shaydi (xatoni chaqiruvchi
   * o'zi oladi, bu yerda takrorlanmaydi).
   *
   * O'tkazib yuborilgan chaqiruv `undefined` ni DARHOL qaytaradi — ishning
   * tugaganini bildirmaydi. Natijaga tayanadigan keyingi qadam (to'lov
   * oynasi) shuni kutishi kerak.
   */
  idle(): Promise<void>;
}

export function createExclusive(): Exclusive {
  let current: Promise<void> | null = null;

  const runExclusive = async function <T>(task: () => Promise<T>): Promise<T | undefined> {
    // Tekshirish va band qilish bitta sinxron qadamda: async funksiya
    // birinchi `await` gacha to'xtamaydi.
    if (current) return undefined;
    let release!: () => void;
    current = new Promise<void>((resolve) => { release = resolve; });
    try {
      return await task();
    } finally {
      // Xato bo'lsa ham bo'shaydi: aks holda bitta uzilish tugmani
      // butunlay qotirib qo'yardi.
      current = null;
      release();
    }
  } as Exclusive;

  runExclusive.idle = () => current ?? Promise.resolve();
  return runExclusive;
}
