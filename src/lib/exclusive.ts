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
export function createExclusive() {
  let busy = false;

  return async function runExclusive<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    busy = true;
    try {
      return await task();
    } finally {
      // Xato bo'lsa ham bo'shaydi: aks holda bitta uzilish tugmani
      // butunlay qotirib qo'yardi.
      busy = false;
    }
  };
}
