/**
 * "To'lov va yopish": saqlanmagan savat avval serverga yetadi, to'lov oynasi
 * shundan KEYIN ochiladi.
 *
 * Insident (2026-10-16 22:18): savatda taom bor stolda "To'lov" bosildi.
 * Kassa savatni oshxonaga yuborib, javobni kutmasdan to'lov oynasini ochdi.
 * Kassir summani darhol tasdiqladi — chek hali serverdan qaytmagan edi,
 * to'lov stolni bo'sh deb ko'rib IKKINCHI chek ochdi. Server uni "stol band"
 * deb rad etdi (409), to'lov o'sha mavjud bo'lmagan chekka ketib 404 oldi:
 * pul kassada, serverdagi haqiqiy chek esa ochiq va to'lanmagan qoldi.
 *
 * Ikkinchi bosish ham kutadi: yuborish allaqachon ketayotgan bo'lsa,
 * `send` o'tkazib yuboriladi va darhol qaytadi — shuning uchun oyna
 * `waitIdle` bilan, ya'ni birinchi yuborish tugagach ochiladi.
 */
export interface CheckoutFlowPorts {
  hasUnsavedCart: boolean;
  send: () => Promise<unknown>;
  waitIdle: () => Promise<void>;
  openPayment: () => void;
}

export async function openPaymentAfterDispatch(ports: CheckoutFlowPorts): Promise<void> {
  try {
    if (ports.hasUnsavedCart) await ports.send();
    await ports.waitIdle();
  } finally {
    // Yuborish xato bersa ham to'lov ochiladi: taom navbatga tushgan
    // (oflayn yo'l) va mijoz kutib turibdi. Muhimi — yuborish tugagan.
    ports.openPayment();
  }
}
