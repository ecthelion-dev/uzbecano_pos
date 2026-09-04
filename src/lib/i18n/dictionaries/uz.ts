/**
 * O'zbekcha — MANBA lug'at.
 *
 * Qolgan ikkitasi shu faylning kalitlariga qarab tiplanadi: kalit bu yerga
 * qo'shilib, boshqasiga qo'shilmasa, kassa yig'ilmaydi. Tarjimasi unutilgan
 * matn xodimning ekraniga chiqib ketmasligi uchun.
 *
 * BU YERDA YO'Q: printerdan chiqadigan qog'oz matni. Chek va oshxona
 * kvitansiyasi — fizik hujjat, oshxona ularga qarab ishlaydi va kassirning
 * ekran tili ularni o'zgartirmasligi kerak. Ular `printer.ts` da qoladi.
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
  'common.totalUpper': 'JAMI:',
  'common.reload': 'Qayta yuklash',
  'common.logout': 'Chiqish',
  'common.print': 'CHOP ETISH',
  'common.noData': "Ma'lumot yo'q",
  'common.cash': 'Naqd',
  'common.card': 'Karta',
  'common.mixed': 'Aralash',
  'common.cashLabel': 'Naqd:',
  'common.cardLabel': 'Karta:',
  'common.currency': "so'm",

  // ── Kirish ──────────────────────────────────────────────────────────
  'login.pinPrompt': 'Ofitsiant PIN kodini kiriting',
  'login.cafeSetup': 'Kafe / Filialni sozlash',
  'login.cafePlaceholder': 'masalan: uzbecano, safia',
  'login.cafeIdLabel': 'Kafe ID (slug):',
  'login.cafeIdHint': "Admin panelda ro'yxatdan o'tgan kafe identifikatorini kiriting.",
  'login.changeCafe': "Kafeni o'zgartirish",

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
  'cart.printReceipt': 'CHEK CHIQARISH',
  'cart.moveTable': "KO'CHIRISH",
  'cart.sentItems': 'Oshxonaga yuborilgan taomlar',
  'cart.newItems': "Yangi qo'shilayotgan taomlar",
  'cart.kitchenNote': 'Oshxonaga izoh (masalan: piyozsiz, achchiq...)',

  // ── Taom sozlamalari ────────────────────────────────────────────────
  'modifier.size': "O'lcham / Porsiya:",
  'modifier.addons': "Qo'shimchalar:",
  'modifier.note': 'Oshxonaga izoh yozing (masalan: piyozsiz, achchiqroq...)',
  'modifier.addToCart': "Savatga qo'shish",

  // ── Aralash to'lov ──────────────────────────────────────────────────
  'mixed.title': "Aralash To'lov Miqdori",
  'mixed.totalDue': "Jami to'lov:",
  'mixed.full': "To'liq",
  'mixed.ready': 'TAYYOR',

  // ── Stollar ─────────────────────────────────────────────────────────
  'table.busy': 'BAND',
  'table.free': 'BOSH',
  'table.waiterCall': 'Ofitsiant chaqiruvi',
  'table.moveTitle': "Stolni Ko'chirish / Birlashtirish",
  'table.selectTable': 'Stolni tanlang...',
  'table.move': "Ko'chirish (Move)",
  'table.merge': 'Birlashtirish (Merge)',

  // ── Saqlanmagan savat ───────────────────────────────────────────────
  'unsaved.title': 'Yuborilmagan taomlar bor!',
  'unsaved.cartTotal': 'Savat summasi:',
  'unsaved.table': 'Stol:',
  'unsaved.confirmClose': 'Tasdiqlash va Yopish',

  // ── Arxiv ───────────────────────────────────────────────────────────
  'archive.title': 'Arxiv cheklar',
  'archive.subtitle': "Barcha yopilgan to'lovlar va cheklar tarixi",
  'archive.searchPlaceholder': 'Stol raqami, chek ID yoki ofitsiant...',
  'archive.periodStart': 'Boshlanish:',
  'archive.periodEnd': 'Tugash:',
  'archive.found': 'Topildi:',
  'archive.backToToday': 'Bugunga qaytarish',
  'archive.reset': "Qayta o'rnatish",
  'archive.nothingInPeriod': 'Tanlangan vaqt oralig‘ida cheklar topilmadi',
  'archive.tryAnotherPeriod': 'Boshqa sana yoki vaqt oralig‘ini tanlab ko‘ring',
  'archive.printReport': 'Hisobotni chop etish',
  'archive.printReportHint': 'Tanlangan davrdagi barcha cheklarni bitta hisobot qilib chop etish',
  'archive.backToList': "Ro'yxatga qaytish",
  'archive.noItems': "Taomlar ma'lumoti yo'q",
  'archive.paid': "TO'LANGAN",
  'archive.refunded': 'QAYTARILGAN',
  'archive.refundedShort': 'Qaytarilgan',
  'archive.closed': 'Yopilgan',
  'archive.totalPaid': "JAMI TO'LOV:",
  'archive.refund': 'QAYTARISH',
  'archive.refundReason': 'Qaytarish sababini tanlang:',
  'archive.confirmAdminPin': 'TASDIQLASH (ADMIN PIN)',
  'archive.printReceipt': 'CHEKNI CHOP ETISH',

  // ── Kassa qutisi ────────────────────────────────────────────────────
  'drawer.title': 'Kassa kirim va chiqim harakatlari',
  'drawer.subtitle': 'Mayda pul olish, kassa inkasatsiyasi va xarajatlar',
  'drawer.addMovement': "Yangi harakat qo'shish",
  'drawer.income': 'KIRIM',
  'drawer.expense': 'CHIQIM',
  'drawer.incomeTitle': "Kassa kirim (to'lov)",
  'drawer.expenseTitle': 'Kassa chiqim (xarajat)',
  'drawer.amountPlaceholder': 'Summa (masalan: 50000)',
  'drawer.reasonPlaceholder': 'Sababi (masalan: Mayda pul olish...)',
  'drawer.totalIncome': 'Jami kirim (+)',
  'drawer.totalExpense': 'Jami chiqim (-)',
  'drawer.netDiff': 'Sof farq',
  'drawer.todayHistory': 'Bugungi harakatlar tarixi',
  'drawer.empty': 'Bugun kassa harakatlari qayd etilmagan',
  'drawer.needReason': 'Xarajat yoki kirim sababini kiriting!',

  // ── Smena hisoboti ──────────────────────────────────────────────────
  'shift.title': 'Kassa hisoboti (Z-Report)',
  'shift.subtitle': 'Bugungi kunlik kassa va ofitsiantlar hisoboti',
  'shift.empty': "Bugun yopilgan buyurtmalar yo'q",
  'shift.netRevenue': 'Sof tushum',
  'shift.refundsTotal': 'Jami qaytarishlar',
  'shift.drawerIn': 'Kassa kirim (+):',
  'shift.drawerOut': 'Kassa chiqim (-):',
  'shift.tableCount': 'Stollar soni',
  'shift.waiterRevenue': 'Ofitsiantlar tushumi',
  'shift.print': 'Z-REPORT CHOP ETISH',

  // ── Boshqaruv paneli ────────────────────────────────────────────────
  'dash.revenue': 'Jami tushum',
  'dash.orderCount': 'Buyurtma soni',
  'dash.revenue7d': '7 kunlik tushum dinamikasi',
  'dash.hourly': 'Soatlik buyurtmalar',
  'dash.orderStatus': 'Buyurtmalar holati',
  'dash.topDishes': 'Eng mashhur taomlar',
  'dash.topDishesDetail': 'Eng yaxshi taomlar – batafsil',
  'dash.dishName': 'Taom nomi',
  'dash.paymentMethods': "To'lov usullari",

  // ── Printer sozlamalari ─────────────────────────────────────────────
  'printer.title': 'Termoprinter va chek sozlamalari',
  'printer.subtitle': 'PWA kassa va oshxona uchun chek chiqarish',
  'printer.typeAndConnection': 'Printer turi va ulanish:',
  'printer.paperWidth': "Qog'oz kengligi (lenta o'lchami):",
  'printer.width58': '58mm (kichik lenta)',
  'printer.width80': '80mm (katta kassa)',
  'printer.connect': 'Kassa printerini ulang',
  'printer.connected': 'Ulangan:',
  'printer.active': 'Faol',
  'printer.testReceipt': 'Sinov cheki',
  'printer.headerText': 'Chek tepasidagi matn:',
  'printer.footerText': 'Chek pastidagi minnatdorchilik matni:',
  'printer.autoPrint': 'Avtomatik chop etish:',
  'printer.autoOnPayment': "To'lovda avtomatik chek chiqarish",
  'printer.autoOnPaymentHint': 'Hisob yopilganda mijozga chek chop etadi',
  'printer.kitchenAuto': 'Oshxona kvitansiyasi — avtomatik',
  'printer.kitchenAutoHint': 'Buyurtma tasdiqlanishi bilan oshxonaga chiqadi',
  'printer.qrToKitchen': 'QR buyurtmani oshxonaga chiqarish',
  'printer.cashDrawer': 'Kassa qutisini ochish (Cash Drawer)',
  'printer.cashDrawerHint': "Naqd to'lovda temir kassa qutisini ochadi",
  // Chek matnining NAMUNASI — kafe o'zi yozadigan matn uchun ishora.
  'printer.headerPlaceholder': 'Xush kelibsiz!',
  'printer.footerPlaceholder': 'Tashrifingiz uchun rahmat!',
  'printer.kioskHint': 'Yoki Chrome‘ni kiosk rejimida oching.',
  'printer.systemDefault': 'Tizimning standart printeri',

  // ── Chek ko'rish ────────────────────────────────────────────────────
  'receipt.preview': "Chekni oldindan ko'rish",
  'receipt.noItems': "Taomlar yo'q",

  // ── Tarmoq ──────────────────────────────────────────────────────────
  'net.online': 'Online',
  'net.offline': 'Offline',
  'net.startSync': 'Sinxlashni boshlash',

  // ── Muzlatilgan kafe ────────────────────────────────────────────────
  'frozen.title': 'Kassa vaqtincha muzlatilgan',
  'frozen.badge': 'Muzlatilgan',
  'frozen.toAdmin': "Admin panelga o'tish (to'lov qilish)",
  'frozen.recheck': 'Qayta tekshirish (yangilash)',
  'frozen.support': "Telegram qo'llab-quvvatlash",

  // ── Xavfsizlik ──────────────────────────────────────────────────────
  'admin.pinTitle': "Xavfsizlik tasdig'i",
  'kitchen.cancelNeedsPin': 'Bekor qilish (admin PIN talab qilinadi)',

  // ── Yangilanish ─────────────────────────────────────────────────────
  'update.later': 'Keyinroq',
  'update.restart': 'Qayta ishga tushirish',
  'update.hint': 'O‘rnatish uchun ilova qayta ishga tushadi — stollar bo‘shaganda bosing.',

  // ── Bildirishnomalar ────────────────────────────────────────────────
  'toast.sentToKitchen': 'Buyurtma oshxonaga yuborildi!',
  'toast.receiptQueued': 'Chek kassa printeriga yuborildi',
  'toast.noMenu': 'Bazada kategoriyalar yoki mahsulotlar topilmadi',

  // ── Til ─────────────────────────────────────────────────────────────
  'lang.change': "Tilni o'zgartirish",
} as const;

export type TranslationKey = keyof typeof uz;
