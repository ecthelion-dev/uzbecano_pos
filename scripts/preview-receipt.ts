/**
 * Chek maketini terminalda ko'rsatadi — printerga qog'oz sarflamasdan.
 *
 * Ishga tushirish:
 *   npm run chek
 *
 * Chiziqlar orasidagi `|` — qog'ozning cheti. `<<KATTA` belgisi o'sha satr
 * ikki barobar balandlikda chiqishini bildiradi.
 */
import { installMemoryStorage } from '../src/lib/testStorage';

installMemoryStorage();
const { generateEscPosReceipt, DEFAULT_PRINTER_SETTINGS } = await import('../src/lib/printer');

/** ESC/POS baytlarini o'qiladigan matnga aylantiradi. */
function render(bytes: Uint8Array): string {
  let out = '';
  let big = false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x1b) {
      const cmd = bytes[i + 1];
      i += cmd === 0x40 || cmd === 0x32 ? 1 : cmd === 0x70 ? 4 : 2;
      continue;
    }
    if (b === 0x1d) {
      if (bytes[i + 1] === 0x21) big = (bytes[i + 2] & 0x0f) > 0;
      i += bytes[i + 1] === 0x56 ? 3 : 2;
      continue;
    }
    if (b === 0x0a) { out += (big ? '  <<KATTA' : '') + '\n'; continue; }
    out += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '?';
  }
  return '|' + out.replace(/\n+$/, '').split('\n').join('|\n|') + '|';
}

const order = {
  orderNumber: '3456',
  createdAt: '2026-09-01T18:30:00Z',
  tableNumber: '12',
  waiterName: 'Test Kassir',
  paymentMethod: 'naqd',
  serviceFee: 8300,
  total: 91300,
  items: [
    { name: 'Osh (Palov)', quantity: 2, price: 35000, total: 70000, note: "Qo'shimcha sarimsoq" },
    { name: "Choy (Ko'k)", quantity: 1, price: 5000, total: 5000 },
    { name: "Qo'sh go'shtli lavash katta", quantity: 2, price: 45000, total: 90000 },
  ],
};

for (const paperWidth of ['80mm', '58mm'] as const) {
  console.log(`\n===== ${paperWidth} =====`);
  console.log(render(generateEscPosReceipt(order, 'Uzbecano', { ...DEFAULT_PRINTER_SETTINGS, paperWidth })));
}
