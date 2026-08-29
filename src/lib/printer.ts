// ESC/POS Thermal Printer Driver
// (Web Bluetooth, Web Serial, system spooler on desktop, and browser print)

import { IS_DESKTOP_APP } from '../constants';

export interface PrinterSettings {
  mode: 'browser' | 'bluetooth' | 'serial';
  /**
   * Desktop ilovada chek yuboriladigan tizim printeri.
   *
   * Bo'sh bo'lsa tizimning standart printeri ishlatiladi — bitta chek
   * printeri bo'lgan kafeda hech nima sozlash kerak emas.
   */
  systemPrinterName?: string;
  paperWidth: '58mm' | '80mm';
  autoPrintReceipt: boolean;
  autoPrintKitchen: boolean;
  headerText: string;
  footerText: string;
  openCashDrawer: boolean;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  mode: 'browser',
  systemPrinterName: '',
  paperWidth: '58mm',
  autoPrintReceipt: true,
  autoPrintKitchen: true,
  headerText: "Xush kelibsiz!",
  footerText: "Tashrifingiz uchun rahmat!",
  openCashDrawer: true,
};

// Bluetooth device instance cache
let activeBluetoothDevice: any = null;
let activeBluetoothCharacteristic: any = null;
let activeSerialPort: any = null;

export function getPrinterSettings(): PrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_SETTINGS;
  try {
    const saved = localStorage.getItem('orderplus_printer_settings');
    if (saved) return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_PRINTER_SETTINGS;
}

export function savePrinterSettings(settings: PrinterSettings) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('orderplus_printer_settings', JSON.stringify(settings));
  }
}

// ESC/POS Byte Commands
const ESC = 0x1B;
const GS = 0x1D;

class EscPosEncoder {
  private buffer: number[] = [];
  private static textEncoder = new TextEncoder();

  init() {
    this.buffer.push(ESC, 0x40); // Initialize printer
    return this;
  }

  align(align: 'left' | 'center' | 'right') {
    const n = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, n);
    return this;
  }

  bold(enable: boolean) {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  size(widthMultiplier: 1 | 2, heightMultiplier: 1 | 2) {
    const n = ((widthMultiplier - 1) << 4) | (heightMultiplier - 1);
    this.buffer.push(GS, 0x21, n);
    return this;
  }

  text(str: string) {
    const bytes = EscPosEncoder.textEncoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str: string = '') {
    if (str) this.text(str);
    this.buffer.push(0x0A); // Line feed
    return this;
  }

  divider(paperWidth: '58mm' | '80mm' = '58mm') {
    const len = paperWidth === '80mm' ? 48 : 32;
    this.align('center');
    this.line('-'.repeat(len));
    this.align('left');
    return this;
  }

  twoColumn(left: string, right: string, paperWidth: '58mm' | '80mm' = '58mm') {
    const totalCols = paperWidth === '80mm' ? 48 : 32;
    const spaceCount = Math.max(1, totalCols - left.length - right.length);
    this.line(left + ' '.repeat(spaceCount) + right);
    return this;
  }

  feed(lines: number = 3) {
    for (let i = 0; i < lines; i++) this.buffer.push(0x0A);
    return this;
  }

  cut() {
    this.feed(3);
    this.buffer.push(GS, 0x56, 66, 0); // Partial cut
    return this;
  }

  kickDrawer() {
    this.buffer.push(ESC, 0x70, 0, 25, 250); // Open cash drawer
    return this;
  }

  encode(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// 1. Connect Bluetooth Printer
export async function connectBluetoothPrinter(): Promise<string> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
    throw new Error("Ushbu brauzerda Web Bluetooth qo'llab-quvvatlanmaydi (Chrome yoki Edge tavsiya etiladi).");
  }

  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [
      { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
      { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] },
      { services: ['e7810a01-73ae-499d-8c15-faa9aef0c3f2'] },
      { namePrefix: 'Printer' },
      { namePrefix: 'POS' },
      { namePrefix: 'XP' },
      { namePrefix: 'RP' },
      { namePrefix: 'MPT' },
    ],
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      'e7810a01-73ae-499d-8c15-faa9aef0c3f2',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    ],
  });

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          activeBluetoothDevice = device;
          activeBluetoothCharacteristic = char;
          return device.name || 'Bluetooth Printer';
        }
      }
    } catch {}
  }

  throw new Error("Printerning yozish kanali topilmadi");
}

// 2. Connect Serial/USB Printer
export async function connectSerialPrinter(): Promise<string> {
  if (typeof navigator === 'undefined' || !(navigator as any).serial) {
    throw new Error("Ushbu brauzerda Web Serial / USB qo'llab-quvvatlanmaydi.");
  }

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });
  activeSerialPort = port;
  return 'USB / Serial Printer';
}

// Raw Send to Connected Device
async function sendRawToPrinter(bytes: Uint8Array): Promise<boolean> {
  // Try Bluetooth first if active
  if (activeBluetoothCharacteristic) {
    try {
      const chunkSize = 512;
      const useNoResponse = activeBluetoothCharacteristic.properties?.writeWithoutResponse;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (useNoResponse) {
          await activeBluetoothCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await activeBluetoothCharacteristic.writeValue(chunk);
        }
      }
      return true;
    } catch (e) {
      console.warn("Bluetooth send failed, reconnecting or falling back:", e);
    }
  }

  // Try Serial next
  if (activeSerialPort && activeSerialPort.writable) {
    try {
      const writer = activeSerialPort.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      return true;
    } catch (e) {
      console.warn("Serial send failed:", e);
    }
  }

  return false;
}

// Build ESC/POS Customer Receipt
export function generateEscPosReceipt(order: any, cafeName: string, settings: PrinterSettings): Uint8Array {
  const enc = new EscPosEncoder();
  enc.init();

  if (settings.openCashDrawer) {
    enc.kickDrawer();
  }

  // Header
  enc.align('center').bold(true).size(2, 2).line(cafeName || 'ORDERPLUS');
  enc.size(1, 1).bold(false);
  if (settings.headerText) enc.line(settings.headerText);
  enc.line(`Buyurtma #${(order.id || '').slice(-6).toUpperCase()}`);
  enc.line(`Sana: ${new Date(order.createdAt || Date.now()).toLocaleString('uz-UZ')}`);
  if (order.tableNumber) enc.bold(true).line(`Stol: ${order.tableNumber}`).bold(false);
  if (order.waiterName) enc.line(`Offitsiant: ${order.waiterName}`);
  
  enc.divider(settings.paperWidth);

  // Items
  enc.bold(true);
  enc.twoColumn('Taom / Narx', 'Jami', settings.paperWidth);
  enc.bold(false);
  enc.divider(settings.paperWidth);

  const items = order.items || [];
  for (const it of items) {
    const name = it.product?.name || it.name || 'Taom';
    const qty = it.quantity || 1;
    const price = it.unitPrice || it.price || 0;
    const sum = it.total || (qty * price);

    enc.bold(true).line(name).bold(false);
    enc.twoColumn(`  ${qty} x ${price.toLocaleString()}`, `${sum.toLocaleString()} so'm`, settings.paperWidth);
    if (it.note) enc.line(`  * Izoh: ${it.note}`);
  }

  enc.divider(settings.paperWidth);

  // Totals
  const subtotal = items.reduce((s: number, i: any) => s + ((i.quantity || 1) * (i.unitPrice || i.price || 0)), 0);
  // `|| 0.1` xizmat haqi nol bo'lgan kafeda ham 10% chiqarardi: nol qiymat
  // JavaScript'da yolg'on hisoblanadi, ya'ni "haqi yo'q" va "haqi berilmagan"
  // bir xil ko'rinardi. Foiz ham qotib qolgan edi — endi haqiqiy summadan
  // hisoblanadi va chekdagi raqam bilan doim mos tushadi.
  const serviceFee = Number.isFinite(Number(order.serviceFee)) ? Number(order.serviceFee) : 0;
  const discount = Number(order.discount) || 0;
  const total = Number.isFinite(Number(order.total)) ? Number(order.total) : subtotal + serviceFee - discount;
  const feePercent = subtotal > 0 ? Math.round((serviceFee / subtotal) * 100) : 0;

  enc.twoColumn('Kichik jami:', `${subtotal.toLocaleString()} so'm`, settings.paperWidth);
  if (discount > 0) {
    enc.twoColumn('Chegirma:', `-${discount.toLocaleString()} so'm`, settings.paperWidth);
  }
  if (serviceFee > 0) {
    enc.twoColumn(`Xizmat (${feePercent}%):`, `${serviceFee.toLocaleString()} so'm`, settings.paperWidth);
  }
  enc.divider(settings.paperWidth);

  enc.align('center').bold(true).size(2, 2).line(`JAMI: ${total.toLocaleString()} SO'M`);
  enc.size(1, 1).bold(false);
  
  // Kassa 'naqd' / 'karta' / 'aralash' yuboradi, bu yerda esa 'cash'
  // tekshirilardi — ya'ni naqd to'lov ham "Plastik karta" bo'lib chiqardi.
  if (order.paymentMethod) {
    const labels: Record<string, string> = {
      naqd: 'Naqd pul',
      cash: 'Naqd pul',
      karta: 'Plastik karta',
      card: 'Plastik karta',
      aralash: 'Aralash',
    };
    enc.line(`To'lov turi: ${labels[String(order.paymentMethod)] || String(order.paymentMethod)}`);

    // Aralash to'lovda qaysi qismi naqd, qaysi qismi karta ekani chekda
    // ko'rinmasa, kassir smena oxirida kassani solishtira olmaydi.
    const cash = Number(order.cashAmount) || 0;
    const card = Number(order.cardAmount) || 0;
    if (cash > 0 && card > 0) {
      enc.twoColumn('  Naqd:', `${cash.toLocaleString()} so'm`, settings.paperWidth);
      enc.twoColumn('  Karta:', `${card.toLocaleString()} so'm`, settings.paperWidth);
    }
  }

  enc.divider(settings.paperWidth);
  if (settings.footerText) enc.align('center').line(settings.footerText);
  enc.align('center').line('OrderPlus POS tizimi');

  enc.cut();
  return enc.encode();
}

// Build ESC/POS Kitchen Slip
export function generateEscPosKitchenSlip(data: any, cafeName: string, settings: PrinterSettings): Uint8Array {
  const enc = new EscPosEncoder();
  enc.init();

  enc.align('center').bold(true).size(2, 2).line('*** OSHXONA KVITANSIYASI ***');
  enc.size(1, 1).bold(false);
  enc.line(cafeName || 'ORDERPLUS');
  enc.bold(true).size(2, 2).line(`STOL: ${data.tableNumber || 'Zal'}`);
  enc.size(1, 1).bold(false);
  enc.line(`Offitsiant: ${data.waiterName || 'Offitsiant'}`);
  enc.line(`Vaqt: ${new Date(data.timestamp || Date.now()).toLocaleTimeString('uz-UZ')}`);

  enc.divider(settings.paperWidth);
  enc.align('left').bold(true).line('BUYURTMA TARKIBI:').bold(false);
  enc.divider(settings.paperWidth);

  const items = data.items || [];
  for (const it of items) {
    const name = it.product?.name || it.name || 'Taom';
    const qty = it.quantity || 1;
    enc.bold(true).size(2, 2).line(`${qty}x ${name}`);
    enc.size(1, 1).bold(false);
    if (it.note) {
      enc.bold(true).line(`   >> IZOH: ${it.note}`).bold(false);
    }
  }

  enc.divider(settings.paperWidth);
  enc.feed(3);
  enc.cut();
  return enc.encode();
}

// Non-blocking browser print via iframe (doesn't freeze main UI)
function printViaBrowserNonBlocking(): Promise<void> {
  return new Promise((resolve) => {
    // React holatni shu tick da hali DOM ga yozmagan bo'lishi mumkin. Stol
    // yopilganda `setSelectedArchiveOrder` bilan chek shu zahoti chaqiriladi,
    // va nusxa o'sha paytda olinsa, qog'ozga eski (yoki bo'shatilgan) savat
    // tushadi. Ikki kadr kutish — React commit qilib bo'lgani kafolati.
    //
    // Taymer bilan poyga o'ynaladi, chunki requestAnimationFrame fonga
    // tushgan tabda umuman chaqirilmaydi: kassir boshqa oynaga o'tib ketsa,
    // chek chiqmay qolardi.
    const afterPaint = (fn: () => void) => {
      let fired = false;
      const once = () => {
        if (fired) return;
        fired = true;
        fn();
      };
      requestAnimationFrame(() => requestAnimationFrame(once));
      setTimeout(once, 300);
    };

    afterPaint(() => {
      const printArea = document.getElementById('thermal-print-area');
      if (!printArea) {
        window.print();
        resolve();
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:80mm;height:auto;border:none;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) { window.print(); resolve(); return; }

      // Copy all styles
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(s => doc.head.appendChild(s.cloneNode(true)));

      // Blokning O'ZI ko'chiriladi, ichidagisi emas. Chop etish uslubi
      //   body * { visibility: hidden }
      //   #thermal-print-area, #thermal-print-area * { visibility: visible }
      // degan juftlikka tayanadi. Ilgari bu yerda faqat innerHTML ko'chirilar,
      // ya'ni `#thermal-print-area` iframe ichida umuman bo'lmasdi — natijada
      // birinchi qoida hamma narsani yashirar, ikkinchisi hech nimaga
      // tushmasdi va printerdan oq qog'oz chiqardi.
      doc.body.appendChild(doc.importNode(printArea, true));
      doc.body.style.cssText = 'margin:0;padding:0;background:#fff;color:#000;';

      const cleanup = () => {
        try { document.body.removeChild(iframe); } catch {}
        resolve();
      };

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
      };

      iframe.contentWindow?.addEventListener('afterprint', finish);
      const fallbackTimer = setTimeout(finish, 20000);
      iframe.contentWindow?.addEventListener('afterprint', () => clearTimeout(fallbackTimer));

      // Logotip yuklanmasdan chop etilsa, chek boshida bo'sh joy yoki yarim
      // rasm qoladi. Sekin tarmoqda kassir kutib qolmasligi uchun cheklov bor.
      const images = Array.from(doc.querySelectorAll('img'));
      const pending = images
        .filter((img) => !img.complete)
        .map((img) => new Promise<void>((res) => {
          img.addEventListener('load', () => res(), { once: true });
          img.addEventListener('error', () => res(), { once: true });
        }));

      Promise.race([
        Promise.all(pending),
        new Promise((res) => setTimeout(res, 1500)),
      ]).then(() => {
        try { iframe.contentWindow?.print(); } catch { finish(); }
      });
    });
  });
}

// Print Queue — prevents concurrent print collisions
class PrintQueue {
  private static queue: Array<() => Promise<void>> = [];
  private static processing = false;

  static async enqueue(job: () => Promise<void>) {
    this.queue.push(job);
    if (!this.processing) this.processNext();
  }

  private static async processNext() {
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      try { await job(); } catch (e) { console.error('Print job failed:', e); }
      await new Promise(r => setTimeout(r, 300));
    }
    this.processing = false;
  }
}

export interface SystemPrinter {
  name: string;
  systemName: string;
  isDefault: boolean;
}

let lastPrintError: string | null = null;

/** Desktop ilovada tizimda o'rnatilgan printerlar ro'yxati. */
export async function listSystemPrinters(): Promise<SystemPrinter[]> {
  if (!IS_DESKTOP_APP) return [];
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const rows = await invoke<Array<{ name: string; system_name: string; is_default: boolean }>>('list_printers');
    return rows.map((r) => ({ name: r.name, systemName: r.system_name, isDefault: r.is_default }));
  } catch (e) {
    console.warn('Printerlar ro\'yxatini olib bo\'lmadi:', e);
    return [];
  }
}

/**
 * ESC/POS baytlarini tizim navbatiga xom holda yuboradi.
 *
 * Bu desktop ilovadagi asosiy yo'l. `window.print()` dan farqi — hech qanday
 * dialog ochilmaydi: kassir stolni yopadi, chek chiqadi, tamom.
 *
 * `false` qaytsa chaqiruvchi eski usulga (brauzer chop etishiga) tushadi.
 */
async function sendToSystemPrinter(bytes: Uint8Array, printerName?: string): Promise<boolean> {
  if (!IS_DESKTOP_APP) {
    lastPrintError = 'Desktop ilova emas';
    return false;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('print_raw', {
      printer: printerName && printerName.trim() ? printerName.trim() : null,
      data: Array.from(bytes),
    });
    lastPrintError = null;
    return true;
  } catch (e) {
    // Sabab saqlanadi: jimgina brauzer chop etishiga tushib ketish "nega
    // termal printerdan HTML sahifa chiqdi?" degan savolni javobsiz
    // qoldirardi. Endi kassir ekranda sababini ko'radi.
    lastPrintError = String((e as any)?.message || e);
    console.warn('Tizim printeriga yuborib bo\'lmadi:', e);
    return false;
  }
}

/** Oxirgi muvaffaqiyatsiz to'g'ridan-to'g'ri chop etishning sababi. */
export function getLastPrintError(): string | null {
  return lastPrintError;
}

/**
 * Desktopda tizim printerini birinchi bo'lib sinaydi.
 *
 * Foydalanuvchi ataylab Bluetooth yoki Serial tanlagan bo'lsa aralashmaymiz —
 * qolgan hollarda (ya'ni standart `browser` rejimida ham) desktop ilova
 * dialogsiz chop etishi kerak.
 */
async function tryDesktopPrint(settings: PrinterSettings, bytes: Uint8Array): Promise<boolean> {
  if (!IS_DESKTOP_APP) return false;
  if (settings.mode === 'bluetooth' || settings.mode === 'serial') return false;
  return sendToSystemPrinter(bytes, settings.systemPrinterName);
}

/**
 * Chekni to'g'ridan-to'g'ri printerga yuborishga urinadi.
 *
 * `false` qaytsa chaqiruvchi o'zining eski yo'liga (window.print) tushadi.
 * Qo'lda bosiladigan chop etish tugmalari shu orqali o'tadi: ilgari ular
 * ESC/POS yo'lini butunlay chetlab, brauzer chop etishini chaqirardi va
 * termal printerdan HTML sahifa bo'lib chiqardi.
 */
export async function printReceiptDirect(order: any, cafeName: string): Promise<boolean> {
  const settings = getPrinterSettings();
  const bytes = generateEscPosReceipt(order, cafeName, settings);
  if (await tryDesktopPrint(settings, bytes)) return true;
  if (settings.mode === 'bluetooth' || settings.mode === 'serial' || activeBluetoothCharacteristic || activeSerialPort) {
    try {
      return await sendRawToPrinter(bytes);
    } catch {
      return false;
    }
  }
  return false;
}

/** Oshxona kvitansiyasi uchun xuddi shunday. */
export async function printKitchenSlipDirect(data: any, cafeName: string): Promise<boolean> {
  const settings = getPrinterSettings();
  const bytes = generateEscPosKitchenSlip(data, cafeName, settings);
  if (await tryDesktopPrint(settings, bytes)) return true;
  if (settings.mode === 'bluetooth' || settings.mode === 'serial' || activeBluetoothCharacteristic || activeSerialPort) {
    try {
      return await sendRawToPrinter(bytes);
    } catch {
      return false;
    }
  }
  return false;
}

// Print Receipt Execution (Direct or Universal Browser Print)
export async function executePrintReceipt(order: any, cafeName: string) {
  PrintQueue.enqueue(async () => {
    const settings = getPrinterSettings();

    // Desktop: xom ESC/POS to'g'ridan-to'g'ri tizim navbatiga, dialogsiz.
    if (await tryDesktopPrint(settings, generateEscPosReceipt(order, cafeName, settings))) return;

    if (settings.mode === 'bluetooth' || settings.mode === 'serial' || activeBluetoothCharacteristic || activeSerialPort) {
      try {
        const bytes = generateEscPosReceipt(order, cafeName, settings);
        const ok = await sendRawToPrinter(bytes);
        if (ok) return;
      } catch (e) {
        console.warn("Direct thermal print failed, falling back:", e);
      }
    }

    // Browser iframe fallback (non-blocking)
    if (typeof window !== 'undefined') {
      await printViaBrowserNonBlocking();
    }
  });
}

// Print Kitchen Slip Execution
export async function executePrintKitchenSlip(data: any, cafeName: string) {
  PrintQueue.enqueue(async () => {
    const settings = getPrinterSettings();

    if (await tryDesktopPrint(settings, generateEscPosKitchenSlip(data, cafeName, settings))) return;

    if (settings.mode === 'bluetooth' || settings.mode === 'serial' || activeBluetoothCharacteristic || activeSerialPort) {
      try {
        const bytes = generateEscPosKitchenSlip(data, cafeName, settings);
        const ok = await sendRawToPrinter(bytes);
        if (ok) return;
      } catch (e) {
        console.warn("Direct kitchen slip print failed, falling back:", e);
      }
    }

    if (typeof window !== 'undefined') {
      await printViaBrowserNonBlocking();
    }
  });
}

// Print Test Receipt
export async function executePrintTest(cafeName: string) {
  const settings = getPrinterSettings();
  const testOrder = {
    id: 'test-123456',
    createdAt: new Date().toISOString(),
    tableNumber: 'Stol-1',
    waiterName: 'Test Kassir',
    items: [
      { name: "Osh (Palov)", quantity: 2, price: 35000, total: 70000, note: "Qo'shimcha sarimsoq" },
      { name: "Choy (Ko'k)", quantity: 1, price: 5000, total: 5000 },
      { name: "Non", quantity: 2, price: 4000, total: 8000 },
    ],
    serviceFee: 8300,
    total: 91300,
    paymentMethod: 'cash',
  };

  await executePrintReceipt(testOrder, cafeName);
}
