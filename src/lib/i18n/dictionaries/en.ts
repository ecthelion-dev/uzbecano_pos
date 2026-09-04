import type { TranslationKey } from './uz';

/** Inglizcha. Kalitlari `uz.ts` bilan bir xil bo'lishi shart. */
export const en: Record<TranslationKey, string> = {
  // ── Common ──────────────────────────────────────────────────────────
  'common.close': 'Close',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.back': 'Back',
  'common.loading': 'Loading...',
  'common.search': 'Search',
  'common.total': 'Total:',
  'common.totalUpper': 'TOTAL:',
  'common.reload': 'Reload',
  'common.logout': 'Log out',
  'common.print': 'PRINT',
  'common.noData': 'No data',
  'common.cash': 'Cash',
  'common.card': 'Card',
  'common.mixed': 'Split',
  'common.cashLabel': 'Cash:',
  'common.cardLabel': 'Card:',
  'common.currency': 'UZS',

  // ── Login ───────────────────────────────────────────────────────────
  'login.pinPrompt': 'Enter the waiter PIN',
  'login.cafeSetup': 'Cafe / branch setup',
  'login.cafePlaceholder': 'e.g. uzbecano, safia',
  'login.cafeIdLabel': 'Cafe ID (slug):',
  'login.cafeIdHint': 'Enter the cafe identifier registered in the admin panel.',
  'login.changeCafe': 'Change cafe',

  // ── Header ──────────────────────────────────────────────────────────
  'header.tables': 'TABLES',
  'header.menu': 'MENU',
  'header.archive': 'ARCHIVE',
  'header.tablesTitle': 'Table floor',
  'header.menuTitle': 'Menu and till',
  'header.archiveTitle': 'Archive',
  'header.printerTitle': 'Thermal printer and receipt settings',
  'header.waiterCallTitle': 'Waiter call',

  // ── Cart and payment ────────────────────────────────────────────────
  'cart.empty': 'The cart is empty',
  'cart.emptyHint': 'Pick a dish from the menu',
  'cart.itemsTotal': 'Items total:',
  'cart.sendToKitchen': 'CONFIRM ORDER',
  'cart.payAndClose': 'PAY AND CLOSE',
  'cart.paymentType': 'Payment method:',
  'cart.receipt': 'Order receipt',
  'cart.printReceipt': 'PRINT RECEIPT',
  'cart.moveTable': 'MOVE',
  'cart.sentItems': 'Sent to the kitchen',
  'cart.newItems': 'Newly added items',
  'cart.kitchenNote': 'Note for the kitchen (e.g. no onion, spicy...)',

  // ── Dish options ────────────────────────────────────────────────────
  'modifier.size': 'Size / portion:',
  'modifier.addons': 'Extras:',
  'modifier.note': 'Note for the kitchen (e.g. no onion, spicier...)',
  'modifier.addToCart': 'Add to cart',

  // ── Split payment ───────────────────────────────────────────────────
  'mixed.title': 'Split payment amount',
  'mixed.totalDue': 'Total due:',
  'mixed.full': 'Full',
  'mixed.ready': 'DONE',

  // ── Tables ──────────────────────────────────────────────────────────
  'table.busy': 'BUSY',
  'table.free': 'FREE',
  'table.waiterCall': 'Waiter call',
  'table.moveTitle': 'Move / merge table',
  'table.selectTable': 'Select a table...',
  'table.move': 'Move',
  'table.merge': 'Merge',

  // ── Unsaved cart ────────────────────────────────────────────────────
  'unsaved.title': 'There are unsent items!',
  'unsaved.cartTotal': 'Cart total:',
  'unsaved.table': 'Table:',
  'unsaved.confirmClose': 'Confirm and close',

  // ── Archive ─────────────────────────────────────────────────────────
  'archive.title': 'Receipt archive',
  'archive.subtitle': 'History of every closed payment and receipt',
  'archive.searchPlaceholder': 'Table number, receipt ID or waiter...',
  'archive.periodStart': 'From:',
  'archive.periodEnd': 'To:',
  'archive.found': 'Found:',
  'archive.backToToday': 'Back to today',
  'archive.reset': 'Reset',
  'archive.nothingInPeriod': 'No receipts in the selected period',
  'archive.tryAnotherPeriod': 'Try another date or range',
  'archive.printReport': 'Print report',
  'archive.printReportHint': 'Print every receipt in the selected period as one report',
  'archive.backToList': 'Back to the list',
  'archive.noItems': 'No item details',
  'archive.paid': 'PAID',
  'archive.refunded': 'REFUNDED',
  'archive.refundedShort': 'Refunded',
  'archive.closed': 'Closed',
  'archive.totalPaid': 'TOTAL PAID:',
  'archive.refund': 'REFUND',
  'archive.refundReason': 'Choose a refund reason:',
  'archive.confirmAdminPin': 'CONFIRM (ADMIN PIN)',
  'archive.printReceipt': 'PRINT RECEIPT',

  // ── Cash drawer ─────────────────────────────────────────────────────
  'drawer.title': 'Cash in and cash out',
  'drawer.subtitle': 'Float, collection and expenses',
  'drawer.addMovement': 'Add a movement',
  'drawer.income': 'CASH IN',
  'drawer.expense': 'CASH OUT',
  'drawer.incomeTitle': 'Cash into the till',
  'drawer.expenseTitle': 'Cash out of the till',
  'drawer.amountPlaceholder': 'Amount (e.g. 50000)',
  'drawer.reasonPlaceholder': 'Reason (e.g. change float...)',
  'drawer.totalIncome': 'Total in (+)',
  'drawer.totalExpense': 'Total out (-)',
  'drawer.netDiff': 'Net difference',
  'drawer.todayHistory': "Today's movements",
  'drawer.empty': 'No till movements recorded today',
  'drawer.needReason': 'Enter a reason for the cash in or out!',

  // ── Shift report ────────────────────────────────────────────────────
  'shift.title': 'Till report (Z-Report)',
  'shift.subtitle': "Today's till and waiter report",
  'shift.empty': 'No orders closed today',
  'shift.netRevenue': 'Net revenue',
  'shift.refundsTotal': 'Total refunds',
  'shift.drawerIn': 'Cash in (+):',
  'shift.drawerOut': 'Cash out (-):',
  'shift.tableCount': 'Tables served',
  'shift.waiterRevenue': 'Revenue by waiter',
  'shift.print': 'PRINT Z-REPORT',

  // ── Dashboard ───────────────────────────────────────────────────────
  'dash.revenue': 'Total revenue',
  'dash.orderCount': 'Order count',
  'dash.revenue7d': 'Revenue over 7 days',
  'dash.hourly': 'Orders by hour',
  'dash.orderStatus': 'Order statuses',
  'dash.topDishes': 'Most popular dishes',
  'dash.topDishesDetail': 'Top dishes — detailed',
  'dash.dishName': 'Dish name',
  'dash.paymentMethods': 'Payment methods',

  // ── Printer settings ────────────────────────────────────────────────
  'printer.title': 'Thermal printer and receipt settings',
  'printer.subtitle': 'Receipt printing for the till and the kitchen',
  'printer.typeAndConnection': 'Printer type and connection:',
  'printer.paperWidth': 'Paper width (roll size):',
  'printer.width58': '58mm (narrow roll)',
  'printer.width80': '80mm (wide roll)',
  'printer.connect': 'Connect the till printer',
  'printer.connected': 'Connected:',
  'printer.active': 'Active',
  'printer.testReceipt': 'Test receipt',
  'printer.headerText': 'Text at the top of the receipt:',
  'printer.footerText': 'Thank-you text at the bottom:',
  'printer.autoPrint': 'Automatic printing:',
  'printer.autoOnPayment': 'Print the receipt automatically on payment',
  'printer.autoOnPaymentHint': 'Prints the guest receipt when the bill is closed',
  'printer.kitchenAuto': 'Kitchen slip — automatic',
  'printer.kitchenAutoHint': 'Prints as soon as the order is confirmed',
  'printer.qrToKitchen': 'Print QR orders in the kitchen',
  'printer.cashDrawer': 'Open the cash drawer',
  'printer.cashDrawerHint': 'Opens the drawer on a cash payment',
  'printer.headerPlaceholder': 'Welcome!',
  'printer.footerPlaceholder': 'Thank you for visiting!',
  'printer.kioskHint': 'Or open Chrome in kiosk mode.',
  'printer.systemDefault': 'System default printer',

  // ── Receipt preview ─────────────────────────────────────────────────
  'receipt.preview': 'Receipt preview',
  'receipt.noItems': 'No items',

  // ── Network ─────────────────────────────────────────────────────────
  'net.online': 'Online',
  'net.offline': 'Offline',
  'net.startSync': 'Start syncing',

  // ── Frozen ──────────────────────────────────────────────────────────
  'frozen.title': 'The till is temporarily frozen',
  'frozen.badge': 'Frozen',
  'frozen.toAdmin': 'Go to the admin panel (payment)',
  'frozen.recheck': 'Check again (refresh)',
  'frozen.support': 'Telegram support',

  // ── Security ────────────────────────────────────────────────────────
  'admin.pinTitle': 'Security confirmation',
  'kitchen.cancelNeedsPin': 'Cancel (admin PIN required)',

  // ── Update ──────────────────────────────────────────────────────────
  'update.later': 'Later',
  'update.restart': 'Restart',
  'update.hint': 'The app restarts to install — tap when the tables are clear.',

  // ── Toasts ──────────────────────────────────────────────────────────
  'toast.sentToKitchen': 'The order has gone to the kitchen!',
  'toast.receiptQueued': 'The receipt was sent to the till printer',
  'toast.noMenu': 'No categories or products found in the database',

  // ── Language ────────────────────────────────────────────────────────
  'lang.change': 'Change language',
};
