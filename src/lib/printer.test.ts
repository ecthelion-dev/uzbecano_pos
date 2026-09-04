import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './testStorage';

installMemoryStorage();

const { generateEscPosReceipt, generateEscPosKitchenSlip, renderReceiptHtml, DEFAULT_PRINTER_SETTINGS } = await import('./printer');

/*
 * Chek endi tanlangan tilda quriladi va Node'ning `navigator.language` si
 * "en-US" — ya'ni til qo'yilmasa chek inglizcha chiqadi va quyidagi
 * o'zbekcha kutilmalar yiqiladi. Maket testlari tilni ataylab qadaydi;
 * tarjimaning o'zi pastdagi alohida blokda sinaladi.
 */
beforeEach(() => {
  installMemoryStorage();
  localStorage.setItem('orderplus_lang', 'uz');
});

/**
 * Chekni matn sifatida o'qiydi.
 *
 * ESC/POS chiqishi CP866 da, ya'ni kirill baytlari ASCII emas. Bizni
 * qiziqtirgan hamma narsa — raqamlar, foizlar, lotincha yorliqlar — ASCII
 * diapazonida qoladi, shuning uchun boshqa baytlarni tashlab yuborish
 * tekshirish uchun yetarli.
 */
function asAscii(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : b === 0x0a ? '\n' : ' ';
  }
  return out;
}

const settings = { ...DEFAULT_PRINTER_SETTINGS, openCashDrawer: false };

const order = {
  id: 'abc123def456',
  createdAt: '2026-08-31T10:00:00.000Z',
  tableNumber: '5',
  items: [
    { name: 'Osh', quantity: 2, price: 30000, total: 60000 },
    { name: 'Choy', quantity: 1, price: 5000, total: 5000 },
  ],
  serviceFee: 6500,
  discount: 0,
  total: 71500,
};

describe('kassa cheki (ESC/POS)', () => {
  it("jami summani buyurtmadan oladi, o'zi qayta hisoblamaydi", () => {
    const text = asAscii(generateEscPosReceipt(order, 'Test Kafe', settings));
    expect(text).toContain('71 500');
  });

  it("xizmat haqi foizini haqiqiy summadan hisoblaydi", () => {
    // 6500 / 65000 = 10%
    const text = asAscii(generateEscPosReceipt(order, 'Test Kafe', settings));
    expect(text).toContain('(10%)');
  });

  it("xizmat haqi nol bo'lgan kafeda uni umuman chiqarmaydi", () => {
    // Bu ilgari `|| 0.1` tufayli buzilgan edi: nol JavaScript'da yolg'on
    // hisoblanadi, ya'ni "haqi yo'q" kafe chekda 10% ko'rardi.
    const text = asAscii(
      generateEscPosReceipt({ ...order, serviceFee: 0, total: 65000 }, 'Test Kafe', settings)
    );
    expect(text).not.toContain('%');
    expect(text).toContain('65 000');
  });

  it('chegirma bo‘lganda uni manfiy qatorda ko‘rsatadi', () => {
    const text = asAscii(
      generateEscPosReceipt({ ...order, discount: 5000, total: 66500 }, 'Test Kafe', settings)
    );
    expect(text).toContain('-5 000');
    expect(text).toContain('66 500');
  });

  it('chegirma yo‘q bo‘lsa chegirma qatori chiqmaydi', () => {
    const text = asAscii(generateEscPosReceipt(order, 'Test Kafe', settings));
    expect(text).not.toContain('-0');
  });

  it("aralash to'lovda naqd va karta qismlari alohida ko'rinadi", () => {
    // Bularsiz kassir smena oxirida kassani solishtira olmaydi.
    const text = asAscii(
      generateEscPosReceipt(
        { ...order, paymentMethod: 'aralash', cashAmount: 50000, cardAmount: 21500 },
        'Test Kafe',
        settings
      )
    );
    expect(text).toContain('50 000');
    expect(text).toContain('21 500');
  });

  it("bitta to'lov turida qismlar qatori chiqmaydi", () => {
    const text = asAscii(
      generateEscPosReceipt(
        { ...order, paymentMethod: 'naqd', cashAmount: 71500, cardAmount: 0 },
        'Test Kafe',
        settings
      )
    );
    // Faqat YAKUNIY SUMMA da bir marta uchraydi, alohida "Naqd:" qatorida emas.
    expect(text.split('71 500').length - 1).toBe(1);
  });

  it("buyurtmada jami bo'lmasa uni qatorlardan chiqaradi", () => {
    const { total, ...totalsiz } = order;
    const text = asAscii(generateEscPosReceipt(totalsiz, 'Test Kafe', settings));
    // 65,000 + 6,500 = 71,500
    expect(text).toContain('71 500');
  });

  it("pul yashigi sozlamasi o'chirilgan bo'lsa ochish buyrug'i yuborilmaydi", () => {
    const withDrawer = generateEscPosReceipt(order, 'Test Kafe', { ...settings, openCashDrawer: true });
    const without = generateEscPosReceipt(order, 'Test Kafe', settings);
    expect(withDrawer.length).toBeGreaterThan(without.length);
  });

  it("chek ESC @ (init) bilan boshlanadi va kesish buyrug'i bilan tugaydi", () => {
    const bytes = generateEscPosReceipt(order, 'Test Kafe', settings);
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    // GS V — qog'ozni kesish.
    expect(Array.from(bytes.slice(-4))).toContain(0x1d);
  });
});

describe('taomlar JSON matn bo\'lganda', () => {
  it('matnni massivga o\'girib, taomlarni chekka chiqaradi', () => {
    const text = asAscii(generateEscPosReceipt(
      { ...order, items: JSON.stringify(order.items) },
      'Uzbecano',
      settings,
    ));

    expect(text).toContain('Osh');
    expect(text).toContain('30 000');
    expect(text).toContain('Choy');
    // Har bir harf uchun bittadan qator tushmasligi kerak.
    expect(text).not.toContain('Taom\n');
    // Ikkinchi taomning jamisi — ya'ni ro'yxat oxirigacha o'qilgan.
    expect(text).toContain('60 000');
  });

  it('buzuq JSON da chekni yiqitmaydi', () => {
    const text = asAscii(generateEscPosReceipt(
      { ...order, items: '{buzuq' },
      'Uzbecano',
      settings,
    ));

    expect(text).toContain("JAMI");
  });
});

/**
 * Poster POS chekiga qarab qurilgan maket.
 *
 * Bu yerda tekshiriladigan narsa — matn emas, USTUNLAR. Chek monoshrift
 * bilan bosiladi, ya'ni to'g'ri joyda turgan bo'shliq maketning o'zi;
 * bitta belgiga siljish butun jadvalni buzadi va buni faqat qog'ozda
 * ko'rish mumkin bo'lardi.
 */
describe('chek maketi', () => {
  const posterOrder = {
    orderNumber: 4970,
    createdAt: '2026-09-01T15:43:00.000Z',
    tableNumber: '2 (Asosiy zal)',
    waiterName: 'Ravshan',
    items: [
      { name: 'Limon choy choynak', quantity: 1, price: 30000, total: 30000 },
      { name: 'Mojito 0.7 l', quantity: 2, price: 25000, total: 50000 },
    ],
    total: 80000,
    paymentMethod: 'naqd',
  };

  /**
   * Maketni ko'rish uchun buyruq baytlari TASHLAB YUBORILADI, `asAscii` kabi
   * bo'shliqqa aylantirilmaydi: ESC a / GS ! qatorning oldiga soxta bo'shliq
   * qo'shsa, ustun tekshiruvlari qog'ozdagi haqiqiy holatni emas, o'sha
   * soxta siljishni o'lchagan bo'lardi.
   */
  const asLayout = (bytes: Uint8Array): string[] => {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0x1b) {
        const cmd = bytes[i + 1];
        i += cmd === 0x40 || cmd === 0x32 ? 1 : cmd === 0x70 ? 4 : 2;
        continue;
      }
      if (b === 0x1d) {
        i += bytes[i + 1] === 0x56 ? 3 : 2;
        continue;
      }
      out += b === 0x0a ? '\n' : b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '?';
    }
    return out.split('\n').map((l) => l.replace(/\s+$/, ''));
  };

  /**
   * Har bir satr uchun matn va o'sha satr IKKI BAROBAR balandlikda
   * bosilganmi. GS ! ning past yarim bayti — balandlik ko'paytirgichi.
   *
   * Kerak, chunki qog'ozdagi eng yomon nuqson maketda ko'rinmaydi: jadval
   * yirik bo'lsa, sarlavha qatori pastdagi taom qatoriga kirib ketadi.
   */
  const tallLines = (bytes: Uint8Array): { text: string; tall: boolean }[] => {
    const out: { text: string; tall: boolean }[] = [];
    let text = '';
    let tall = false;
    let height = 0;
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0x1b) {
        const cmd = bytes[i + 1];
        i += cmd === 0x40 || cmd === 0x32 ? 1 : cmd === 0x70 ? 4 : 2;
        continue;
      }
      if (b === 0x1d) {
        if (bytes[i + 1] === 0x21) height = bytes[i + 2] & 0x0f;
        i += bytes[i + 1] === 0x56 ? 3 : 2;
        continue;
      }
      if (b === 0x0a) {
        out.push({ text: text.replace(/\s+$/, ''), tall });
        text = '';
        tall = false;
        continue;
      }
      if (b >= 0x20 && b < 0x7f) {
        text += String.fromCharCode(b);
        if (height > 0) tall = true;
      }
    }
    return out;
  };

  const padTo = (str: string, cols: number) => str + ' '.repeat(Math.max(0, cols - str.length));
  const padStart = (str: string, cols: number) => ' '.repeat(Math.max(0, cols - str.length)) + str;

  const linesOf = (paperWidth: '58mm' | '80mm') =>
    asLayout(generateEscPosReceipt(posterOrder, 'Uzbecano', { ...settings, paperWidth }));

  /* Uzun nom ikki satrga bo'linadi, izoh ham o'z satrini oladi — chiziqchasiz
     qaysi raqam qaysi taomniki ekani qog'ozda bilinmaydi. */
  it('har bir taomdan keyin ajratuvchi qo\'yadi, oxirgisidan keyin esa yo\'q', () => {
    const cols = 48;
    const rule = '-'.repeat(cols);
    const lines = linesOf('80mm');

    const first = lines.findIndex((l) => l.startsWith('Limon choy'));
    const second = lines.findIndex((l) => l.startsWith('Mojito'));
    expect(first, 'birinchi taom yo\'q').toBeGreaterThan(-1);
    expect(second, 'ikkinchi taom yo\'q').toBeGreaterThan(first);

    // Ikki taom orasida aynan bitta chiziqcha.
    const between = lines.slice(first + 1, second).filter((l) => l === rule);
    expect(between).toHaveLength(1);

    // Oxirgi taomdan keyin jadvalni yopadigan bitta chiziqcha — ikkita emas.
    const after = lines.slice(second + 1);
    const closing = after.findIndex((l) => l === rule);
    expect(closing, 'jadvalni yopadigan chiziq yo\'q').toBeGreaterThan(-1);
    expect(after[closing + 1]).not.toBe(rule);
  });

  /* Sarlavha bilan taomlar bir xil o'lchamda, shuning uchun ular faqat
     bo'sh satr bilan ajraladi — usiz qog'ozda bitta blok bo'lib ko'rinadi. */
  it('jadval sarlavhasi bilan birinchi taom orasida bo\'sh satr qoldiradi', () => {
    for (const width of ['58mm', '80mm'] as const) {
      const lines = linesOf(width);
      const i = lines.findIndex((l) => l.startsWith('Nomi'));
      expect(i, `${width}: jadval sarlavhasi yo'q`).toBeGreaterThan(-1);
      expect(lines[i + 1], `${width}: sarlavhadan keyin bo'sh satr yo'q`).toBe('');
      expect(lines[i + 2], `${width}: taom qatori yo'q`).not.toBe('');
    }
  });

  /* Jadval bir vaqtlar ikki barobar balandlikda edi va qog'ozda sarlavha
     qatori taom qatoriga kirib ketardi. Yiriklik faqat kafe nomi va
     to'lanishi kerak summada qoladi — chekning qolgani bir o'lchamda. */
  it('taomlar jadvalini oddiy balandlikda bosadi, summani esa yirik', () => {
    const rows = tallLines(generateEscPosReceipt(posterOrder, 'Uzbecano', { ...settings, paperWidth: '80mm' }));

    const header = rows.find((r) => r.text.startsWith('Nomi'));
    const item = rows.find((r) => r.text.startsWith('Limon choy'));
    const jami = rows.find((r) => r.text.startsWith('JAMI'));

    expect(header, 'jadval sarlavhasi yo\'q').toBeDefined();
    expect(item, 'taom qatori yo\'q').toBeDefined();
    expect(jami, 'JAMI qatori yo\'q').toBeDefined();

    expect(header!.tall).toBe(false);
    expect(item!.tall).toBe(false);
    expect(jami!.tall).toBe(true);
  });

  /*
   * Kassa o'lchamni nomning ichiga yozadi ("Latte (Standart)"), QR menyu esa
   * nomni toza qoldirib, o'lchamni alohida maydonga soladi — narxni server
   * o'zi tekshiradi va nomga ishonmaydi. Ikkinchisi chekda ko'rinmasdi:
   * bir xil nomli, ikki xil narxdagi ikki qator.
   */
  it('QR buyurtmadagi o\'lchamni nomga qo\'shib bosadi', () => {
    const text = asLayout(generateEscPosReceipt({
      ...posterOrder,
      items: [
        { name: 'Bubble tea', selectedSize: { label: 'Katta' }, quantity: 1, price: 40000, total: 40000 },
        { name: 'Choy', quantity: 1, price: 5000, total: 5000 },
      ],
    }, 'Uzbecano', { ...settings, paperWidth: '80mm' })).join('\n');

    expect(text).toContain('Bubble tea (Katta)');
    // O'lchami yo'q taom o'zgarmaydi — bo'sh qavs qo'shilmaydi.
    expect(text).toContain('Choy');
    expect(text).not.toContain('Choy (');
  });

  it('kassa yo\'lida o\'lchamni ikki marta yozmaydi', () => {
    // Kassa nomni allaqachon "Latte (Standart)" qilib yuboradi.
    const text = asLayout(generateEscPosReceipt({
      ...posterOrder,
      items: [{ name: 'Latte (Standart)', selectedSize: { label: 'Standart' }, quantity: 1, price: 20000, total: 20000 }],
    }, 'Uzbecano', { ...settings, paperWidth: '80mm' })).join('\n');

    expect(text).toContain('Latte (Standart)');
    // Sanab tekshiriladi, matn qidirib emas: uzun nom satrga bo'linadi va
    // takrorlangan qism qog'ozda yonma-yon turmaydi — ya'ni "yonma-yon
    // yo'q" degan tekshiruv hech nimani isbotlamaydi.
    expect(text.match(/Standart/g) ?? []).toHaveLength(1);
  });

  it('serverning `notes` maydonidagi izohni ham bosadi', () => {
    // Kassa `note`, server `notes` deb saqlaydi. Bittasini o'qib ikkinchisini
    // unutish izohni jimgina yo'qotadi.
    const text = asLayout(generateEscPosReceipt({
      ...posterOrder,
      items: [{ name: 'Osh', notes: 'sarimsoqsiz', quantity: 1, price: 35000, total: 35000 }],
    }, 'Uzbecano', { ...settings, paperWidth: '80mm' })).join('\n');

    expect(text).toContain('sarimsoqsiz');
  });

  it('metadata qiymatlarini qat\'iy ustundan boshlaydi', () => {
    const lines = linesOf('58mm');
    const labelCol = 14;
    const rows = ['Chek No', 'Turi', 'Ofitsiant', 'Ochilgan', 'Stol No'];
    for (const label of rows) {
      const line = lines.find((l) => l.startsWith(label));
      expect(line, `"${label}" qatori yo'q`).toBeDefined();
      // Qiymat qat'iy ustundan boshlanadi: undan oldingi belgi bo'shliq,
      // o'sha ustundagi belgi esa allaqachon qiymat.
      expect(line![labelCol - 1]).toBe(' ');
      expect(line![labelCol]).not.toBe(' ');
    }
  });

  it('taom nomini butun satrga yozib, raqamlarni pastiga tekislaydi', () => {
    // Font A da 58mm qog'ozga 32 belgi sig'adi va raqamlar 20 tasini olardi —
    // nomga 12 belgi qolardi. Shuning uchun nom alohida satrda.
    const lines = linesOf('58mm');
    const nameAt = lines.indexOf('Limon choy choynak');
    expect(nameAt).toBeGreaterThan(-1);
    const calc = lines[nameAt + 1];
    expect(calc).toBe(padTo('  1 x 30 000', 32 - 11) + padStart('30 000', 11));
  });

  it('80mm da to\'rt ustunni bitta satrga joylaydi', () => {
    // 48 - (4 soni + 11 narxi + 13 jami) = 20 belgi nomga qoladi.
    const wide = linesOf('80mm');
    expect(wide.find((l) => l.startsWith('Nomi'))).toBe(
      padTo('Nomi', 20) + padStart('Soni', 4) + padStart('Narxi', 11) + padStart('Jami', 13),
    );
    const item = wide.find((l) => l.startsWith('Mojito'))!;
    expect(item.length).toBe(48);
    expect(item.endsWith('50 000')).toBe(true);
  });

  it('58mm da jadval sarlavhasini ikki ustunga qisqartiradi', () => {
    const header = linesOf('58mm').find((l) => l.startsWith('Nomi'))!;
    expect(header).toBe(padTo('Nomi', 32 - 11) + padStart('Jami', 11));
  });

  it('uzun nomni ikkinchi satrga ko\'chiradi', () => {
    const longName = { ...posterOrder, items: [{ name: 'Qo\'sh go\'shtli lavash katta ketmon', quantity: 1, price: 45000, total: 45000 }] };
    for (const [width, cols] of [['58mm', 32], ['80mm', 48]] as const) {
      const lines = asLayout(generateEscPosReceipt(longName, 'Uzbecano', { ...settings, paperWidth: width }));
      const first = lines.findIndex((l) => l.startsWith("Qo'sh"));
      expect(lines[first].length).toBeLessThanOrEqual(cols);
      // Nomning dumi pastda yolg'iz qoladi, raqamlar esa birinchi satrda.
      expect(lines.slice(first, first + 3).join('\n')).toContain('45 000');
      expect(lines.slice(first, first + 3).some((l) => l.trim().endsWith('ketmon'))).toBe(true);
    }
  });

  it('nomi qisqa taomni bo\'lmaydi', () => {
    for (const width of ['58mm', '80mm'] as const) {
      const lines = asLayout(generateEscPosReceipt(
        { ...posterOrder, items: [{ name: 'Iced Americano', quantity: 1, price: 20000, total: 20000 }] },
        'Uzbecano',
        { ...settings, paperWidth: width },
      ));
      expect(lines.some((l) => l.startsWith('Iced Americano'))).toBe(true);
    }
  });

  it("to'lov summasini nuqtali chiziq bilan chekkaga bog'laydi", () => {
    for (const width of ['58mm', '80mm'] as const) {
      const line = linesOf(width).find((l) => l.startsWith("JAMI"))!;
      expect(line.length).toBe(width === '80mm' ? 48 : 32);
      expect(line).toMatch(/JAMI \.+ 80 000 so'm$/);
    }
  });

  it('sanani ustun kengligiga qarab yozadi', () => {
    // 58mm da Font A qiymat ustuni 18 belgi — oy nomi sig'maydi, 80mm da 32.
    expect(linesOf('58mm').find((l) => l.startsWith('Ochilgan'))).toContain('01.09.2026');
    expect(linesOf('80mm').find((l) => l.startsWith('Ochilgan'))).toContain('01 sentabr 2026');
  });

  it('yirik satrlar uchun satr qadamini kengaytiradi', () => {
    // Font A harfi 24 nuqta, ikki barobar balandlikda 48 — qadam undan
    // kichik bo'lsa satrlar bir-biriga tegib ketadi.
    const bytes = generateEscPosReceipt(posterOrder, 'Uzbecano', settings);
    let spacing = 30; // printerning standarti
    let doubleHeight = false;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x1b && bytes[i + 1] === 0x33) { spacing = bytes[i + 2]; i += 2; continue; }
      if (bytes[i] === 0x1b && bytes[i + 1] === 0x32) { spacing = 30; i += 1; continue; }
      if (bytes[i] === 0x1d && bytes[i + 1] === 0x21) { doubleHeight = (bytes[i + 2] & 0x0f) > 0; i += 2; continue; }
      if (bytes[i] === 0x0a && doubleHeight) {
        expect(spacing, 'yirik satr uchun qadam yetarli emas').toBeGreaterThanOrEqual(48);
      }
    }
  });

  it('chek raqami sifatida serverning kunlik raqamini bosadi', () => {
    const lines = asLayout(generateEscPosReceipt(
      { ...posterOrder, orderNumber: undefined, dailyNumber: 14, id: 'aaaa-bbbb-cc53e6' },
      'Uzbecano',
      settings,
    ));
    expect(lines.find((l) => l.startsWith('Chek No'))).toMatch(/^Chek No {2,}14$/);
  });

  it('raqam yo\'q oflayn chekda id ning oxirini bosadi', () => {
    // Oflayn buyurtma raqamni serverga yetganda oladi. Raqamsiz chek bo'lishi
    // mumkin, noto'g'ri raqamli chek esa yo'q.
    const lines = asLayout(generateEscPosReceipt(
      { ...posterOrder, orderNumber: undefined, dailyNumber: null, id: 'aaaa-bbbb-cc53e6' },
      'Uzbecano',
      settings,
    ));
    expect(lines.find((l) => l.startsWith('Chek No'))).toMatch(/^Chek No {2,}53E6$/);
  });

  it('brauzer cheki termal chek bilan bir xil satrlardan yig\'iladi', () => {
    // Ikkalasi bitta maketdan chiqadi — ilgari brauzer cheki alohida React
    // komponentida yozilgan va ikkalasi bir-biridan uzoqlashib ketgan edi.
    const html = renderReceiptHtml(posterOrder, 'Uzbecano', settings);
    const text = html.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    for (const line of linesOf('80mm')) {
      if (!line.trim() || line.startsWith('JAMI')) continue;
      expect(text, `"${line.trim()}" satri HTML da yo'q`).toContain(line.trimEnd());
    }
    expect(text).toContain("JAMI");
    expect(text).toContain("80 000 so'm");
  });

  it('brauzer cheki sahifaning uslublariga tayanmaydi', () => {
    // Iframe ga ko'chirilgan tashqi uslub fayli print() dan keyin yuklanib,
    // qog'ozga uslubsiz matn tushirardi. Hujjat butunlay o'zicha bo'lsin.
    const html = renderReceiptHtml(posterOrder, 'Uzbecano', settings);
    expect(html).toContain('<style>');
    expect(html).not.toContain('<link');
    expect(html).toContain('monospace');
  });

  it('oraliq summani umuman ko\'rsatmaydi', () => {
    // Jadvaldagi raqamlar va pastdagi yakuniy summa yetarli — o'rtadagi
    // uchinchi raqam faqat chalg'itadi.
    const withFee = asAscii(generateEscPosReceipt(
      { ...posterOrder, serviceFee: 8000, total: 88000 }, 'Uzbecano', settings,
    ));
    expect(withFee).not.toContain('Oraliq summa');
    expect(withFee).toContain('Xizmat haqi (10%)');
  });

  it('ustundan uzun yorliqni qiymatga yopishtirmaydi', () => {
    // "Xizmat haqi (10%)" 17 belgi — yorliq ustuni 80mm da 16 ta. Ustun o'sha
    // satr uchun kengayadi, aks holda raqam yorliqqa tegib ketardi.
    const line = asLayout(generateEscPosReceipt(
      { ...posterOrder, serviceFee: 8000, total: 88000 },
      'Uzbecano',
      { ...settings, paperWidth: '80mm' },
    )).find((l) => l.startsWith('Xizmat haqi'))!;
    expect(line).toMatch(/^Xizmat haqi \(10%\) {2,}8 000$/);
  });
});

describe('oshxona kvitansiyasi', () => {
  const slip = {
    tableNumber: '7',
    waiterName: 'Ravshan',
    time: '10:49',
    items: [{ name: 'Osh', quantity: 2 }],
  };

  it('kunlik tartib raqamini yirik qilib bosadi', () => {
    const bytes = generateEscPosKitchenSlip({ ...slip, slipNumber: 7 }, 'Uzbecano', settings);
    const text = asAscii(bytes);
    expect(text).toContain('7');
    // GS ! 0x11 — eni ham, bo'yi ham ikki barobar.
    expect(Array.from(bytes).join(',')).toContain([0x1d, 0x21, 0x11].join(','));
  });

  /* Printer CP866 da ishlaydi va unda № belgisi bor, lekin qurilma
     haqiqatda qaysi jadvalni yuklaganini bilmaymiz: qog'ozga "? 3" bosilgan.
     Chekning qolgan hammasi ASCII, shuning uchun raqam ham ASCII bo'lsin. */
  it('tartib raqamini ASCII bilan yozadi, savol belgisi bilan emas', () => {
    const text = asAscii(generateEscPosKitchenSlip({ ...slip, slipNumber: 3 }, 'Uzbecano', settings));
    expect(text).toContain('No 3');
    expect(text).not.toContain('?');
  });

  /* Oshxonada chalkashish xato taom degani: izoh qaysi taomniki ekani
     chiziqchasiz bilinmaydi. Brauzer varianti (KitchenPrintArea) buni
     `last:border-b-0` bilan allaqachon qilardi — termal chek ham shunday. */
  it('o\'lcham va izohni oshxona kvitansiyasida ham bosadi', () => {
    // Oshxonada o'lchamsiz kvitansiya xato taom degani: oshpaz kattasini
    // kichigidan ajratmaydi.
    const text = asAscii(generateEscPosKitchenSlip({
      ...slip,
      items: [{ name: 'Bubble tea', selectedSize: { label: 'Katta' }, quantity: 2, notes: 'muzsiz' }],
    }, 'Uzbecano', settings));

    expect(text).toContain('Bubble tea (Katta)');
    expect(text).toContain('muzsiz');
  });

  it('taomlar orasiga ajratuvchi qo\'yadi, oxirgisidan keyin esa yo\'q', () => {
    const bytes = generateEscPosKitchenSlip(
      { ...slip, items: [{ name: 'Osh', quantity: 2, note: 'sarimsoqsiz' }, { name: 'Choy', quantity: 1 }] },
      'Uzbecano',
      settings,
    );
    const lines = asAscii(bytes).split('\n').map((l) => l.trim());
    // `asAscii` buyruq baytlarini bo'shliqqa aylantiradi, ya'ni chiziq
    // satrida ESC a dan qolgan harflar ham turadi — faqat chiziqni qidiramiz.
    const rule = (l: string) => /-{20,}/.test(l);

    const first = lines.findIndex((l) => l.includes('2 x Osh'));
    const second = lines.findIndex((l) => l.includes('1 x Choy'));
    expect(first, 'birinchi taom yo\'q').toBeGreaterThan(-1);
    expect(second, 'ikkinchi taom yo\'q').toBeGreaterThan(first);

    // Izoh birinchi taom bilan bitta blokda qoladi, ajratuvchi esa undan keyin.
    expect(lines.slice(first + 1, second).some((l) => l.includes('IZOH'))).toBe(true);
    expect(lines.slice(first + 1, second).filter(rule)).toHaveLength(1);

    // Oxirgi taomdan keyin ro'yxatni yopadigan bitta chiziq — ikkita emas.
    const after = lines.slice(second + 1);
    const closing = after.findIndex(rule);
    expect(closing, 'yopuvchi chiziq yo\'q').toBeGreaterThan(-1);
    expect(after[closing + 1] ?? '').not.toMatch(/-{20,}/);
  });

  /* Buzuq buyurtma butun oqimni to'xtatmasligi kerak: kvitansiya yig'ilishida
     otilgan xatoni kassada hech kim ushlamaydi, uya bo'shamay qoladi va
     KEYINGI QR buyurtmalar ham chop etilmaydi. */
  it('buzuq ma\'lumotdan ham kvitansiya yig\'adi, xato otmaydi', () => {
    const junk: any[] = [
      { ...slip, items: 'buzuq json' },
      { ...slip, items: null },
      { ...slip, items: [{ name: null, quantity: 'ikkita' }] },
      { ...slip, tableNumber: null, waiterName: undefined, items: [] },
      {},
    ];
    for (const data of junk) {
      expect(() => generateEscPosKitchenSlip(data, 'Uzbecano', settings)).not.toThrow();
    }
  });

  /*
   * Raqamni server beradi, kassa emas. Ilgari har bir kassa o'z hisobini
   * yuritardi: ikkinchi qurilma qo'shilganda bir kunda ikkita "No 7" paydo
   * bo'lardi va yangi kassada hisob birdan boshlanardi.
   */
  it('oflayn buyurtmada raqam o\'rniga id ning oxirini bosadi', () => {
    const text = asAscii(generateEscPosKitchenSlip(
      { ...slip, orderId: 'abc123def4f1a', slipNumber: 0 },
      'Uzbecano',
      settings,
    ));
    expect(text).toContain('F1A');
    expect(text).not.toContain('No 0');
  });

  it('raqam bo\'lsa id ning oxirini bosmaydi', () => {
    const text = asAscii(generateEscPosKitchenSlip(
      { ...slip, orderId: 'abc123def4f1a', slipNumber: 7 },
      'Uzbecano',
      settings,
    ));
    expect(text).toContain('No 7');
    expect(text).not.toContain('F1A');
  });

  it('raqam berilmasa kvitansiyani baribir chiqaradi', () => {
    const text = asAscii(generateEscPosKitchenSlip(slip, 'Uzbecano', settings));
    expect(text).toContain('OSHXONA BUYURTMASI');
    expect(text).not.toContain('N ');
  });
});

/**
 * Chek tili.
 *
 * Ilgari chek matni shu faylning ichida qotirilgan edi va "chek fizik
 * hujjat, ekran tili unga tegmasin" deb izohlangandi. Amalda esa kassir
 * ruscha ishlab, mijozga o'zbekcha qog'oz uzatardi. Endi chek tanlangan
 * tilda quriladi — va bu quyida tekshiriladi, chunki chek qulasa buni
 * hech kim ko'rmaydi: kassa ishlayveradi, faqat qog'oz noto'g'ri chiqadi.
 */
describe('chek tili', () => {
  /*
   * CP866 dan qaytarish. `asAscii` kirillni tashlab yuboradi — ruscha
   * chekda esa aynan o'sha baytlar tekshiriladi.
   */
  const CYR = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя';
  function fromCp866(bytes: Uint8Array): string {
    let out = '';
    for (const b of bytes) {
      if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
      else if (b >= 0x80 && b <= 0xaf) out += CYR[b - 0x80];
      else if (b >= 0xe0 && b <= 0xef) out += CYR[48 + (b - 0xe0)];
      else out += b === 0x0a ? '\n' : ' ';
    }
    return out;
  }

  const pick = (locale: 'uz' | 'ru' | 'en') =>
    fromCp866(generateEscPosReceipt(order, 'Test Kafe', settings, locale));

  it('inglizcha tanlanganda yorliqlar inglizcha', () => {
    const text = pick('en');
    expect(text).toContain('Check No');
    expect(text).toContain('Service fee (10%)');
    expect(text).toContain('TOTAL');
    expect(text).not.toContain('Chek No');
  });

  it('ruscha tanlanganda yorliqlar kirillda chiqadi', () => {
    const text = pick('ru');
    expect(text).toContain('Официант');
    expect(text).toContain('Обслуживание (10%)');
    expect(text).toContain('ИТОГО');
    expect(text).not.toContain('Chek No');
  });

  /*
   * Ustunlar bayt bo'yicha tekislanadi, kirill esa CP866 da bir baytli —
   * ya'ni ruscha chek ham tekis chiqishi kerak. Bu ilgari UTF-8 da buzilgan
   * joy: ikki baytli harf ustunni o'ngga surib yuborardi.
   *
   * Buyruq baytlari tashlanadi: ular qog'ozga chiqmaydi, lekin `fromCp866`
   * ularni bo'shliq qilib qo'yadi va satr uzunligini yolg'on ko'rsatadi.
   */
  function layoutLines(bytes: Uint8Array): string[] {
    const out: string[] = [];
    let text = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0x1b) {
        const cmd = bytes[i + 1];
        i += cmd === 0x40 || cmd === 0x32 ? 1 : cmd === 0x70 ? 4 : 2;
        continue;
      }
      if (b === 0x1d) {
        i += bytes[i + 1] === 0x56 ? 3 : 2;
        continue;
      }
      if (b === 0x0a) { out.push(text.replace(/\s+$/, '')); text = ''; continue; }
      text += fromCp866(new Uint8Array([b]));
    }
    if (text.trim()) out.push(text.replace(/\s+$/, ''));
    return out;
  }

  it('ruscha chekda ustunlar joyidan siljimaydi', () => {
    const ru = layoutLines(generateEscPosReceipt(order, 'Test Kafe', settings, 'ru'));

    // Jadval sarlavhasi ustunlarga to'liq to'ldiriladi — 48 belgi.
    const header = ru.find((l) => l.startsWith('Название'));
    expect(header, 'ruscha jadval sarlavhasi yo\'q').toBeDefined();
    expect(header!.length).toBe(48);

    // Bitta ham satr qog'ozdan oshib ketmasin.
    for (const line of ru) expect(line.length).toBeLessThanOrEqual(48);
  });

  it('oy nomi tilga ergashadi', () => {
    const withDate = { ...order, createdAt: '2026-09-01T08:00:00.000Z' };
    const ru = fromCp866(generateEscPosReceipt(withDate, 'Test Kafe', settings, 'ru'));
    const en = fromCp866(generateEscPosReceipt(withDate, 'Test Kafe', settings, 'en'));
    expect(ru).toContain('сентября 2026');
    expect(en).toContain('September 2026');
  });

  it('oshxona kvitansiyasi ham tarjima qilinadi', () => {
    const slip = { tableNumber: '7', waiterName: 'Ravshan', time: '10:49', items: [{ name: 'Osh', quantity: 2 }] };
    const ru = layoutLines(generateEscPosKitchenSlip(slip, 'Uzbecano', settings, 'ru')).join('\n');
    expect(ru).toContain('ЗАКАЗ НА КУХНЮ');
    expect(ru).toContain('СТОЛ:');
    expect(ru).toContain('СОСТАВ ЗАКАЗА:');
    expect(ru).not.toContain('OSHXONA');
  });

  it('til berilmasa diskdagi tanlov olinadi', () => {
    localStorage.setItem('orderplus_lang', 'ru');
    expect(fromCp866(generateEscPosReceipt(order, 'Test Kafe', settings))).toContain('ИТОГО');
  });

  it('brauzer cheki hujjat tilini ham belgilaydi', () => {
    expect(renderReceiptHtml(order, 'Test Kafe', settings, 'ru')).toContain('<html lang="ru"');
    expect(renderReceiptHtml(order, 'Test Kafe', settings, 'en')).toContain('<title>Receipt</title>');
  });

  /*
   * Sarlavha va pastki yozuv endi bo'sh kelib, lug'atdan to'ldiriladi. Diskda
   * esa eski standart o'zbekcha matn yotgan bo'lishi mumkin — sozlamalar
   * oynasida boshqa narsa o'zgartirilganda butun obyekt saqlangan. U hech kim
   * yozmagan matn, ya'ni tilni qotirib qo'ymasligi kerak.
   */
  it("hech kim yozmagan eski standart matn tilni qotirib qo'ymaydi", async () => {
    localStorage.setItem(
      'orderplus_printer_settings',
      JSON.stringify({ headerText: 'Xush kelibsiz!', footerText: 'Tashrifingiz uchun rahmat!' }),
    );
    const { getPrinterSettings } = await import('./printer');
    const live = getPrinterSettings();
    expect(live.headerText).toBe('');

    const text = fromCp866(generateEscPosReceipt(order, 'Test Kafe', live, 'ru'));
    expect(text).toContain('Добро пожаловать!');
    expect(text).not.toContain('Xush kelibsiz');
  });

  it('kafe o‘zi yozgan matn tarjima qilinmaydi', () => {
    const own = { ...settings, headerText: 'Chorsu filiali', footerText: 'Yana kuting!' };
    const text = fromCp866(generateEscPosReceipt(order, 'Test Kafe', own, 'ru'));
    expect(text).toContain('Chorsu filiali');
    expect(text).toContain('Yana kuting!');
  });
});
