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
  /**
   * Hisob yopilganda mijoz cheki o'zi chop etiladimi.
   *
   * Oshxona kvitansiyasi uchun juftlik sozlama yo'q: u ataylab har doim
   * qo'lda chiqariladi — buyurtma tasdiqlangach modal ochiladi va qog'oz
   * faqat kassir chop etishni tanlasa ketadi.
   */
  autoPrintReceipt: boolean;
  headerText: string;
  footerText: string;
  openCashDrawer: boolean;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  mode: 'browser',
  systemPrinterName: '',
  paperWidth: '58mm',
  autoPrintReceipt: true,
  headerText: "Xush kelibsiz!",
  footerText: "Tashrifingiz uchun rahmat!",
  openCashDrawer: false,
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

/*
 * Termal printer UTF-8 tushunmaydi.
 *
 * U bir baytli kod sahifasi bilan ishlaydi va qaysi biri ekanini `ESC t n`
 * aytadi. Ilgari matn TextEncoder orqali UTF-8 bo'lib ketardi: lotin
 * harflari tasodifan to'g'ri chiqardi, kirill va o'zbekcha `oʻ`/`gʻ` esa
 * axlat bo'lardi. Ustiga-ustak ustunlar belgi soni bo'yicha tekislanardi,
 * printer esa baytlarni sanaydi — ko'p baytli matnda ustunlar siljirdi.
 *
 * Yechim: CP866 (ESC t 17) tanlanadi — kirillni qo'llab-quvvatlaydigan eng
 * keng tarqalgan sahifa — va matn shu sahifaga o'giriladi. Unda yo'q
 * belgilar (`ʻ`, tire, tirnoq) ASCII muqobiliga almashtiriladi.
 */
const CP866_CYRILLIC = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя';

/** Kod sahifasida yo'q, lekin matnda tez-tez uchraydigan belgilar. */
const ASCII_FALLBACKS: Record<string, string> = {
  '\u02BB': "'", '\u02BC': "'", '\u2018': "'", '\u2019': "'",
  '\u201C': '"', '\u201D': '"',
  '\u2013': '-', '\u2014': '-', '\u2212': '-',
  '\u00A0': ' ', '\u2026': '...',
};

function toCp866(str: string): number[] {
  const out: number[] = [];
  for (const ch of str.normalize('NFC')) {
    const mapped = ASCII_FALLBACKS[ch] ?? ch;
    for (const c of mapped) {
      const code = c.charCodeAt(0);
      if (code < 0x80) { out.push(code); continue; }
      const idx = CP866_CYRILLIC.indexOf(c);
      if (idx >= 0) {
        // CP866: А-п = 0x80-0xAF, р-я = 0xE0-0xEF
        out.push(idx < 48 ? 0x80 + idx : 0xE0 + (idx - 48));
        continue;
      }
      if (c === 'Ё') { out.push(0xF0); continue; }
      if (c === 'ё') { out.push(0xF1); continue; }
      out.push(0x3F); // '?'
    }
  }
  return out;
}

/** Chop etilgandagi haqiqiy ustun kengligi (belgi soni emas, bayt soni). */
function printedWidth(str: string): number {
  return toCp866(str).length;
}

class EscPosEncoder {
  private buffer: number[] = [];

  init() {
    this.buffer.push(ESC, 0x40); // Initialize printer
    this.buffer.push(ESC, 0x74, 17); // ESC t 17 -> CP866
    return this;
  }

  align(align: 'left' | 'center' | 'right') {
    const n = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, n);
    return this;
  }

  /**
   * Shriftni tanlaydi. Font B tor va past (58mm da 42 ustun, Font A da 32) —
   * to'rt ustunli jadval faqat shu shrift bilan tor qog'ozga sig'adi.
   */
  font(name: 'A' | 'B') {
    this.buffer.push(ESC, 0x4d, name === 'B' ? 1 : 0);
    return this;
  }

  /**
   * Satrlar orasidagi masofa (nuqtalarda).
   *
   * `null` — printerning standarti (`ESC 2`, taxminan 30 nuqta). Katta qiymat
   * chekni siyraklashtiradi: mayda emas, katta shriftda ham satrlar bir-biriga
   * yopishmaydi.
   */
  lineSpacing(dots: number | null) {
    if (dots === null) this.buffer.push(ESC, 0x32);
    else this.buffer.push(ESC, 0x33, Math.max(0, Math.min(255, Math.round(dots))));
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
    for (const b of toCp866(str)) this.buffer.push(b);
    return this;
  }

  line(str: string = '') {
    if (str) this.text(str);
    this.buffer.push(0x0A); // Line feed
    return this;
  }

  /**
   * `cols` — qog'oz kengligi emas, HOZIRGI shriftdagi ustunlar soni: Font B
   * ga o'tilganda bir xil qog'ozga ko'proq belgi sig'adi va chiziq qog'oz
   * o'rtasida uzilib qolmasligi kerak.
   */
  divider(cols: number) {
    this.align('center');
    this.line('-'.repeat(cols));
    this.align('left');
    return this;
  }

  /** Poster uslubidagi siyrak punktir — metadata blokini taomlardan ajratadi. */
  dashDivider(cols: number) {
    this.align('left');
    this.line('- '.repeat(Math.floor(cols / 2)).trimEnd());
    return this;
  }

  /**
   * Monoxrom rasterni GS v 0 bilan chop etadi.
   *
   * Eski `ESC *` rejimi emas: u rasmni satrma-satr yuboradi va ko'p
   * printerlarda satrlar orasida oq chiziq qoldiradi. GS v 0 butun blokni
   * bitta buyruq bilan oladi.
   */
  raster(img: { width: number; height: number; data: Uint8Array }) {
    const bytesPerRow = img.width / 8;
    this.buffer.push(GS, 0x76, 0x30, 0);
    this.buffer.push(bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff);
    this.buffer.push(img.height & 0xff, (img.height >> 8) & 0xff);
    for (const b of img.data) this.buffer.push(b);
    return this;
  }

  twoColumn(left: string, right: string, paperWidth: '58mm' | '80mm' = '58mm') {
    const totalCols = paperWidth === '80mm' ? 48 : 32;
    // Kenglik chop etiladigan baytlar bo'yicha o'lchanadi: `.length` UTF-16
    // birliklarini sanaydi va kirill matnda ustunlarni siljitib yuborardi.
    const spaceCount = Math.max(1, totalCols - printedWidth(left) - printedWidth(right));
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
/**
 * Buyurtma taomlarini har qanday ko'rinishdan massivga keltiradi.
 *
 * Server (va localStorage) `items` ni JSON matn sifatida saqlaydi. Ilgari bu
 * yerda `order.items || []` yozilgan edi: matn massiv emas, lekin u ham
 * iteratsiya qilinadi — chekka har bir harf uchun bittadan "Taom / 0 so'm"
 * qatori tushardi, haqiqiy taomlar esa umuman chiqmasdi.
 */
function normalizeItems(items: any): any[] {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Chekning yuqorisiga bosiladigan logotip.
 *
 * Rasm dekodlash asinxron, chek yig'ish esa sinxron (uchta chaqiruvchi ham
 * baytlarni darhol kutadi). Shuning uchun dekodlangan rasm shu yerda saqlanadi
 * va rasterga aylantirish chek yig'ilayotganda, qog'oz kengligiga qarab
 * bajariladi — canvas amallari rasm tayyor bo'lgach sinxron.
 */
let receiptLogo: HTMLImageElement | null = null;

/**
 * Chek logotipini oldindan yuklab qo'yadi. Kafe logotipi o'zgarganda
 * chaqiriladi; `src` bo'sh bo'lsa logotip olib tashlanadi.
 *
 * Xato hech qachon tashqariga chiqmaydi: logotipsiz chek — chek chiqmaganidan
 * ming marta yaxshi.
 */
export async function setReceiptLogo(src: string): Promise<void> {
  if (typeof document === 'undefined' || !src) {
    receiptLogo = null;
    return;
  }
  try {
    receiptLogo = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      // Uzoqdagi rasm CORS sarlavhasisiz kelsa canvas "tainted" bo'ladi va
      // getImageData xato beradi — o'shanda logotipsiz davom etamiz.
      if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('logotip yuklanmadi'));
      img.src = src;
    });
  } catch {
    receiptLogo = null;
  }
}

/**
 * Logotipni 1-bitli rasterga aylantiradi.
 *
 * Ditherlash ataylab qilinmagan: termal printerda logotip kabi qat'iy
 * shakllar ditherlanganda kulrang "shovqin" bo'lib chiqadi. Oddiy chegara
 * (threshold) qora belgini qora, oqni oq qoldiradi.
 */
function rasterizeLogo(img: HTMLImageElement, dotWidth: number): { width: number; height: number; data: Uint8Array } | null {
  if (typeof document === 'undefined') return null;
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) return null;

  // Kenglik 8 ga karrali bo'lishi shart: GS v 0 satrni to'liq baytlarda oladi.
  const width = Math.max(8, Math.floor(dotWidth / 8) * 8);
  let height = Math.round((naturalH / naturalW) * width);
  if (height < 1) return null;
  if (height > MAX_LOGO_DOTS) height = MAX_LOGO_DOTS;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Shaffof fon oq bo'lsin — aks holda alfa kanali qora bo'lib bosiladi.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const px = ctx.getImageData(0, 0, width, height).data;
    const bytesPerRow = width / 8;
    const data = new Uint8Array(bytesPerRow * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        if (lum < LOGO_THRESHOLD) {
          data[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    return { width, height, data };
  } catch {
    // Tainted canvas yoki xotira yetishmasligi — logotipsiz davom etamiz.
    return null;
  }
}

/** Logotip balandligi cheki: undan kattasi qog'ozni behuda yeydi. */
const MAX_LOGO_DOTS = 160;
/** Yorug'lik chegarasi: bundan qorasi bosiladi. */
const LOGO_THRESHOLD = 170;

/**
 * Matnni ustun kengligiga sig'diradi.
 *
 * Kenglik chop etiladigan baytlarda o'lchanadi (`printedWidth`), chunki
 * kirill harfi CP866 da bitta bayt, UTF-16 da esa `.length` uni ham bitta
 * deb sanaydi-yu, aralash matnda ustunlar siljib ketadi.
 */
function wrapText(str: string, cols: number): string[] {
  const words = String(str).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (let word of words) {
    // Ustundan uzun bitta so'z — bo'g'inlab bo'lmaydi, majburan kesamiz.
    while (printedWidth(word) > cols) {
      if (line) { lines.push(line); line = ''; }
      let cut = '';
      for (const ch of word) {
        if (printedWidth(cut + ch) > cols) break;
        cut += ch;
      }
      lines.push(cut);
      word = word.slice(cut.length);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (printedWidth(candidate) > cols) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Matnni ustun kengligiga o'ngga tekislaydi. */
function padStartTo(str: string, cols: number): string {
  const pad = cols - printedWidth(str);
  return pad > 0 ? ' '.repeat(pad) + str : str;
}

/** Matnni ustun kengligiga chapga tekislaydi. */
function padEndTo(str: string, cols: number): string {
  const pad = cols - printedWidth(str);
  return pad > 0 ? str + ' '.repeat(pad) : str;
}

/**
 * Qog'ozga sig'adigan ustunlar soni.
 *
 * Font A — 12 nuqta kenglikdagi harf, Font B — 9 nuqta. Ya'ni shriftni
 * almashtirish qog'ozni kengaytirish bilan barobar: 58mm da 32 o'rniga 42
 * ustun, va taom nomiga 12 emas 20 belgi qoladi.
 */
function columnsFor(paperWidth: '58mm' | '80mm', font: 'A' | 'B'): number {
  if (font === 'B') return paperWidth === '80mm' ? 64 : 42;
  return paperWidth === '80mm' ? 48 : 32;
}

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/**
 * Poster chekidagi kabi sana.
 *
 * Joy yetsa oy nomi bilan: "01 sentabr 2026 20:43" (21 belgi). Sig'masa
 * raqamli: "01.09.2026 20:43" (16). Qaror qog'ozdan emas, qiymat ustunining
 * kengligidan kelib chiqadi — Font B da tor qog'ozga ham uzun shakl sig'adi.
 */
function fmtReceiptDate(d: Date, long: boolean): string {
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (long) return `${day} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
  return `${day}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${hh}:${mm}`;
}

function fmtPrice(val: number): string {
  return Math.round(Number(val) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Chek maketi — Poster POS chekiga qarab qurilgan.
 *
 * Asosiy farq eski maketdan: metadata qiymatlari qog'oz chetiga emas, qat'iy
 * ustundan boshlanadi. O'ngga tekislanganda "Chek No" va "Ofitsiant"
 * qiymatlari har xil joydan boshlanib, ko'z ularni ustun sifatida o'qiy
 * olmasdi; qat'iy ustun esa yagona vertikal chiziq hosil qiladi.
 *
 * Ustunlar (chop etiladigan baytlarda):
 *   58mm = 32:  nom 12 | soni 4 | narx 8 | jami 8
 *   80mm = 48:  nom 22 | soni 5 | narx 10 | jami 11
 */
export function generateEscPosReceipt(order: any, cafeName: string, settings: PrinterSettings): Uint8Array {
  const enc = new EscPosEncoder();
  enc.init();

  if (settings.openCashDrawer) {
    enc.kickDrawer();
  }

  const is80 = settings.paperWidth === '80mm';
  // Butun chek Font A da: kassir uni qo'lida ushlab o'qiydi, shuning uchun
  // harf kattaligi ustunlar sonidan muhimroq. To'rt ustunli jadval 32 ta
  // belgiga sig'magani uchun taom ikki qatorga yoziladi (pastga qarang).
  const cols = columnsFor(settings.paperWidth, 'A');
  const labelCol = is80 ? 16 : 14;
  const totalCol = is80 ? 14 : 11;
  const longDate = cols - labelCol >= 22;

  /**
   * Bitta satr.
   *
   * Satr aynan `cols` belgiga to'ldiriladi va markazga tekislangan holda
   * yuboriladi: printer tekislashni HAQIQIY qog'oz kengligi bo'yicha
   * hisoblaydi, shuning uchun blok 58mm da ham, 80mm da ham qog'oz o'rtasida
   * turadi va chap chetga yopishib qolmaydi.
   */
  const row = (str: string = '') => enc.line(padEndTo(str, cols));

  /** "Nomi<bo'shliq>Qiymat" — qiymat har doim bitta ustundan boshlanadi. */
  const metaRow = (label: string, value: string) => {
    const valueLines = wrapText(value, cols - labelCol);
    row(padEndTo(label, labelCol) + valueLines[0]);
    for (const extra of valueLines.slice(1)) {
      row(' '.repeat(labelCol) + extra);
    }
  };

  /** "TO'LOVGA ......... 80 000 so'm" — nuqtali chiziq ikki chekkani bog'laydi. */
  const leaderRow = (left: string, right: string) => {
    const gap = cols - printedWidth(left) - printedWidth(right) - 2;
    row(`${left} ${'.'.repeat(Math.max(1, gap))} ${right}`);
  };

  // 1. Logotip va kafe nomi
  enc.align('center');
  if (receiptLogo) {
    const raster = rasterizeLogo(receiptLogo, is80 ? 288 : 192);
    if (raster) {
      enc.raster(raster).line();
    }
  }

  const headerName = cafeName || 'OrderPlus';
  enc.bold(true).size(1, 2).line(headerName).size(1, 1).bold(false);
  if (settings.headerText) {
    enc.line(settings.headerText);
  }

  // Satrlar orasi kengaytiriladi: standart 30 nuqta zich chiqadi, 42 esa
  // metadata va taomlar ro'yxatini "nafas oladigan" qiladi.
  enc.lineSpacing(42);
  enc.line();

  // 2. Metadata bloki
  const openedAt = new Date(order.createdAt || Date.now());
  const printedAt = new Date();

  const rawTable = String(order.tableNumber || '').trim();
  const cleanTable = rawTable.replace(/^stol\s*:?\s*/i, '');
  // Poster bitta raqam ko'rsatadi. Buyurtma raqami bo'lsa o'sha, bo'lmasa
  // id ning oxiri — qo'llab-quvvatlashda buyurtmani topish uchun yetarli.
  const checkNum = order.orderNumber
    ? String(order.orderNumber)
    : String(order.id || '').slice(-4).toUpperCase();

  metaRow('Chek No', checkNum);
  // Kassada olib ketish oqimi yo'q — har bir buyurtma stolga yoziladi.
  metaRow('Turi', 'Zalda');
  metaRow('Ofitsiant', order.waiterName || 'Admin');
  metaRow('Ochilgan', fmtReceiptDate(openedAt, longDate));
  metaRow('Chop etilgan', fmtReceiptDate(printedAt, longDate));
  if (cleanTable) {
    metaRow('Stol No', cleanTable);
  }

  row('- '.repeat(Math.floor(cols / 2)).trimEnd());

  // 3. Taomlar jadvali
  //
  // Nom va raqamlar bitta satrda emas: Font A da 58mm qog'ozga 32 belgi
  // sig'adi, raqamlar 20 tasini oladi va nomga 12 qoladi — "Bubble tea Taro"
  // shu yerda ikkiga bo'linardi. Endi nom butun bir satr, raqamlar esa
  // pastida "1 x 35 000 ....... 35 000" ko'rinishida.
  enc.bold(true);
  row(padEndTo('Nomi', cols - totalCol) + padStartTo('Jami', totalCol));
  enc.bold(false);

  const items = normalizeItems(order.items);
  for (const it of items) {
    const name = String(it.product?.name || it.name || 'Taom').trim();
    const qty = Number(it.quantity || 1);
    const price = Number(it.unitPrice || it.price || 0);
    const sum = Number(it.total || qty * price);

    for (const nameLine of wrapText(name, cols)) {
      row(nameLine);
    }
    const calc = `  ${qty} x ${fmtPrice(price)}`;
    row(padEndTo(calc, cols - totalCol) + padStartTo(fmtPrice(sum), totalCol));

    if (it.note) {
      for (const noteLine of wrapText(`* Izoh: ${it.note}`, cols - 2)) {
        row('  ' + noteLine);
      }
    }
  }

  row('-'.repeat(cols));

  // 4. Hisob-kitob
  const subtotal = items.reduce((acc: number, i: any) => acc + (i.quantity || 1) * (i.unitPrice || i.price || 0), 0);
  const serviceFee = Number.isFinite(Number(order.serviceFee)) ? Number(order.serviceFee) : 0;
  const discount = Number(order.discount) || 0;
  const total = Number.isFinite(Number(order.total)) ? Number(order.total) : subtotal + serviceFee - discount;
  const feePercent = subtotal > 0 ? Math.round((serviceFee / subtotal) * 100) : 0;

  // Chegirma yoki xizmat haqi bo'lmasa oraliq summa "Jami" ustunining
  // takroriga aylanadi — Poster ham uni bunday holatda ko'rsatmaydi.
  if (discount > 0 || serviceFee > 0) {
    metaRow('Oraliq summa', fmtPrice(subtotal));
    if (discount > 0) {
      metaRow('Chegirma', `-${fmtPrice(discount)}`);
    }
    if (serviceFee > 0) {
      metaRow(`Xizmat (${feePercent}%)`, fmtPrice(serviceFee));
    }
    row();
  }

  // Ikki barobar balandlik, lekin oddiy kenglik: harf kattaroq ko'rinadi-yu,
  // ustunlar soni o'zgarmaydi, ya'ni nuqtali chiziq joyida qoladi.
  enc.bold(true).size(1, 2);
  leaderRow("TO'LOVGA", `${fmtPrice(total)} so'm`);
  enc.size(1, 1).bold(false);

  const paidCash = Number(order.cashAmount) || 0;
  const paidCard = Number(order.cardAmount) || 0;
  if (paidCash > total && (order.paymentMethod === 'naqd' || order.paymentMethod === 'cash')) {
    metaRow("To'langan", fmtPrice(paidCash));
    metaRow('Qaytim', fmtPrice(paidCash - total));
  } else if (order.paymentMethod === 'aralash' && paidCash > 0 && paidCard > 0) {
    metaRow('Naqd', fmtPrice(paidCash));
    metaRow('Karta', fmtPrice(paidCard));
  }

  // 5. To'lov turi va pastki matn
  const paymentLabels: Record<string, string> = {
    naqd: 'NAQD',
    cash: 'NAQD',
    karta: 'KARTA',
    card: 'KARTA',
    aralash: 'ARALASH',
  };
  const payMethodStr = paymentLabels[String(order.paymentMethod)] || String(order.paymentMethod || 'NAQD').toUpperCase();
  metaRow("To'lov turi", payMethodStr);

  row('- '.repeat(Math.floor(cols / 2)).trimEnd());
  row();
  enc.line(settings.footerText || 'Xaridingiz uchun rahmat!');
  enc.line('OrderPlus POS tizimi');

  enc.lineSpacing(null);
  enc.feed(3);
  enc.cut();
  return enc.encode();
}

// Build ESC/POS Kitchen Slip
export function generateEscPosKitchenSlip(data: any, cafeName: string, settings: PrinterSettings): Uint8Array {
  const enc = new EscPosEncoder();
  enc.init();

  // Sarlavha
  enc.align('center').bold(true).line('*** OSHXONA BUYURTMASI ***').bold(false);
  if (cafeName) enc.align('center').line(cafeName);

  // Stol raqami
  enc.divider(columnsFor(settings.paperWidth, 'A'));
  const rawTable = String(data.tableNumber || 'Zal').trim();
  const cleanTable = rawTable.replace(/^stol\s*:?\s*/i, '');
  enc.align('center').bold(true).line(`STOL: ${cleanTable || 'Zal'}`).bold(false);
  enc.divider(columnsFor(settings.paperWidth, 'A'));

  // Meta ma'lumotlar
  const timeStr = data.time || (data.timestamp ? new Date(data.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
  if (data.waiterName) enc.twoColumn('Offitsiant:', data.waiterName, settings.paperWidth);
  enc.twoColumn('Vaqt:', timeStr, settings.paperWidth);

  enc.divider(columnsFor(settings.paperWidth, 'A'));
  enc.align('left').bold(true).line('BUYURTMA TARKIBI:').bold(false);
  enc.divider(columnsFor(settings.paperWidth, 'A'));

  const items = normalizeItems(data.items);
  for (const it of items) {
    const name = String(it.product?.name || it.name || 'Taom').trim();
    const qty = Number(it.quantity || 1);
    enc.bold(true).line(`${qty} x ${name}`).bold(false);
    if (it.note) {
      enc.line(`   >> IZOH: ${it.note}`);
    }
  }

  enc.divider(columnsFor(settings.paperWidth, 'A'));
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
