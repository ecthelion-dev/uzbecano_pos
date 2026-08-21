// ESC/POS Thermal Printer Driver for PWA (Web Bluetooth, Web Serial, and Universal Browser Print)

export interface PrinterSettings {
  mode: 'browser' | 'bluetooth' | 'serial';
  paperWidth: '58mm' | '80mm';
  autoPrintReceipt: boolean;
  autoPrintKitchen: boolean;
  headerText: string;
  footerText: string;
  openCashDrawer: boolean;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  mode: 'browser',
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
  const serviceFee = order.serviceFee || Math.round(subtotal * 0.1);
  const total = order.total || (subtotal + serviceFee);

  enc.twoColumn('Kichik jami:', `${subtotal.toLocaleString()} so'm`, settings.paperWidth);
  enc.twoColumn('Xizmat (10%):', `${serviceFee.toLocaleString()} so'm`, settings.paperWidth);
  enc.divider(settings.paperWidth);

  enc.align('center').bold(true).size(2, 2).line(`JAMI: ${total.toLocaleString()} SO'M`);
  enc.size(1, 1).bold(false);
  
  if (order.paymentMethod) {
    enc.line(`To'lov turi: ${order.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}`);
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
    doc.body.innerHTML = printArea.innerHTML;
    doc.body.style.cssText = 'margin:0;padding:0;background:#fff;color:#000;';

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch {}
      resolve();
    };

    iframe.contentWindow?.addEventListener('afterprint', cleanup);
    // Fallback timeout in case afterprint doesn't fire
    const fallbackTimer = setTimeout(cleanup, 8000);
    iframe.contentWindow?.addEventListener('afterprint', () => clearTimeout(fallbackTimer));

    setTimeout(() => {
      try { iframe.contentWindow?.print(); } catch { cleanup(); }
    }, 200);
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

// Print Receipt Execution (Direct or Universal Browser Print)
export async function executePrintReceipt(order: any, cafeName: string) {
  PrintQueue.enqueue(async () => {
    const settings = getPrinterSettings();

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
