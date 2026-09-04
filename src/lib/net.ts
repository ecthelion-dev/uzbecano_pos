/**
 * Kassa uchun cheklangan kutish bilan `fetch`.
 *
 * Kassaning har bir so'rovi kassir tugmani bosib turgan paytda ketadi.
 * Internet uzilganda `fetch` HAR DOIM ham darhol yiqilmaydi: router
 * ishlayapti, Wi-Fi ulangan, lekin tashqariga chiqmaydi — kafedagi eng ko'p
 * uchraydigan holat. O'shanda so'rov na javob, na xato beradi va bir necha
 * o'n soniya osilib turadi.
 *
 * Kassa uchun bu shunchaki sekinlik emas. Chek to'lov so'rovidan KEYIN
 * bosilardi, ya'ni osilgan so'rov qog'ozni ham to'xtatib qo'yardi: kassir
 * stolni yopadi, chek chiqmaydi va nima bo'layotgani ham ko'rinmaydi.
 *
 * Vaqt tugaganda so'rov uziladi va xato otiladi — chaqiruvchi uchun bu
 * tarmoq yiqilganidan farq qilmaydi. Har bir chaqiruv joyida esa u holat
 * allaqachon hisobga olingan: amal navbatga yoziladi va aloqa tiklanganda
 * o'zi ketadi.
 */

/** Oddiy amal uchun. Kassir bu qadar kutishga rozi bo'ladigan eng uzun vaqt. */
export const TILL_TIMEOUT_MS = 8000;

/**
 * Hisobot uchun uzunroq.
 *
 * Bir oylik davr hisobotini server rostdan ham uzoq yig'ishi mumkin. Uni
 * erta uzsak, hisobot keshdagi ma'lumotdan chiqadi va TO'G'RIDEK ko'rinadi —
 * kassir noto'g'ri raqamni ko'radi. Sekin javob buzuq javobdan yaxshi.
 */
export const REPORT_TIMEOUT_MS = 25000;

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms: number = TILL_TIMEOUT_MS,
): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: abort.signal });
  } finally {
    clearTimeout(timer);
  }
}
