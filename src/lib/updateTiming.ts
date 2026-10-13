export interface InstallSafetyInput {
  /** Kassir PIN bilan kirgan (kirish ekrani ko'rinib turgan bo'lsa — yo'q). */
  isLoggedIn: boolean;
  /** Tugallanmagan chek yoki javob kutayotgan chaqiruv bor. */
  hasLiveWork: boolean;
  /** Serverga hali yetib bormagan amal navbatda turibdi. */
  hasQueuedActions: boolean;
}

/**
 * Yangilanishni hozir o'rnatish mumkinmi.
 *
 * O'rnatuvchi ilovani yopib qayta ochadi. Savatlar diskda saqlanadi, shuning
 * uchun hech narsa yo'qolmaydi — lekin kassir ekran oldida turgan paytda
 * oyna yo'qolib, PIN qayta so'ralsa xizmat to'xtaydi. Navbatdagi amal ham
 * qayta ochilgandan keyingina ketadi, ya'ni uning ketishi kechikadi.
 *
 * Kirish ekranida (hech kim ishlamayotgan paytda) esa o'rnatish xavfsiz:
 * yopilganini hech kim sezmaydi.
 *
 * Qoida shu yerda, `App.tsx` da emas: komponent ichidagi qoidani sinab
 * bo'lmaydi va u nusxalari bilan ajralib ketadi.
 */
export function isSafeToInstall(input: InstallSafetyInput): boolean {
  if (!input.isLoggedIn) return true;
  return !input.hasLiveWork && !input.hasQueuedActions;
}
