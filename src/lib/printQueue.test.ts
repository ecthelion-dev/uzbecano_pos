import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  enqueuePrintJob, fetchPrintJobs, claimPrintJob, closePrintJob,
  isInFlight, resetPrintQueue,
} from './printQueue';

/**
 * Chop etish navbati mijoz tomoni.
 *
 * Eng qimmat xato — bitta topshiriqni ikki marta bosish: oshxona ikkita
 * bir xil qog'oz oladi va oshpaz taomni qaytadan qiladi. Server topshiriqni
 * yopilgach navbatdan chiqaradi, lekin yopish yetib borguncha keyingi so'rov
 * o'sha topshiriqni yana berishi mumkin.
 */

const headers = { Authorization: 'Bearer t' };

function mockFetch(impl: (url: string, init?: any) => any) {
  const spy = vi.fn(async (url: any, init?: any) => impl(String(url), init));
  (globalThis as any).fetch = spy;
  return spy;
}

const okRes = (body: any) => ({ ok: true, json: async () => body });

beforeEach(() => resetPrintQueue());
afterEach(() => { vi.restoreAllMocks(); });

describe('navbatga yozish', () => {
  it('buyurtma va hujjat turini yuboradi', async () => {
    const spy = mockFetch(() => okRes({ id: 'j1' }));
    expect(await enqueuePrintJob(headers, 'order_1', 'receipt')).toBe(true);
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body).toEqual({ orderId: 'order_1', kind: 'receipt' });
  });

  it('oshxona uchun tarkibni ham yuboradi', async () => {
    const spy = mockFetch(() => okRes({ id: 'j1' }));
    await enqueuePrintJob(headers, 'order_1', 'kitchen', { items: [{ name: 'Osh' }] });
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.payload.items).toEqual([{ name: 'Osh' }]);
  });

  it('buyurtma id si bo\'lmasa so\'rov ham yubormaydi', async () => {
    // Oflayn yaratilgan buyurtma serverda hali yo'q.
    const spy = mockFetch(() => okRes({}));
    expect(await enqueuePrintJob(headers, '', 'receipt')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('tarmoq yiqilsa xato otmaydi', async () => {
    mockFetch(() => { throw new Error('offline'); });
    expect(await enqueuePrintJob(headers, 'order_1', 'receipt')).toBe(false);
  });

  it('server rad etsa false qaytaradi', async () => {
    mockFetch(() => ({ ok: false, json: async () => ({}) }));
    expect(await enqueuePrintJob(headers, 'order_1', 'receipt')).toBe(false);
  });

  /*
   * Internet uzilganda chek chiqmay qolgan edi. Sabab ikkita bo'lgan va
   * ikkalasi ham shu yerda: navbatga yozish javobini kutish, va o'sha
   * kutishning cheksizligi.
   */
  it('brauzer "tarmoq yo\'q" desa so\'rov ham yubormaydi', async () => {
    // Tarmoqsiz `fetch` ba'zan darhol yiqilmaydi. Bilib turib kutish esa
    // kassirni printerdan uzoqlashtiradi: javob kelmaguncha chek chiqmaydi.
    vi.stubGlobal('navigator', { onLine: false });
    const spy = mockFetch(() => okRes({ id: 'j1' }));
    expect(await enqueuePrintJob(headers, 'order_1', 'receipt')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('so\'rov osilib qolsa kutib o\'tirmaydi', async () => {
    // Wi-Fi ulangan, lekin tashqariga chiqmaydi: `fetch` javob ham,
    // xato ham bermaydi. Chaqiruvchi shu yerda muzlab qolardi.
    vi.useFakeTimers();
    let aborted = false;
    mockFetch((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('aborted'));
      });
    }));

    const result = enqueuePrintJob(headers, 'order_1', 'receipt');
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toBe(false);
    expect(aborted).toBe(true);
    vi.useRealTimers();
  });
});

describe('navbatni o\'qish', () => {
  it('topshiriqlarni qaytaradi', async () => {
    mockFetch(() => okRes([{ id: 'j1', kind: 'receipt' }]));
    expect(await fetchPrintJobs(headers)).toHaveLength(1);
  });

  it('band qilingan topshiriqni qaytarmaydi', async () => {
    // Aks holda 5 soniyalik keyingi so'rov o'sha chekni yana bosardi.
    mockFetch(() => okRes([{ id: 'j1' }, { id: 'j2' }]));
    claimPrintJob('j1');
    const jobs = await fetchPrintJobs(headers);
    expect(jobs.map((j) => j.id)).toEqual(['j2']);
  });

  it('tarmoq yiqilsa bo\'sh ro\'yxat', async () => {
    mockFetch(() => { throw new Error('offline'); });
    expect(await fetchPrintJobs(headers)).toEqual([]);
  });

  it('javob ro\'yxat bo\'lmasa bo\'sh ro\'yxat', async () => {
    mockFetch(() => okRes({ error: 'nimadir' }));
    expect(await fetchPrintJobs(headers)).toEqual([]);
  });
});

describe('band qilish', () => {
  it('bitta topshiriqni ikki marta band qilib bo\'lmaydi', () => {
    expect(claimPrintJob('j1')).toBe(true);
    expect(claimPrintJob('j1')).toBe(false);
    expect(isInFlight('j1')).toBe(true);
  });

  it('yopilgandan keyin band bo\'lmay qoladi', async () => {
    mockFetch(() => okRes({ ok: true }));
    claimPrintJob('j1');
    await closePrintJob(headers, 'j1', true);
    expect(isInFlight('j1')).toBe(false);
  });

  it('yopish so\'rovi yiqilsa ham bandlik olinadi', async () => {
    // Aks holda kassa qayta ishga tushmaguncha o'sha topshiriq abadiy band
    // qolib, keyingilari ham to'xtab qolardi.
    mockFetch(() => { throw new Error('offline'); });
    claimPrintJob('j1');
    await closePrintJob(headers, 'j1', true);
    expect(isInFlight('j1')).toBe(false);
  });

  it('yiqilgan chop etishning sababini yuboradi', async () => {
    const spy = mockFetch(() => okRes({ ok: true }));
    await closePrintJob(headers, 'j1', false, "Qog'oz tugagan");
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body).toEqual({ id: 'j1', ok: false, error: "Qog'oz tugagan" });
  });
});
