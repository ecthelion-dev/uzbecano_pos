/**
 * O'zbekcha — MANBA lug'at.
 *
 * Qolgan ikkitasi shu faylning kalitlariga qarab tiplanadi: kalit bu yerga
 * qo'shilib, boshqasiga qo'shilmasa, kassa yig'ilmaydi. Tarjimasi unutilgan
 * matn xodimning ekraniga chiqib ketmasligi uchun.
 */
export const uz = {
  // ── Umumiy ──────────────────────────────────────────────────────────
  'common.close': 'Yopish',
  'common.save': 'Saqlash',
  'common.cancel': 'Bekor qilish',
  'common.confirm': 'Tasdiqlash',
  'common.delete': "O'chirish",
  'common.back': 'Orqaga',
  'common.loading': 'Yuklanmoqda...',
  'common.search': 'Qidirish',
  'common.total': 'Jami:',
  'common.reload': 'Qayta yuklash',
  'common.logout': 'Chiqish',

  // ── Kirish ──────────────────────────────────────────────────────────
  'login.pinPrompt': 'Ofitsiant PIN kodini kiriting',
  'login.cafeSetup': 'Kafe / Filialni sozlash',
  'login.cafePlaceholder': 'masalan: uzbecano, safia',
  'login.wrongPin': "PIN noto'g'ri",

  // ── Sarlavha ────────────────────────────────────────────────────────
  'header.tables': 'STOLLAR',
  'header.menu': 'MENYU',
  'header.archive': 'ARXIV',
  'header.tablesTitle': 'Stollar zali',
  'header.menuTitle': 'Menyu va kassa',
  'header.archiveTitle': 'Arxiv',
  'header.printerTitle': 'Termoprinter va chek sozlamalari',
  'header.waiterCallTitle': 'Ofitsiant chaqiruvi',

  // ── Savat va to'lov ─────────────────────────────────────────────────
  'cart.empty': "Savat bo'sh",
  'cart.emptyHint': 'Menyudan taom tanlang',
  'cart.itemsTotal': 'Jami taomlar:',
  'cart.sendToKitchen': 'BUYURTMANI TASDIQLASH',
  'cart.payAndClose': "TO'LOV VA YOPISH",
  'cart.paymentType': "To'lov turi:",
  'cart.receipt': 'Buyurtma kvitansiyasi',

  // ── Til ─────────────────────────────────────────────────────────────
  'lang.change': "Tilni o'zgartirish",
} as const;

export type TranslationKey = keyof typeof uz;
